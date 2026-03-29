from typing import Optional
from pydantic import BaseModel, Field


class AssessmentRequest(BaseModel):
    address: str = Field(..., description="Full Australian property address")
    price: float = Field(..., gt=0, description="Purchase price in AUD")
    bedrooms: int = Field(..., ge=0, le=20)
    bathrooms: int = Field(..., ge=0, le=20)
    parking: int = Field(..., ge=0, le=20)
    land_size_sqm: float = Field(
        ..., ge=0, description="Land size in sqm; use 0 for apartments"
    )
    year_built: Optional[int] = Field(
        default=None, ge=1800, le=2024, description="Year the property was built"
    )
    annual_income: float = Field(
        ..., gt=0, description="Gross annual household income in AUD"
    )
    monthly_costs: float = Field(
        ..., ge=0, description="Total existing monthly financial commitments in AUD"
    )
    deposit: float = Field(
        default=0, ge=0, description="Available deposit in AUD (excluding stamp duty/costs)"
    )
    property_type: str = Field(
        default="house",
        description="Property type: house | unit | apartment | townhouse",
    )

    # Bot protection
    recaptcha_token: Optional[str] = Field(
        default=None, description="reCAPTCHA v3 token from frontend"
    )
    honeypot: Optional[str] = Field(
        default=None, description="Must be empty — bots fill this field"
    )
    form_load_time: Optional[float] = Field(
        default=None, description="Unix timestamp when form was loaded"
    )
