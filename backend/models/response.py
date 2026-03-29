from typing import Literal, Optional
from pydantic import BaseModel


class PillarBreakdown(BaseModel):
    score: float = 0.0
    sub_scores: dict[str, float] = {}
    insights: list[str] = []


class NearbyPOI(BaseModel):
    name: str
    distance_m: float
    type: str


class AlternativeSuburb(BaseModel):
    suburb: str
    state: str
    postcode: str
    rationale: str
    median_price: float
    ten_year_growth: float
    gross_yield: float
    distance_km: float
    score_delta: float


class WalkabilityData(BaseModel):
    counts: dict[str, int] = {}
    total: int = 0
    radius_m: int = 1500


class RiskProfile(BaseModel):
    flood_risk: bool = False
    bushfire_risk: bool = False
    flood_checked: bool = False
    bushfire_checked: bool = False


class DomainMarketData(BaseModel):
    median_sale_price: Optional[float] = None
    days_on_market: Optional[int] = None
    number_sold: Optional[int] = None
    auction_clearance_rate: Optional[float] = None
    data_available: bool = False


class AIFlag(BaseModel):
    type: Literal["red", "golden", "green", "fixable"]
    factor: str
    explanation: str


class AIDimensionScore(BaseModel):
    score: float
    rationale: str


class AIDimensionScores(BaseModel):
    location_liveability: Optional[AIDimensionScore] = None
    environmental_risk: Optional[AIDimensionScore] = None
    property_land_quality: Optional[AIDimensionScore] = None
    capital_growth_potential: Optional[AIDimensionScore] = None
    neighbourhood_quality: Optional[AIDimensionScore] = None


class AIAnalysis(BaseModel):
    available: bool = False
    flags: list[AIFlag] = []
    dimension_scores: Optional[AIDimensionScores] = None
    composite_score: Optional[float] = None
    has_critical_veto: bool = False
    veto_reasons: list[str] = []
    verdict: Optional[str] = None
    data_gaps: list[str] = []


class AssessmentResponse(BaseModel):
    overall_score: float
    band: str
    lat: float
    lng: float
    suburb: str
    state: str
    postcode: str
    pillars: dict[str, PillarBreakdown]
    nearby_pois: dict[str, list[NearbyPOI]]
    buyers_agent_summary: str
    red_flags: list[str]
    green_flags: list[str]
    alternatives: list[AlternativeSuburb]
    monthly_repayment: float
    borrowing_capacity: float
    walkability: Optional[WalkabilityData] = None
    risk_profile: Optional[RiskProfile] = None
    domain_market_data: Optional[DomainMarketData] = None
    ai_analysis: Optional[AIAnalysis] = None
    deposit: float = 0
    lvr_pct: float = 0
    lmi_required: bool = False
