import asyncio
from fastapi import APIRouter, HTTPException
from models.request import AssessmentRequest
from models.response import AssessmentResponse, AlternativeSuburb, NearbyPOI
from services import google_maps, suburb_data, scoring
from config import settings

router = APIRouter()


@router.post("/assess", response_model=AssessmentResponse)
async def assess_property(request: AssessmentRequest) -> AssessmentResponse:
    """
    Full property assessment pipeline:

    1. Geocode address → lat/lng/suburb/state/postcode
    2. Lookup suburb statistics
    3. Fetch nearby POIs (schools, transport, parks) in parallel
    4. Score all 5 pillars
    5. Calculate weighted score and band
    6. Generate flags and buyers-agent summary
    7. Identify top 3 alternative suburbs
    8. Return complete AssessmentResponse
    """
    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=503, detail="Google Maps API key is not configured.")

    # ------------------------------------------------------------------
    # Step 1: Geocode
    # ------------------------------------------------------------------
    try:
        geo = await google_maps.geocode_address(request.address, settings.GOOGLE_MAPS_API_KEY)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Geocoding failed: {exc}") from exc

    lat: float = geo["lat"]
    lng: float = geo["lng"]
    suburb: str = geo["suburb"]
    state: str = geo["state"]
    postcode: str = geo["postcode"]

    # ------------------------------------------------------------------
    # Step 2: Suburb stats
    # ------------------------------------------------------------------
    stats = suburb_data.get_suburb_stats(suburb, state)

    # ------------------------------------------------------------------
    # Step 3: Nearby POIs (parallel)
    # ------------------------------------------------------------------
    schools_task = google_maps.search_nearby(lat, lng, "school", 2000, settings.GOOGLE_MAPS_API_KEY)
    transport_task = google_maps.search_nearby(lat, lng, "transit_station", 1500, settings.GOOGLE_MAPS_API_KEY)
    parks_task = google_maps.search_nearby(lat, lng, "park", 1000, settings.GOOGLE_MAPS_API_KEY)

    schools_raw, transport_raw, parks_raw = await asyncio.gather(
        schools_task, transport_task, parks_task, return_exceptions=False
    )

    nearby_pois_raw: dict[str, list[dict]] = {
        "schools": schools_raw,
        "transport": transport_raw,
        "parks": parks_raw,
    }

    # ------------------------------------------------------------------
    # Step 4: Score pillars
    # ------------------------------------------------------------------
    location_pillar = scoring.score_location(nearby_pois_raw, lat, lng, stats)

    affordability_pillar, monthly_repayment, borrowing_capacity = scoring.score_affordability(
        price=request.price,
        annual_income=request.annual_income,
        monthly_costs=request.monthly_costs,
        mortgage_rate=settings.MORTGAGE_RATE,
    )

    features_pillar = scoring.score_features(
        bedrooms=request.bedrooms,
        bathrooms=request.bathrooms,
        parking=request.parking,
        land_size_sqm=request.land_size_sqm,
        year_built=request.year_built,
        property_type=request.property_type,
    )

    suburb_quality_pillar = scoring.score_suburb_quality(stats)

    investment_pillar = scoring.score_investment(
        price=request.price,
        suburb_stats=stats,
        property_type=request.property_type,
        land_size_sqm=request.land_size_sqm,
    )

    pillars = {
        "location": location_pillar,
        "affordability": affordability_pillar,
        "features": features_pillar,
        "suburb_quality": suburb_quality_pillar,
        "investment": investment_pillar,
    }

    # ------------------------------------------------------------------
    # Step 5: Final score and band
    # ------------------------------------------------------------------
    overall_score, band = scoring.calculate_final_score(pillars)

    # ------------------------------------------------------------------
    # Step 6: Flags and summary
    # ------------------------------------------------------------------
    monthly_income = request.annual_income / 12
    disposable = monthly_income - request.monthly_costs
    repayment_ratio = monthly_repayment / disposable if disposable > 0 else 999.0
    borrowing_ratio = request.price / borrowing_capacity

    red_flags = scoring.generate_red_flags(pillars, repayment_ratio, borrowing_ratio, stats)
    green_flags = scoring.generate_green_flags(pillars, nearby_pois_raw, stats)
    summary = scoring.generate_buyers_agent_summary(
        overall_score, band, pillars, suburb, request.price
    )

    # ------------------------------------------------------------------
    # Step 7: Alternative suburbs
    # ------------------------------------------------------------------
    property_type = request.property_type
    nearby_suburbs = suburb_data.get_nearby_suburbs(lat, lng, max_distance_km=30)

    alt_candidates: list[tuple[float, dict]] = []
    for s in nearby_suburbs:
        # Skip the same suburb
        if s.get("suburb", "").lower() == suburb.lower() and s.get("state", "").upper() == state.upper():
            continue

        is_house = property_type.lower() in ("house", "townhouse")
        median_price = (
            s.get("median_house_price", 0) if is_house else s.get("median_unit_price", 0)
        )
        if median_price == 0:
            continue

        composite = scoring.score_alternative_suburb(s, median_price, property_type)
        alt_candidates.append((composite, s))

    alt_candidates.sort(key=lambda x: x[0], reverse=True)

    # Build current suburb's reference score for delta
    current_alt_score = scoring.score_alternative_suburb(stats, request.price, property_type) if stats else 50.0

    alternatives: list[AlternativeSuburb] = []
    for alt_score, s in alt_candidates[:3]:
        is_house = property_type.lower() in ("house", "townhouse")
        median_price = (
            s.get("median_house_price", 0) if is_house else s.get("median_unit_price", 0)
        )
        weekly_rent = (
            s.get("weekly_rent_median_house", 0) if is_house else s.get("weekly_rent_median_unit", 0)
        )
        gross_yield = (weekly_rent * 52) / median_price if median_price > 0 else 0
        growth = s.get("ten_year_growth_pct", 0)
        vacancy = s.get("vacancy_rate_pct", 0)

        rationale = (
            f"{s.get('suburb')} offers {growth:.1f}% 10-year capital growth, "
            f"a {vacancy:.1f}% vacancy rate, and a median price of ${median_price:,.0f} "
            f"— making it a compelling alternative within {s['distance_km']:.1f}km."
        )

        alternatives.append(
            AlternativeSuburb(
                suburb=s["suburb"],
                state=s["state"],
                postcode=s["postcode"],
                rationale=rationale,
                median_price=float(median_price),
                ten_year_growth=float(growth),
                gross_yield=round(gross_yield * 100, 2),
                distance_km=s["distance_km"],
                score_delta=round(alt_score - current_alt_score, 1),
            )
        )

    # ------------------------------------------------------------------
    # Step 8: Build nearby POI response objects
    # ------------------------------------------------------------------
    def _to_poi_list(raw: list[dict], poi_type: str) -> list[NearbyPOI]:
        return [
            NearbyPOI(name=p["name"], distance_m=p["distance_m"], type=poi_type)
            for p in raw[:5]  # cap at 5 per category
        ]

    nearby_pois_response = {
        "schools": _to_poi_list(schools_raw, "school"),
        "transport": _to_poi_list(transport_raw, "transit_station"),
        "parks": _to_poi_list(parks_raw, "park"),
    }

    return AssessmentResponse(
        overall_score=overall_score,
        band=band,
        lat=lat,
        lng=lng,
        suburb=suburb,
        state=state,
        postcode=postcode,
        pillars=pillars,
        nearby_pois=nearby_pois_response,
        buyers_agent_summary=summary,
        red_flags=red_flags,
        green_flags=green_flags,
        alternatives=alternatives,
        monthly_repayment=monthly_repayment,
        borrowing_capacity=borrowing_capacity,
    )
