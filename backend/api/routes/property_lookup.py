from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from services import domain_api
from config import settings

router = APIRouter()


class PropertyLookupRequest(BaseModel):
    address: str


@router.post("/property-lookup")
async def property_lookup(request: PropertyLookupRequest) -> dict:
    """
    Look up a property on Domain.com.au by address.
    Returns autofill data (bedrooms, bathrooms, price, etc.) if found.
    Requires DOMAIN_API_KEY to be configured.
    """
    if not settings.DOMAIN_API_KEY:
        return {"found": False, "reason": "Domain API not configured"}

    result = await domain_api.search_property_by_address(
        request.address, settings.DOMAIN_API_KEY
    )

    if result is None:
        return {"found": False, "reason": "Property not found on Domain.com.au"}

    return result
