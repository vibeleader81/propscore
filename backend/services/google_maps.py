import math
import httpx
from typing import Optional
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Haversine helper
# ---------------------------------------------------------------------------

def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return the distance in metres between two WGS-84 coordinates."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------

async def geocode_address(address: str, api_key: str) -> dict:
    """
    Geocode an Australian address using the Google Geocoding API.

    Returns:
        {lat, lng, suburb, state, postcode}

    Raises:
        HTTPException(422) if address cannot be resolved to an AU result.
    """
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "components": "country:AU",
        "key": api_key,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") != "OK" or not data.get("results"):
        raise HTTPException(
            status_code=422,
            detail=f"Could not geocode address: {data.get('status', 'NO_RESULTS')}",
        )

    # Pick first AU result
    result: Optional[dict] = None
    for candidate in data["results"]:
        country_comp = next(
            (
                c
                for c in candidate.get("address_components", [])
                if "country" in c.get("types", [])
            ),
            None,
        )
        if country_comp and country_comp.get("short_name") == "AU":
            result = candidate
            break

    if result is None:
        raise HTTPException(status_code=422, detail="No Australian result found for this address.")

    location = result["geometry"]["location"]
    components = result.get("address_components", [])

    def _get_component(types: list[str]) -> str:
        for comp in components:
            if any(t in comp.get("types", []) for t in types):
                return comp.get("long_name", "")
        return ""

    suburb = _get_component(["locality", "sublocality", "neighborhood"])
    state = _get_component(["administrative_area_level_1"])
    postcode = _get_component(["postal_code"])

    # Map long state names to abbreviations
    state_map = {
        "Queensland": "QLD",
        "New South Wales": "NSW",
        "Victoria": "VIC",
        "Western Australia": "WA",
        "South Australia": "SA",
        "Tasmania": "TAS",
        "Australian Capital Territory": "ACT",
        "Northern Territory": "NT",
    }
    state = state_map.get(state, state)

    return {
        "lat": location["lat"],
        "lng": location["lng"],
        "suburb": suburb,
        "state": state,
        "postcode": postcode,
    }


# ---------------------------------------------------------------------------
# Nearby Search (Places API — legacy endpoint)
# ---------------------------------------------------------------------------

async def search_nearby(
    lat: float,
    lng: float,
    place_type: str,
    radius_m: int,
    api_key: str,
) -> list[dict]:
    """
    Search for nearby places using the Google Places Nearby Search (legacy) API.

    Args:
        place_type: Google place type string, e.g. "school", "transit_station", "park"
        radius_m:   Search radius in metres

    Returns:
        List of {name, distance_m, lat, lng} sorted by distance ascending.
    """
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius_m,
        "type": place_type,
        "key": api_key,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        # Non-fatal — return empty list but log the issue
        return []

    results = []
    for place in data.get("results", []):
        place_loc = place.get("geometry", {}).get("location", {})
        p_lat = place_loc.get("lat")
        p_lng = place_loc.get("lng")
        if p_lat is None or p_lng is None:
            continue
        dist = _haversine_m(lat, lng, p_lat, p_lng)
        results.append(
            {
                "name": place.get("name", "Unknown"),
                "distance_m": round(dist, 1),
                "lat": p_lat,
                "lng": p_lng,
            }
        )

    results.sort(key=lambda x: x["distance_m"])
    return results


# ---------------------------------------------------------------------------
# Autocomplete
# ---------------------------------------------------------------------------

async def autocomplete_address(query: str, api_key: str) -> list[dict]:
    """
    Return address autocomplete suggestions for Australian addresses.

    Returns:
        List of {description, place_id}
    """
    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    params = {
        "input": query,
        "components": "country:AU",
        "types": "address",
        "key": api_key,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        return []

    return [
        {
            "description": pred.get("description", ""),
            "place_id": pred.get("place_id", ""),
        }
        for pred in data.get("predictions", [])
    ]
