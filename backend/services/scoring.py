"""
Core scoring engine for the Palm Cove property assessment tool.

All pillar functions return a PillarBreakdown with:
  - score: 0-100 composite pillar score
  - sub_scores: component scores
  - insights: plain-English sentences with real figures

calculate_final_score() produces the weighted total and band label.
"""

from __future__ import annotations

import math
from typing import Optional

from models.response import AlternativeSuburb, PillarBreakdown

# ---------------------------------------------------------------------------
# Pillar weights
# ---------------------------------------------------------------------------

WEIGHTS: dict[str, float] = {
    "location": 0.30,
    "affordability": 0.25,
    "features": 0.20,
    "suburb_quality": 0.15,
    "investment": 0.10,
}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _band(score: float) -> str:
    if score >= 80:
        return "Exceptional"
    if score >= 65:
        return "Strong Buy"
    if score >= 50:
        return "Consider with Caution"
    if score >= 35:
        return "Significant Concerns"
    return "Not Recommended"


def _fmt_dist(metres: float) -> str:
    if metres < 1000:
        return f"{int(round(metres))}m"
    return f"{metres / 1000:.1f}km"


def _fmt_price(dollars: float) -> str:
    if dollars >= 1_000_000:
        return f"${dollars / 1_000_000:.2f}m"
    if dollars >= 1_000:
        return f"${dollars / 1000:.0f}k"
    return f"${dollars:.0f}"


# ---------------------------------------------------------------------------
# 1. Location
# ---------------------------------------------------------------------------


def score_location(
    nearby_pois: dict[str, list[dict]],
    lat: float,
    lng: float,
    suburb_stats: Optional[dict],
) -> PillarBreakdown:
    """Score location quality based on proximity to amenities."""

    # --- Schools ---
    schools = nearby_pois.get("schools", [])
    nearest_school_m = schools[0]["distance_m"] if schools else 9999
    if nearest_school_m <= 500:
        school_score = 100.0
    elif nearest_school_m <= 1000:
        school_score = 85.0
    elif nearest_school_m <= 1500:
        school_score = 70.0
    elif nearest_school_m <= 2000:
        school_score = 50.0
    else:
        school_score = 25.0

    # --- Transport ---
    transport = nearby_pois.get("transport", [])
    nearest_transport_m = transport[0]["distance_m"] if transport else 9999
    if nearest_transport_m <= 300:
        transport_score = 100.0
    elif nearest_transport_m <= 700:
        transport_score = 85.0
    elif nearest_transport_m <= 1200:
        transport_score = 60.0
    elif nearest_transport_m <= 1500:
        transport_score = 40.0
    else:
        transport_score = 20.0

    # --- Parks ---
    parks = nearby_pois.get("parks", [])
    nearest_park_m = parks[0]["distance_m"] if parks else 9999
    if nearest_park_m <= 300:
        park_score = 100.0
    elif nearest_park_m <= 600:
        park_score = 80.0
    elif nearest_park_m <= 1000:
        park_score = 60.0
    else:
        park_score = 40.0

    # --- Road / Social Housing penalty from suburb stats ---
    road_penalty_score = 100.0  # default: assume no major road issue
    social_housing_score = 70.0  # default: insufficient data

    if suburb_stats:
        sh = suburb_stats.get("social_housing_concentration", "medium").lower()
        if sh == "low":
            social_housing_score = 100.0
        elif sh == "medium":
            social_housing_score = 60.0
        else:
            social_housing_score = 30.0

    # Composite
    composite = (
        school_score * 0.30
        + transport_score * 0.25
        + park_score * 0.15
        + road_penalty_score * 0.15
        + social_housing_score * 0.15
    )

    # --- Insights ---
    insights: list[str] = []

    if nearest_school_m <= 9998:
        dist_str = _fmt_dist(nearest_school_m)
        if nearest_school_m <= 500:
            insights.append(
                f"Nearest school is {dist_str} away — ideal walking distance for families."
            )
        elif nearest_school_m <= 1000:
            insights.append(
                f"Nearest school is {dist_str} away — a comfortable short walk."
            )
        elif nearest_school_m <= 1500:
            insights.append(
                f"Nearest school is {dist_str} away — manageable but may require cycling or driving."
            )
        else:
            insights.append(
                f"Nearest school is {dist_str} away — families will rely on car transport."
            )
    else:
        insights.append("No schools found within 2km — significant drawback for families.")

    if nearest_transport_m <= 9998:
        dist_str = _fmt_dist(nearest_transport_m)
        if nearest_transport_m <= 300:
            insights.append(
                f"Public transport is just {dist_str} away — excellent for car-free commuting."
            )
        elif nearest_transport_m <= 700:
            insights.append(
                f"Public transport is {dist_str} away — very walkable access to transit."
            )
        elif nearest_transport_m <= 1200:
            insights.append(
                f"Public transport is {dist_str} away — acceptable but a moderate walk."
            )
        else:
            insights.append(
                f"Public transport is {dist_str} away — car dependency likely."
            )
    else:
        insights.append("No public transport found within 1.5km — area is car-dependent.")

    if nearest_park_m <= 9998:
        dist_str = _fmt_dist(nearest_park_m)
        if nearest_park_m <= 300:
            insights.append(f"A park is right on the doorstep at {dist_str}.")
        elif nearest_park_m <= 600:
            insights.append(f"Green space is a short {dist_str} walk away.")
        elif nearest_park_m <= 1000:
            insights.append(f"Nearest park is {dist_str} — requires a deliberate walk.")
        else:
            insights.append(f"Limited immediate green space; nearest park is {dist_str}.")
    else:
        insights.append("No parks found within 1km of this property.")

    if suburb_stats:
        sh = suburb_stats.get("social_housing_concentration", "medium").lower()
        if sh == "low":
            insights.append("Low social housing concentration in this suburb — stable, owner-occupier-dominant streetscape.")
        elif sh == "medium":
            insights.append("Moderate social housing concentration — mixed neighbourhood character.")
        else:
            insights.append("High social housing concentration noted — may affect resale appeal and capital growth.")

    return PillarBreakdown(
        score=round(composite, 1),
        sub_scores={
            "schools": school_score,
            "transport": transport_score,
            "parks": park_score,
            "road_penalty": road_penalty_score,
            "social_housing": social_housing_score,
        },
        insights=insights,
    )


# ---------------------------------------------------------------------------
# 2. Affordability
# ---------------------------------------------------------------------------


def score_affordability(
    price: float,
    annual_income: float,
    monthly_costs: float,
    mortgage_rate: float = 0.065,
) -> tuple[PillarBreakdown, float, float]:
    """
    Score affordability of the property relative to the buyer's finances.

    Returns:
        (PillarBreakdown, monthly_repayment, borrowing_capacity)
    """
    borrowing_capacity = annual_income * 6

    # Borrowing ratio
    borrowing_ratio = price / borrowing_capacity
    if borrowing_ratio <= 0.80:
        borrowing_score = 100.0
    elif borrowing_ratio <= 1.00:
        borrowing_score = 80.0
    elif borrowing_ratio <= 1.20:
        borrowing_score = 60.0
    elif borrowing_ratio <= 1.50:
        borrowing_score = 35.0
    else:
        borrowing_score = 10.0

    # Monthly repayment (P&I, 80% LVR, 30-year term)
    loan = price * 0.80
    r = mortgage_rate / 12
    n = 360  # 30 years * 12
    if r > 0:
        monthly_repayment = loan * r / (1 - (1 + r) ** -n)
    else:
        monthly_repayment = loan / n

    monthly_income = annual_income / 12
    disposable = monthly_income - monthly_costs

    if disposable <= 0:
        repayment_ratio = 999.0
        repayment_score = 10.0
    else:
        repayment_ratio = monthly_repayment / disposable
        if repayment_ratio <= 0.25:
            repayment_score = 100.0
        elif repayment_ratio <= 0.30:
            repayment_score = 85.0
        elif repayment_ratio <= 0.35:
            repayment_score = 65.0
        elif repayment_ratio <= 0.40:
            repayment_score = 40.0
        else:
            repayment_score = 15.0

    composite = borrowing_score * 0.50 + repayment_score * 0.50

    # Insights
    repayment_pct = min(repayment_ratio, 9.99) * 100
    insights: list[str] = []

    insights.append(
        f"Estimated monthly repayment is {_fmt_price(monthly_repayment)} "
        f"({repayment_pct:.1f}% of disposable income after existing commitments)."
    )
    insights.append(
        f"Estimated borrowing capacity is {_fmt_price(borrowing_capacity)} "
        f"at 6× income; the property is {borrowing_ratio * 100:.0f}% of that limit."
    )

    if borrowing_ratio > 1.5:
        insights.append(
            f"At {_fmt_price(price)}, the purchase price significantly exceeds your estimated "
            f"borrowing capacity of {_fmt_price(borrowing_capacity)}. Lender approval may be difficult."
        )
    elif borrowing_ratio <= 0.80:
        insights.append(
            f"The purchase price sits comfortably within borrowing capacity — "
            f"strong serviceability buffer of {_fmt_price(borrowing_capacity - price)}."
        )

    if repayment_ratio > 0.40:
        insights.append(
            f"Repayments consume more than 40% of disposable income — mortgage stress risk is high."
        )
    elif repayment_ratio <= 0.25:
        insights.append(
            "Repayment-to-income ratio is well within the safe 25% threshold — very comfortable serviceability."
        )

    return (
        PillarBreakdown(
            score=round(composite, 1),
            sub_scores={
                "borrowing_ratio_score": borrowing_score,
                "repayment_ratio_score": repayment_score,
            },
            insights=insights,
        ),
        round(monthly_repayment, 2),
        round(borrowing_capacity, 2),
    )


# ---------------------------------------------------------------------------
# 3. Features
# ---------------------------------------------------------------------------


def score_features(
    bedrooms: int,
    bathrooms: int,
    parking: int,
    land_size_sqm: float,
    year_built: Optional[int],
    property_type: str,
) -> PillarBreakdown:
    """Score the physical attributes of the property."""

    # Bedrooms
    if bedrooms == 1:
        bed_score = 40.0
    elif bedrooms == 2:
        bed_score = 65.0
    elif bedrooms == 3:
        bed_score = 85.0
    elif bedrooms == 4:
        bed_score = 95.0
    else:
        bed_score = 100.0

    # Bathrooms
    if bathrooms == 1:
        bath_score = 60.0
    elif bathrooms == 2:
        bath_score = 85.0
    else:
        bath_score = 100.0

    # Parking
    if parking == 0:
        park_score = 40.0
    elif parking == 1:
        park_score = 70.0
    elif parking == 2:
        park_score = 90.0
    else:
        park_score = 100.0

    # Land size
    is_apartment = property_type.lower() in ("apartment", "unit") or land_size_sqm == 0
    if is_apartment or land_size_sqm == 0:
        land_score = 50.0
    elif land_size_sqm < 300:
        land_score = 45.0
    elif land_size_sqm < 450:
        land_score = 60.0
    elif land_size_sqm < 600:
        land_score = 75.0
    elif land_size_sqm < 800:
        land_score = 88.0
    else:
        land_score = 100.0

    # Age
    if year_built is None:
        age_score = 70.0
    elif year_built >= 2010:
        age_score = 100.0
    elif year_built >= 2000:
        age_score = 85.0
    elif year_built >= 1990:
        age_score = 75.0
    elif year_built >= 1980:
        age_score = 60.0
    elif year_built >= 1970:
        age_score = 50.0
    else:
        age_score = 65.0  # Character homes pre-1970 often desirable

    composite = (
        bed_score * 0.30
        + bath_score * 0.20
        + park_score * 0.15
        + land_score * 0.25
        + age_score * 0.10
    )

    # Insights
    insights: list[str] = []

    bed_word = "bedroom" if bedrooms == 1 else "bedrooms"
    insights.append(
        f"{bedrooms} {bed_word} {'is sufficient for singles or couples' if bedrooms <= 2 else 'suits families well'}."
    )

    if bathrooms >= 2:
        insights.append(f"{bathrooms} bathrooms is a practical asset for households with multiple occupants.")
    else:
        insights.append("A single bathroom may feel cramped for larger households — consider renovation potential.")

    if parking == 0:
        insights.append("No parking included — check street parking availability and council regulations.")
    elif parking >= 2:
        insights.append(f"{parking} car spaces is a premium feature, especially in urban areas.")

    if not is_apartment and land_size_sqm > 0:
        insights.append(f"Land size of {land_size_sqm:.0f}sqm {'is generous for the area' if land_size_sqm >= 600 else 'is typical for the suburb'}.")
    elif is_apartment:
        insights.append("Apartment/unit format — land size not applicable; strata levy exposure to consider.")

    if year_built:
        if year_built >= 2010:
            insights.append(f"Built in {year_built} — modern construction standards, likely low maintenance.")
        elif year_built < 1970:
            insights.append(
                f"Built in {year_built} — character property with potential heritage appeal, "
                "but factor in renovation and compliance costs."
            )
        else:
            insights.append(f"Built in {year_built} — may benefit from targeted upgrades to kitchens or bathrooms.")
    else:
        insights.append("Year built unknown — commission a building inspection to identify any deferred maintenance.")

    return PillarBreakdown(
        score=round(composite, 1),
        sub_scores={
            "bedrooms": bed_score,
            "bathrooms": bath_score,
            "parking": park_score,
            "land_size": land_score,
            "age": age_score,
        },
        insights=insights,
    )


# ---------------------------------------------------------------------------
# 4. Suburb Quality
# ---------------------------------------------------------------------------


def score_suburb_quality(suburb_stats: Optional[dict]) -> PillarBreakdown:
    """Score the macro quality of the suburb based on market data."""

    if suburb_stats is None:
        return PillarBreakdown(
            score=60.0,
            sub_scores={"growth_10yr": 60.0, "vacancy": 60.0, "days_on_market": 60.0},
            insights=["Insufficient suburb data available — score reflects market average assumption."],
        )

    # 10-year growth
    growth = suburb_stats.get("ten_year_growth_pct", 0.0)
    if growth > 8:
        growth_score = 100.0
    elif growth > 6:
        growth_score = 85.0
    elif growth > 4:
        growth_score = 70.0
    elif growth > 2:
        growth_score = 50.0
    else:
        growth_score = 30.0

    # Vacancy rate
    vacancy = suburb_stats.get("vacancy_rate_pct", 3.0)
    if vacancy < 1.0:
        vacancy_score = 100.0
    elif vacancy < 2.0:
        vacancy_score = 85.0
    elif vacancy < 3.0:
        vacancy_score = 65.0
    elif vacancy < 5.0:
        vacancy_score = 40.0
    else:
        vacancy_score = 20.0

    # Days on market
    dom = suburb_stats.get("days_on_market_median", 45)
    if dom < 20:
        dom_score = 100.0
    elif dom < 35:
        dom_score = 85.0
    elif dom < 50:
        dom_score = 65.0
    elif dom < 70:
        dom_score = 45.0
    else:
        dom_score = 25.0

    composite = growth_score * 0.45 + vacancy_score * 0.30 + dom_score * 0.25

    suburb_name = suburb_stats.get("suburb", "This suburb")
    insights: list[str] = []

    insights.append(
        f"{suburb_name} has recorded {growth:.1f}% capital growth over the past 10 years "
        f"— {'strong' if growth > 6 else 'moderate' if growth > 3 else 'below-average'} by national standards."
    )
    insights.append(
        f"Vacancy rate of {vacancy:.1f}% indicates "
        f"{'very tight' if vacancy < 1 else 'healthy' if vacancy < 2 else 'balanced' if vacancy < 3 else 'elevated'} "
        f"rental demand."
    )
    dom_desc = (
        "a seller's market with fast turnover"
        if dom < 25
        else "typical market pace"
        if dom < 50
        else "a slower market; buyers have more negotiating power"
    )
    insights.append(
        f"Properties sell in a median of {dom} days — {dom_desc}."
    )

    return PillarBreakdown(
        score=round(composite, 1),
        sub_scores={
            "growth_10yr": growth_score,
            "vacancy": vacancy_score,
            "days_on_market": dom_score,
        },
        insights=insights,
    )


# ---------------------------------------------------------------------------
# 5. Investment
# ---------------------------------------------------------------------------


def score_investment(
    price: float,
    suburb_stats: Optional[dict],
    property_type: str,
    land_size_sqm: float = 0,
) -> PillarBreakdown:
    """Score investment fundamentals: yield and price-per-sqm vs suburb median."""

    if suburb_stats is None:
        return PillarBreakdown(
            score=55.0,
            sub_scores={"gross_yield": 55.0},
            insights=["Insufficient suburb data — investment score reflects market average assumption."],
        )

    is_house = property_type.lower() in ("house", "townhouse")
    if is_house:
        weekly_rent = suburb_stats.get("weekly_rent_median_house", 0)
        median_price_sqm = suburb_stats.get("price_per_sqm_median", 0)
    else:
        weekly_rent = suburb_stats.get("weekly_rent_median_unit", 0)
        median_price_sqm = suburb_stats.get("price_per_sqm_median", 0)

    gross_yield = (weekly_rent * 52) / price if price > 0 else 0

    if gross_yield > 0.05:
        yield_score = 100.0
    elif gross_yield > 0.04:
        yield_score = 85.0
    elif gross_yield > 0.03:
        yield_score = 65.0
    elif gross_yield > 0.02:
        yield_score = 40.0
    else:
        yield_score = 20.0

    # Price per sqm vs suburb median
    psqm_score: Optional[float] = None
    if land_size_sqm > 0 and median_price_sqm > 0:
        price_per_sqm = price / land_size_sqm
        ratio = price_per_sqm / median_price_sqm  # 1.0 = at median
        if ratio <= 0.80:
            psqm_score = 100.0
        elif ratio <= 0.90:
            psqm_score = 85.0
        elif ratio <= 1.00:
            psqm_score = 70.0
        elif ratio <= 1.10:
            psqm_score = 55.0
        elif ratio <= 1.20:
            psqm_score = 35.0
        else:
            psqm_score = 15.0

    if psqm_score is not None:
        composite = yield_score * 0.55 + psqm_score * 0.45
    else:
        composite = yield_score

    suburb_name = suburb_stats.get("suburb", "This suburb")
    insights: list[str] = []

    gross_yield_pct = gross_yield * 100
    insights.append(
        f"Estimated gross rental yield is {gross_yield_pct:.2f}% based on a median weekly rent "
        f"of ${weekly_rent:,} — "
        f"{'attractive' if gross_yield > 0.05 else 'solid' if gross_yield > 0.04 else 'average' if gross_yield > 0.03 else 'low'} "
        f"for the current market."
    )

    if psqm_score is not None and land_size_sqm > 0:
        price_per_sqm = price / land_size_sqm
        comparison = "below" if price_per_sqm < median_price_sqm else "above"
        pct_diff = abs(price_per_sqm - median_price_sqm) / median_price_sqm * 100
        insights.append(
            f"At ${price_per_sqm:,.0f}/sqm the property is {pct_diff:.0f}% {comparison} "
            f"the {suburb_name} median of ${median_price_sqm:,.0f}/sqm."
        )
    else:
        insights.append(
            "Price-per-sqm analysis not applicable (apartment or insufficient data)."
        )

    insights.append(
        f"{suburb_name} has a {suburb_stats.get('five_year_growth_pct', 'N/A')}% 5-year growth rate, "
        f"supporting the medium-term investment case."
    )

    return PillarBreakdown(
        score=round(composite, 1),
        sub_scores={
            "gross_yield": yield_score,
            **({"price_per_sqm": psqm_score} if psqm_score is not None else {}),
        },
        insights=insights,
    )


# ---------------------------------------------------------------------------
# Flag generators
# ---------------------------------------------------------------------------


def generate_red_flags(
    pillars: dict[str, PillarBreakdown],
    repayment_ratio: float,
    borrowing_ratio: float,
    suburb_stats: Optional[dict],
) -> list[str]:
    """Generate specific risk warnings for the assessment."""
    flags: list[str] = []

    if borrowing_ratio > 1.5:
        flags.append(
            f"Purchase price exceeds estimated borrowing capacity by "
            f"{(borrowing_ratio - 1) * 100:.0f}% — lender approval is not guaranteed."
        )

    if repayment_ratio > 0.40:
        flags.append(
            f"Mortgage repayments consume {repayment_ratio * 100:.0f}% of disposable income — "
            f"above the 40% mortgage stress threshold."
        )

    if pillars["location"].score < 50:
        flags.append(
            "Location score is below 50 — poor access to schools, transport, or parks "
            "will limit tenant/buyer appeal and resale value."
        )

    if pillars["suburb_quality"].score < 45:
        flags.append(
            "Suburb quality metrics (growth, vacancy, days on market) are weak — "
            "exercise caution regarding capital growth prospects."
        )

    if suburb_stats:
        if suburb_stats.get("vacancy_rate_pct", 0) > 5:
            vr = suburb_stats["vacancy_rate_pct"]
            flags.append(
                f"Rental vacancy rate of {vr}% is very high — rental income may be unreliable."
            )
        sh = suburb_stats.get("social_housing_concentration", "low")
        if sh == "high":
            flags.append(
                "High social housing concentration in this suburb — potential downward pressure "
                "on property values and rental demand quality."
            )
        dom = suburb_stats.get("days_on_market_median", 0)
        if dom > 70:
            flags.append(
                f"Median days on market is {dom} days — an illiquid market where selling quickly may require heavy discounting."
            )

    if pillars["investment"].score < 40:
        flags.append(
            "Investment fundamentals are poor — low rental yield and/or above-median price per sqm."
        )

    if pillars["features"].score < 45:
        flags.append(
            "Property features score is low — limited bedrooms, bathrooms, or parking may restrict the buyer pool on resale."
        )

    return flags


def generate_green_flags(
    pillars: dict[str, PillarBreakdown],
    nearby_pois: dict[str, list[dict]],
    suburb_stats: Optional[dict],
) -> list[str]:
    """Generate specific positive highlights for the assessment."""
    flags: list[str] = []

    if pillars["location"].score >= 80:
        flags.append(
            "Excellent location score — strong proximity to schools, transport, and parks."
        )

    schools = nearby_pois.get("schools", [])
    if schools and schools[0]["distance_m"] <= 500:
        flags.append(
            f"A school is within 500m ({schools[0]['distance_m']:.0f}m) — highly desirable for families."
        )

    transport = nearby_pois.get("transport", [])
    if transport and transport[0]["distance_m"] <= 400:
        flags.append(
            f"Public transport just {transport[0]['distance_m']:.0f}m away — excellent connectivity."
        )

    if pillars["affordability"].score >= 80:
        flags.append(
            "Strong affordability — repayments and borrowing ratio are both within conservative thresholds."
        )

    if suburb_stats:
        growth = suburb_stats.get("ten_year_growth_pct", 0)
        if growth > 7:
            flags.append(
                f"{suburb_stats.get('suburb', 'The suburb')} has delivered {growth:.1f}% annual capital "
                f"growth over 10 years — a proven wealth-building location."
            )
        vacancy = suburb_stats.get("vacancy_rate_pct", 99)
        if vacancy < 1.5:
            flags.append(
                f"Rental vacancy of {vacancy:.1f}% is very tight — low risk of extended vacancy periods."
            )
        dom = suburb_stats.get("days_on_market_median", 99)
        if dom < 25:
            flags.append(
                f"Properties sell in a median of {dom} days — strong market liquidity and buyer demand."
            )
        sh = suburb_stats.get("social_housing_concentration", "")
        if sh == "low":
            flags.append(
                "Low social housing concentration — stable, owner-occupier-dominated neighbourhood."
            )

    if pillars["investment"].score >= 80:
        flags.append(
            "Strong investment fundamentals — attractive gross yield and competitive price per sqm."
        )

    if pillars["suburb_quality"].score >= 80:
        flags.append(
            "Above-average suburb quality indicators — solid capital growth, low vacancy, and brisk sales pace."
        )

    return flags


# ---------------------------------------------------------------------------
# Buyers Agent Summary
# ---------------------------------------------------------------------------


def generate_buyers_agent_summary(
    overall_score: float,
    band: str,
    pillars: dict[str, PillarBreakdown],
    suburb: str,
    price: float,
) -> str:
    """Generate a 3–4 sentence professional buyers-agent summary paragraph."""

    sorted_pillars = sorted(pillars.items(), key=lambda kv: kv[1].score, reverse=True)
    best_pillar_name, best_pillar = sorted_pillars[0]
    worst_pillar_name, worst_pillar = sorted_pillars[-1]

    pillar_labels = {
        "location": "location quality",
        "affordability": "affordability",
        "features": "property features",
        "suburb_quality": "suburb fundamentals",
        "investment": "investment metrics",
    }

    action_map = {
        "Exceptional": "proceed confidently — this represents an outstanding buying opportunity.",
        "Strong Buy": "proceed with an offer, subject to standard due diligence and a building inspection.",
        "Consider with Caution": (
            "consider negotiating on price before proceeding, and stress-test your finances carefully."
        ),
        "Significant Concerns": (
            "request further investigation into the flagged concerns before committing."
        ),
        "Not Recommended": (
            "reconsider this purchase or seek significant price reduction to offset the identified risks."
        ),
    }
    action = action_map.get(band, "proceed with caution.")

    summary = (
        f"This {suburb} property has received an overall score of {overall_score:.0f}/100, "
        f"placing it in the '{band}' category. "
        f"Its strongest attribute is {pillar_labels.get(best_pillar_name, best_pillar_name)} "
        f"(pillar score: {best_pillar.score:.0f}), "
        f"while {pillar_labels.get(worst_pillar_name, worst_pillar_name)} "
        f"(pillar score: {worst_pillar.score:.0f}) presents the greatest area for consideration. "
        f"At {_fmt_price(price)}, the pricing {'aligns well' if pillars['affordability'].score >= 65 else 'stretches'} "
        f"with your financial profile. "
        f"Our recommendation: {action}"
    )
    return summary


# ---------------------------------------------------------------------------
# Final score and band
# ---------------------------------------------------------------------------


def calculate_final_score(pillars: dict[str, PillarBreakdown]) -> tuple[float, str]:
    """Return (weighted_score, band) from the five pillar breakdowns."""
    total = sum(
        pillars[key].score * weight
        for key, weight in WEIGHTS.items()
        if key in pillars
    )
    total = round(total, 1)
    return total, _band(total)


# ---------------------------------------------------------------------------
# Alternative suburb scoring helper
# ---------------------------------------------------------------------------


def score_alternative_suburb(
    suburb_data: dict,
    price: float,
    property_type: str,
) -> float:
    """
    Fast composite score for ranking alternative suburbs.
    Uses growth, vacancy, yield, and days-on-market.
    """
    is_house = property_type.lower() in ("house", "townhouse")
    weekly_rent = (
        suburb_data.get("weekly_rent_median_house", 0)
        if is_house
        else suburb_data.get("weekly_rent_median_unit", 0)
    )
    median_price = (
        suburb_data.get("median_house_price", price)
        if is_house
        else suburb_data.get("median_unit_price", price)
    )

    gross_yield = (weekly_rent * 52) / median_price if median_price > 0 else 0
    growth = suburb_data.get("ten_year_growth_pct", 3.0)
    vacancy = suburb_data.get("vacancy_rate_pct", 3.0)
    dom = suburb_data.get("days_on_market_median", 45)

    # Normalise each factor 0-100
    growth_s = min(growth / 10 * 100, 100)
    yield_s = min(gross_yield / 0.06 * 100, 100)
    vacancy_s = max(0, 100 - vacancy * 15)
    dom_s = max(0, 100 - dom * 1.2)

    return round(growth_s * 0.40 + yield_s * 0.30 + vacancy_s * 0.20 + dom_s * 0.10, 1)
