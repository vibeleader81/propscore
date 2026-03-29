from typing import Optional
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
