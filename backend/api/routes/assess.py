import asyncio
from fastapi import APIRouter, HTTPException
from models.request import AssessmentRequest
from models.response import (
    AssessmentResponse, AlternativeSuburb, NearbyPOI,
    WalkabilityData, RiskProfile, DomainMarketData,
    AIAnalysis, AIFlag, AIDimensionScore, AIDimensionScores,
)
from services import google_maps, suburb_data, scoring, overpass, domain_api, risk_data
from services import ai_analysis
from config import settings

router = APIRouter()


async def _noop() -> None:
    return None


def _parse_ai_dimension(raw: dict, key: str) -> Optional[AIDimensionScore]:
    val = raw.get(key)
    if val and isinstance(val, dict) and "score" in val:
        return AIDimensionScore(score=val["score"], rationale=val.get("rationale", ""))
    return None


from typing import Optional


@router.post("/assess", response_model=AssessmentResponse)
async def assess_property(request: AssessmentRequest) -> AssessmentResponse:
    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=503, detail="Google Maps API key is not configured.")

    # Step 1: Geocode
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

    # Step 2: Suburb stats
    stats = suburb_data.get_suburb_stats(suburb, state)

    # Step 3: Nearby POIs (parallel)
    schools_raw, transport_raw, parks_raw = await asyncio.gather(
        google_maps.search_nearby(lat, lng, "school", 2000, settings.GOOGLE_MAPS_API_KEY),
        google_maps.search_nearby(lat, lng, "transit_station", 1500, settings.GOOGLE_MAPS_API_KEY),
        google_maps.search_nearby(lat, lng, "park", 1000, settings.GOOGLE_MAPS_API_KEY),
        return_exceptions=False,
    )

    nearby_pois_raw = {"schools": schools_raw, "transport": transport_raw, "parks": parks_raw}

    # Step 3b: Additional data sources (parallel)
    domain_perf_task = (
        domain_api.get_suburb_performance(
            suburb, state, postcode,
            "house" if request.property_type.lower() in ("house", "townhouse") else "unit",
            settings.DOMAIN_API_KEY,
        )
        if settings.DOMAIN_API_KEY
        else _noop()
    )

    walkability_raw, risk_raw, domain_perf_raw = await asyncio.gather(
        overpass.get_walkability_data(lat, lng),
        risk_data.get_risk_profile(lat, lng, state),
        domain_perf_task,
        return_exceptions=False,
    )

    domain_median_price: float | None = None
    if domain_perf_raw:
        entries = domain_perf_raw.get("entriesResults", [])
        if entries:
            domain_median_price = entries[0].get("values", {}).get("median")

    # Step 4: Score pillars
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

    walkability_pillar = scoring.score_walkability(walkability_raw)
    risk_pillar = scoring.score_risk(risk_raw)

    value_pillar = scoring.score_value_for_money(
        price=request.price,
        suburb_stats=stats,
        property_type=request.property_type,
        bedrooms=request.bedrooms,
        land_size_sqm=request.land_size_sqm,
        domain_median=domain_median_price,
    )

    pillars = {
        "location": location_pillar,
        "affordability": affordability_pillar,
        "value": value_pillar,
        "features": features_pillar,
        "suburb_quality": suburb_quality_pillar,
        "investment": investment_pillar,
        "walkability": walkability_pillar,
        "risk": risk_pillar,
    }

    # Step 5: Final score and band
    overall_score, band = scoring.calculate_final_score(pillars)

    # Step 6: Flags and summary
    monthly_income = request.annual_income / 12
    disposable = monthly_income - request.monthly_costs
    repayment_ratio = monthly_repayment / disposable if disposable > 0 else 999.0
    borrowing_ratio = request.price / borrowing_capacity
    walkability_score = walkability_pillar.score

    red_flags = scoring.generate_red_flags(pillars, repayment_ratio, borrowing_ratio, stats, walkability_score, risk_raw)
    green_flags = scoring.generate_green_flags(pillars, nearby_pois_raw, stats, walkability_score, risk_raw)
    summary = scoring.generate_buyers_agent_summary(overall_score, band, pillars, suburb, request.price)

    # Domain market data
    domain_market: DomainMarketData | None = None
    if domain_perf_raw:
        entries = domain_perf_raw.get("entriesResults", [])
        if entries:
            latest = entries[0].get("values", {})
            domain_market = DomainMarketData(
                median_sale_price=domain_median_price,
                days_on_market=latest.get("daysOnMarket"),
                number_sold=latest.get("numberSold"),
                auction_clearance_rate=latest.get("auctionClearanceRate"),
                data_available=True,
            )

    # Step 7: Alternative suburbs
    property_type = request.property_type
    nearby_suburbs = suburb_data.get_nearby_suburbs(lat, lng, max_distance_km=30)

    alt_candidates: list[tuple[float, dict]] = []
    for s in nearby_suburbs:
        if s.get("suburb", "").lower() == suburb.lower() and s.get("state", "").upper() == state.upper():
            continue
        is_house = property_type.lower() in ("house", "townhouse")
        median_price = s.get("median_house_price", 0) if is_house else s.get("median_unit_price", 0)
        if median_price == 0:
            continue
        composite = scoring.score_alternative_suburb(s, median_price, property_type)
        alt_candidates.append((composite, s))

    alt_candidates.sort(key=lambda x: x[0], reverse=True)
    current_alt_score = scoring.score_alternative_suburb(stats, request.price, property_type) if stats else 50.0

    alternatives: list[AlternativeSuburb] = []
    for alt_score, s in alt_candidates[:3]:
        is_house = property_type.lower() in ("house", "townhouse")
        median_price = s.get("median_house_price", 0) if is_house else s.get("median_unit_price", 0)
        weekly_rent = s.get("weekly_rent_median_house", 0) if is_house else s.get("weekly_rent_median_unit", 0)
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
                suburb=s["suburb"], state=s["state"], postcode=s["postcode"],
                rationale=rationale, median_price=float(median_price),
                ten_year_growth=float(growth), gross_yield=round(gross_yield * 100, 2),
                distance_km=s["distance_km"], score_delta=round(alt_score - current_alt_score, 1),
            )
        )

    # Step 8: Build nearby POI response
    def _to_poi_list(raw: list[dict], poi_type: str) -> list[NearbyPOI]:
        return [NearbyPOI(name=p["name"], distance_m=p["distance_m"], type=poi_type) for p in raw[:5]]

    nearby_pois_response = {
        "schools": _to_poi_list(schools_raw, "school"),
        "transport": _to_poi_list(transport_raw, "transit_station"),
        "parks": _to_poi_list(parks_raw, "park"),
    }

    walkability_response = (
        WalkabilityData(
            counts=walkability_raw.get("counts", {}),
            total=walkability_raw.get("total", 0),
            radius_m=walkability_raw.get("radius_m", 1500),
        )
        if walkability_raw else None
    )
    risk_response = RiskProfile(**{k: v for k, v in risk_raw.items() if k != "state"}) if risk_raw else None

    # Step 9: AI Analysis
    ai_result: AIAnalysis = AIAnalysis(available=False)
    if settings.ANTHROPIC_API_KEY:
        try:
            raw_ai = await ai_analysis.analyse_property(
                property_data={
                    "address": request.address,
                    "suburb": suburb,
                    "state": state,
                    "postcode": postcode,
                    "lat": lat,
                    "lng": lng,
                    "property_type": request.property_type,
                    "price": request.price,
                    "bedrooms": request.bedrooms,
                    "bathrooms": request.bathrooms,
                    "parking": request.parking,
                    "land_size_sqm": request.land_size_sqm,
                    "year_built": request.year_built,
                },
                suburb_stats=stats,
                nearby=nearby_pois_raw,
                walkability=walkability_raw,
                risk=risk_raw,
                financials={
                    "annual_income": request.annual_income,
                    "monthly_costs": request.monthly_costs,
                    "monthly_repayment": monthly_repayment,
                    "borrowing_capacity": borrowing_capacity,
                },
                api_key=settings.ANTHROPIC_API_KEY,
            )

            dim_raw = raw_ai.get("dimension_scores", {})
            ai_dims = AIDimensionScores(
                location_liveability=_parse_ai_dimension(dim_raw, "location_liveability"),
                environmental_risk=_parse_ai_dimension(dim_raw, "environmental_risk"),
                property_land_quality=_parse_ai_dimension(dim_raw, "property_land_quality"),
                capital_growth_potential=_parse_ai_dimension(dim_raw, "capital_growth_potential"),
                neighbourhood_quality=_parse_ai_dimension(dim_raw, "neighbourhood_quality"),
            )

            ai_flags = []
            for f in raw_ai.get("flags", []):
                flag_type = f.get("type", "green")
                if flag_type not in ("red", "golden", "green", "fixable"):
                    flag_type = "green"
                ai_flags.append(AIFlag(type=flag_type, factor=f.get("factor", ""), explanation=f.get("explanation", "")))

            ai_result = AIAnalysis(
                available=True,
                flags=ai_flags,
                dimension_scores=ai_dims,
                composite_score=raw_ai.get("composite_score"),
                has_critical_veto=raw_ai.get("has_critical_veto", False),
                veto_reasons=raw_ai.get("veto_reasons", []),
                verdict=raw_ai.get("verdict"),
                data_gaps=raw_ai.get("data_gaps", []),
            )
        except Exception:
            ai_result = AIAnalysis(available=False)

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
        walkability=walkability_response,
        risk_profile=risk_response,
        domain_market_data=domain_market,
        ai_analysis=ai_result,
    )
