from fastapi import APIRouter
from pydantic import BaseModel
from services import domain_api
from config import settings

router = APIRouter()


class PropertyLookupRequest(BaseModel):
    address: str


class ListingUrlLookupRequest(BaseModel):
    url: str


@router.post("/listing-lookup")
async def listing_url_lookup(request: ListingUrlLookupRequest) -> dict:
    """
    Look up a Domain.com.au listing by URL and return autofill-ready data.
    Extracts the listing ID from the URL, fetches full listing details,
    and maps them to the same shape as /property-lookup.
    """
    if not settings.DOMAIN_CLIENT_ID or not settings.DOMAIN_CLIENT_SECRET:
        return {"found": False, "reason": "Domain API not configured"}

    listing_id = domain_api.extract_listing_id_from_url(request.url)
    if not listing_id:
        return {"found": False, "reason": "Could not extract a listing ID from this URL"}

    try:
        content = await domain_api.fetch_listing_content(
            listing_id=listing_id,
            client_id=settings.DOMAIN_CLIENT_ID,
            client_secret=settings.DOMAIN_CLIENT_SECRET,
        )
    except Exception:
        return {"found": False, "reason": "Failed to fetch listing from Domain API"}

    if not content:
        return {"found": False, "reason": "Listing not found on Domain.com.au"}

    # Map to the same autofill shape as /property-lookup
    return {
        "found": True,
        "property_id": listing_id,
        "headline": content.get("headline", ""),
        "property_type": content.get("property_type"),
        "bedrooms": content.get("bedrooms"),
        "bathrooms": content.get("bathrooms"),
        "parking": content.get("parking"),
        "land_size_sqm": content.get("land_area"),
        "building_area_sqm": content.get("building_area"),
        "year_built": None,          # not in listing endpoint
        "features": content.get("features", []),
        "display_price": content.get("display_price", ""),
        "listing_url": content.get("listing_url", ""),
        "price": None,               # display_price is a string; user fills purchase price
    }


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
