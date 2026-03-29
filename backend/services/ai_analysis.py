"""
AI-powered property analysis using Claude.
Implements the Expert Australian Property Analyst evaluation framework.
"""
import json
import re
from typing import Optional

import anthropic

SYSTEM_PROMPT = """You are an expert Australian property analyst and buyers agent with 20+ years of experience across Sydney, Melbourne, Brisbane, Perth, Adelaide and regional markets. You have deep knowledge of real estate investment, urban planning, zoning law, and property valuation.

EVALUATION RULES:
Tag every finding with one of four labels:
- red — Unchangeable negative (heavily weight against). These are deal-breakers or serious long-term risks.
- golden — Unchangeable positive (heavily weight in favour). Rare, high-value permanent advantages.
- green — Changeable positive (note but don't overweight). Good but not permanent.
- fixable — Changeable negative (note cost implication). Can be improved but costs money.

SCORING:
Score the property out of 100 across these 5 dimensions:
1. location_liveability — max 25 points
2. environmental_risk — max 20 points (higher score = LOWER risk)
3. property_land_quality — max 20 points
4. capital_growth_potential — max 20 points
5. neighbourhood_quality — max 15 points

Composite score = sum of all dimension scores.

CRITICAL VETO FACTORS (any single one should flag has_critical_veto = true):
- Flood zone (1-in-100 year)
- Within 150m of a major arterial road
- Flight path noise contour >60 ANEF
- Adjacent to or within 300m of social/public housing estate
- Severely west-facing with no northern aspect
- Contaminated land or easement covering >15% of usable land
- R3/R4 zoning on immediately adjacent land (overshadowing/density risk)

CRITERIA TO ASSESS (use all available data, flag data gaps):

1. ORIENTATION & NATURAL LIGHT
- North-facing rear yard/living areas (critical in Southern Hemisphere — golden flag if confirmed)
- East-facing kitchen, north/east bedroom
- West-facing living areas (afternoon heat — red flag)
- Solar panel viability

2. NOISE & POLLUTION
- Within 200m of arterial road (red flag)
- Flight path proximity
- Near train line, industrial zone, 24hr businesses
- Electricity substation/transmission lines

3. NEIGHBOURHOOD QUALITY
- Social/public housing within 500m (red flag — price drag)
- Rental vs owner-occupier ratio
- Gentrification signals (positive leading indicator)
- Cafe/restaurant strip within 500m (golden if present)

4. CATCHMENT & AMENITY
- Primary/high school catchment quality (ICSEA ratings where known)
- Train station walkability (<800m = positive, >1.5km = negative)
- Beach/harbour/major park proximity (premium driver)
- Supermarket within 1km

5. ENVIRONMENTAL RISK
- Flood zone (red flag — critical veto)
- Bushfire Prone Land
- Coastal erosion
- Low-lying land in coastal areas (<5m AHD)
- Landslip risk in hilly areas

6. LAND & BLOCK QUALITY
- Land size vs suburb median
- Block shape (regular = positive, battle-axe = mixed)
- Easements and right-of-ways
- Subdivision/dual-occ potential
- Rear lane access

7. ZONING & DEVELOPMENT RISK
- Adjacent R3/R4 zoning (red flag — density risk)
- Neighbouring vacant lots (future overshadowing)
- Heritage overlay (limits development but protects streetscape)
- Infrastructure corridors

8. PROPERTY STRUCTURE
- Construction type (brick > weatherboard > lightweight clad)
- Roof type (flat roof = leak risk = fixable flag)
- Building age and maintenance cycle
- Granny flat/secondary dwelling (golden if present — rental income)
- Pool (green amenity, fixable for maintenance cost)

9. CAPITAL GROWTH SIGNALS
- 10-year CAGR vs national average (~5.5%)
- Vacancy rate (<2% = tight, >3% = oversupplied)
- Days on market trend
- Owner-occupier % (high = price support)
- Infrastructure pipeline

10. PRICE VS MARKET VALUE
- Asking price vs suburb median (adjusted for bedrooms/type)
- Price per sqm vs suburb median
- Days on market (high DOM + above median = overpriced)

Be direct and commercially minded. You are helping someone make a multi-million dollar decision.
Never hedge unnecessarily. Call out deal-breakers explicitly.

IMPORTANT: Respond with ONLY a valid JSON object. No prose before or after. No markdown code fences.
The JSON must follow this exact structure:
{
  "flags": [
    {"type": "red|golden|green|fixable", "factor": "factor name", "explanation": "one-line explanation"}
  ],
  "dimension_scores": {
    "location_liveability": {"score": 0-25, "rationale": "2-3 sentence rationale"},
    "environmental_risk": {"score": 0-20, "rationale": "2-3 sentence rationale"},
    "property_land_quality": {"score": 0-20, "rationale": "2-3 sentence rationale"},
    "capital_growth_potential": {"score": 0-20, "rationale": "2-3 sentence rationale"},
    "neighbourhood_quality": {"score": 0-15, "rationale": "2-3 sentence rationale"}
  },
  "composite_score": 0-100,
  "has_critical_veto": true/false,
  "veto_reasons": ["reason1"],
  "verdict": "2-3 direct paragraphs. Paragraph 1: overall assessment and strongest factors. Paragraph 2: key risks and deal-breakers if any. Paragraph 3: what to verify in person and negotiation angle.",
  "data_gaps": ["list of factors that could not be evaluated due to missing data"]
}"""


def _build_property_context(
    property_data: dict,
    suburb_stats: Optional[dict],
    nearby: dict,
    walkability: Optional[dict],
    risk: Optional[dict],
    financials: dict,
) -> str:
    prop = property_data
    stats = suburb_stats or {}
    walk_counts = (walkability or {}).get("counts", {})

    lines = [
        "PROPERTY DATA FOR ANALYSIS",
        "",
        "=== PROPERTY DETAILS ===",
        f"Address: {prop.get('address', 'Unknown')}",
        f"Suburb: {prop.get('suburb', '')}, {prop.get('state', '')}, {prop.get('postcode', '')}",
        f"Coordinates: lat={prop.get('lat', '')}, lng={prop.get('lng', '')}",
        f"Property Type: {prop.get('property_type', 'Unknown')}",
        f"Asking Price: ${prop.get('price', 0):,.0f}",
        f"Bedrooms: {prop.get('bedrooms', 'Not specified')}",
        f"Bathrooms: {prop.get('bathrooms', 'Not specified')}",
        f"Parking Spaces: {prop.get('parking', 'Not specified')}",
        f"Land Size: {prop.get('land_size_sqm', 'Not specified')} sqm",
        f"Year Built: {prop.get('year_built') or 'Not specified'}",
        "",
        "=== BUYER FINANCIALS ===",
        f"Annual Income: ${financials.get('annual_income', 0):,.0f}",
        f"Monthly Costs/Expenses: ${financials.get('monthly_costs', 0):,.0f}",
        f"Estimated Monthly Repayment (P&I, 30yr): ${financials.get('monthly_repayment', 0):,.0f}",
        f"Estimated Borrowing Capacity: ${financials.get('borrowing_capacity', 0):,.0f}",
        f"Deposit Available: ${financials.get('deposit', 0):,.0f}",
        f"Loan-to-Value Ratio (LVR): {financials.get('lvr_pct', 100):.1f}%",
        f"LMI Required (LVR >80%): {'Yes — adds significant upfront cost' if financials.get('lmi_required') else 'No'}",
        "",
        "=== SUBURB STATISTICS ===",
    ]

    if stats:
        lines += [
            f"Suburb Median House Price: ${stats.get('median_house_price', 0):,.0f}" if stats.get('median_house_price') else "Suburb Median House Price: Unknown",
            f"Suburb Median Unit Price: ${stats.get('median_unit_price', 0):,.0f}" if stats.get('median_unit_price') else "Suburb Median Unit Price: Unknown",
            f"10-Year Capital Growth: {stats.get('ten_year_growth_pct', 'Unknown')}% p.a.",
            f"5-Year Capital Growth: {stats.get('five_year_growth_pct', 'Unknown')}% p.a.",
            f"Gross Rental Yield (House): {stats.get('gross_rental_yield_house', 'Unknown')}%",
            f"Gross Rental Yield (Unit): {stats.get('gross_rental_yield_unit', 'Unknown')}%",
            f"Vacancy Rate: {stats.get('vacancy_rate_pct', 'Unknown')}%",
            f"Median Days on Market: {stats.get('days_on_market_median', 'Unknown')} days",
            f"Median Land Size: {stats.get('median_land_size_sqm', 'Unknown')} sqm",
            f"Price per sqm (Median): ${stats.get('price_per_sqm_median', 0):,.0f}" if stats.get('price_per_sqm_median') else "Price per sqm: Unknown",
            f"Social Housing Concentration: {stats.get('social_housing_concentration', 'Unknown')}",
        ]
        # Price vs median
        prop_type = prop.get('property_type', '').lower()
        price = prop.get('price', 0)
        if prop_type in ('house', 'townhouse') and stats.get('median_house_price') and price:
            median = stats['median_house_price']
            ratio = (price / median - 1) * 100
            direction = "above" if ratio > 0 else "below"
            lines.append(f"Asking Price vs Suburb Median House: {abs(ratio):.1f}% {direction} median")
        elif prop_type in ('unit', 'apartment', 'flat') and stats.get('median_unit_price') and price:
            median = stats['median_unit_price']
            ratio = (price / median - 1) * 100
            direction = "above" if ratio > 0 else "below"
            lines.append(f"Asking Price vs Suburb Median Unit: {abs(ratio):.1f}% {direction} median")
    else:
        lines.append("Suburb statistics: NOT AVAILABLE — limited from suburb database")

    lines += ["", "=== NEARBY SCHOOLS (Google Maps, within 2km) ==="]
    schools = nearby.get("schools", [])
    if schools:
        for s in schools[:6]:
            lines.append(f"  - {s.get('name', 'Unknown')} — {s.get('distance_m', 0):.0f}m away")
    else:
        lines.append("  No school data available")

    lines += ["", "=== NEARBY TRANSPORT (Google Maps, within 1.5km) ==="]
    transport = nearby.get("transport", [])
    if transport:
        for t in transport[:6]:
            lines.append(f"  - {t.get('name', 'Unknown')} — {t.get('distance_m', 0):.0f}m away")
    else:
        lines.append("  No transport data available")

    lines += ["", "=== NEARBY PARKS & RECREATION (Google Maps, within 1km) ==="]
    parks = nearby.get("parks", [])
    if parks:
        for p in parks[:6]:
            lines.append(f"  - {p.get('name', 'Unknown')} — {p.get('distance_m', 0):.0f}m away")
    else:
        lines.append("  No parks data available")

    if walk_counts:
        radius = (walkability or {}).get("radius_m", 1500)
        lines += [
            "",
            f"=== WALKABILITY — OpenStreetMap data within {radius}m ===",
            f"  Cafes & Restaurants: {walk_counts.get('cafes_restaurants', 0)}",
            f"  Supermarkets: {walk_counts.get('supermarkets', 0)}",
            f"  Medical / Healthcare facilities: {walk_counts.get('hospitals_medical', 0)}",
            f"  Childcare & Education: {walk_counts.get('childcare_education', 0)}",
            f"  Fitness & Recreation: {walk_counts.get('fitness_recreation', 0)}",
            f"  Shopping: {walk_counts.get('shopping', 0)}",
            f"  Total Amenities within radius: {(walkability or {}).get('total_amenities', 0)}",
        ]

    if risk:
        flood = risk.get('flood_risk')
        bushfire = risk.get('bushfire_risk')
        flood_checked = risk.get('flood_checked', False)
        bushfire_checked = risk.get('bushfire_checked', False)
        lines += [
            "",
            "=== ENVIRONMENTAL RISK ===",
            f"  Flood Risk: {'YES — PROPERTY IS IN A FLOOD ZONE' if flood else ('Not in known flood zone (checked)' if flood_checked else 'NOT CHECKED — must verify manually with council')}",
            f"  Bushfire Risk: {'YES — BUSHFIRE PRONE LAND' if bushfire else ('Not in known bushfire zone (checked)' if bushfire_checked else 'NOT CHECKED — must verify manually')}",
        ]
    else:
        lines += [
            "",
            "=== ENVIRONMENTAL RISK ===",
            "  Flood and bushfire data NOT AVAILABLE — buyer must check with council and state planning portals",
        ]

    return "\n".join(lines)


async def analyse_property(
    property_data: dict,
    suburb_stats: Optional[dict],
    nearby: dict,
    walkability: Optional[dict],
    risk: Optional[dict],
    financials: dict,
    api_key: str,
) -> dict:
    """
    Call Claude to analyse property data using the expert framework.
    Returns parsed structured response dict.
    """
    client = anthropic.AsyncAnthropic(api_key=api_key)

    user_message = _build_property_context(
        property_data, suburb_stats, nearby, walkability, risk, financials
    )

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    response_text = message.content[0].text.strip()

    # Strip markdown code fences if present
    response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
    response_text = re.sub(r"\s*```$", "", response_text)

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract first JSON object
        match = re.search(r"\{[\s\S]*\}", response_text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return {
            "flags": [],
            "dimension_scores": {},
            "composite_score": None,
            "has_critical_veto": False,
            "veto_reasons": [],
            "verdict": response_text[:800] if response_text else "Analysis unavailable.",
            "data_gaps": ["Full structured analysis unavailable — JSON parse error"],
        }
