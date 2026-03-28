from fastapi import APIRouter, Query, HTTPException
from services.suburb_data import get_suburb_stats, get_nearby_suburbs
from services.scoring import score_alternative_suburb
from models.response import AlternativeSuburb

router = APIRouter()


@router.get("/alternatives", response_model=list[AlternativeSuburb])
async def get_alternatives(
    suburb: str = Query(..., description="Current suburb name"),
    state: str = Query(..., description="State abbreviation, e.g. QLD"),
    budget: float = Query(..., gt=0, description="Maximum purchase budget in AUD"),
    bedrooms: int = Query(default=3, ge=0, description="Desired minimum bedrooms"),
) -> list[AlternativeSuburb]:
    """
    Return up to 3 alternative suburb recommendations based on:
    - Proximity to the requested suburb
    - Investment quality score
    - Budget fit (median price within 120% of budget)

    Query params:
        suburb:   Current suburb (used to look up coordinates)
        state:    State abbreviation
        budget:   Maximum purchase budget
        bedrooms: Desired bedrooms (used to select house vs unit median)

    Returns:
        List of AlternativeSuburb
    """
    stats = get_suburb_stats(suburb, state)
    if stats is None:
        raise HTTPException(
            status_code=404,
            detail=f"Suburb '{suburb}, {state}' not found in our dataset.",
        )

    lat = stats["lat"]
    lng = stats["lng"]
    property_type = "house" if bedrooms >= 3 else "unit"

    nearby = get_nearby_suburbs(lat, lng, max_distance_km=30)

    candidates = []
    for s in nearby:
        # Skip the suburb itself
        if s.get("suburb", "").lower() == suburb.lower() and s.get("state", "").upper() == state.upper():
            continue

        median_price = (
            s.get("median_house_price", 0)
            if property_type == "house"
            else s.get("median_unit_price", 0)
        )
        if median_price == 0 or median_price > budget * 1.20:
            continue

        composite_score = score_alternative_suburb(s, median_price, property_type)
        candidates.append((composite_score, s))

    # Sort by score descending, take top 3
    candidates.sort(key=lambda x: x[0], reverse=True)
    top3 = candidates[:3]

    results: list[AlternativeSuburb] = []
    for score, s in top3:
        is_house = property_type == "house"
        median_price = (
            s.get("median_house_price", 0) if is_house else s.get("median_unit_price", 0)
        )
        weekly_rent = (
            s.get("weekly_rent_median_house", 0) if is_house else s.get("weekly_rent_median_unit", 0)
        )
        gross_yield = (weekly_rent * 52) / median_price if median_price > 0 else 0

        # Rationale sentence
        growth = s.get("ten_year_growth_pct", 0)
        vacancy = s.get("vacancy_rate_pct", 0)
        rationale = (
            f"{s.get('suburb')} offers a {growth:.1f}% 10-year growth record, "
            f"{vacancy:.1f}% vacancy rate, and a more accessible median price of "
            f"${median_price:,.0f} — "
            f"{'within' if median_price <= budget else 'slightly above'} your budget."
        )

        results.append(
            AlternativeSuburb(
                suburb=s["suburb"],
                state=s["state"],
                postcode=s["postcode"],
                rationale=rationale,
                median_price=median_price,
                ten_year_growth=growth,
                gross_yield=round(gross_yield * 100, 2),
                distance_km=s["distance_km"],
                score_delta=round(score - score_alternative_suburb(stats, median_price, property_type), 1),
            )
        )

    return results
