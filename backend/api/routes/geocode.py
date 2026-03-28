from fastapi import APIRouter, Query, HTTPException
from services.google_maps import autocomplete_address
from config import settings

router = APIRouter()


@router.get("/geocode")
async def geocode_autocomplete(
    q: str = Query(..., min_length=3, description="Partial address query"),
) -> list[dict]:
    """
    Return autocomplete suggestions for Australian addresses.

    Query params:
        q: Partial address string (min 3 characters)

    Returns:
        List of {description, place_id}
    """
    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=503, detail="Google Maps API key is not configured.")

    suggestions = await autocomplete_address(q, settings.GOOGLE_MAPS_API_KEY)
    return suggestions
