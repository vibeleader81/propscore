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
