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
    Look up a property on Domain.com.au by plain-text address.

    Preference order:
    1. OAuth2 (DOMAIN_CLIENT_ID + DOMAIN_CLIENT_SECRET) — works for any property,
       returns beds/baths/land size/year built/price history/AVM estimate.
    2. Legacy API key (DOMAIN_API_KEY) — falls back to listing search,
       only finds currently listed or recently sold properties.

    Returns autofill-ready data or {"found": false} if nothing configured / found.
    """
    # --- OAuth2 path (preferred) ---
    if settings.DOMAIN_CLIENT_ID and settings.DOMAIN_CLIENT_SECRET:
        try:
            result = await domain_api.lookup_property_by_address(
                request.address,
                settings.DOMAIN_CLIENT_ID,
                settings.DOMAIN_CLIENT_SECRET,
            )
            if result:
                return result
            # Address not resolved — fall through to listing search if key available
        except RuntimeError:
            # Auth failure is fatal — don't fall through silently
            return {"found": False, "reason": "Domain API authentication failed. Check DOMAIN_CLIENT_ID and DOMAIN_CLIENT_SECRET."}
        except Exception:
            pass  # Network/parse error — try legacy fallback

    # --- Legacy API key fallback ---
    if settings.DOMAIN_API_KEY:
        result = await domain_api.search_property_by_address(
            request.address, settings.DOMAIN_API_KEY
        )
        if result:
            return result

    if not settings.DOMAIN_CLIENT_ID and not settings.DOMAIN_API_KEY:
        return {"found": False, "reason": "Domain API not configured"}

    return {"found": False, "reason": "Property not found on Domain.com.au"}
