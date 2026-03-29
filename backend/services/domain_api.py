"""
Domain.com.au API client for suburb performance and nearby listing data.

Requires a Domain API key (free tier: 500 calls/day).
Base URL: https://api.domain.com.au/v1
Auth header: X-Api-Key

All functions degrade gracefully — return None or [] on any error.
"""

from __future__ import annotations

import httpx
from typing import Optional

DOMAIN_BASE_URL = "https://api.domain.com.au/v1"


async def get_suburb_performance(
    suburb: str,
    state: str,
    postcode: str,
    property_category: str,
    api_key: Optional[str],
) -> Optional[dict]:
    """
    Fetch suburb performance statistics from the Domain API.

    Retrieves median price, days on market, auction clearance rate, and number
    of sales over a 3-year chronological span.

    Args:
        suburb: Suburb name (e.g. "Bondi").
        state: State abbreviation (e.g. "NSW").
        postcode: Postcode string (e.g. "2026").
        property_category: Either "house" or "unit".
        api_key: Domain API key; if None, returns None immediately.

    Returns:
        Raw JSON response dict from the Domain API, or None on any error.
    """
    if not api_key:
        return None

    url = f"{DOMAIN_BASE_URL}/suburbPerformance/residential/{state}/{suburb}/{postcode}"
    params = {
        "propertyCategory": property_category,
        "chronologicalSpan": 3,
    }
    headers = {"X-Api-Key": api_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return None


async def get_nearby_listings(
    lat: float,
    lng: float,
    listing_type: str,
    api_key: Optional[str],
) -> list[dict]:
    """
    Fetch nearby residential listings from the Domain API using a geo-circle search.

    Searches within a 1500m radius of the given coordinates, returning up to 20
    listings sorted by most recently updated.

    Args:
        lat: Latitude of the property.
        lng: Longitude of the property.
        listing_type: Either "Sale" or "Rent".
        api_key: Domain API key; if None, returns [] immediately.

    Returns:
        List of listing dicts from Domain, or [] on any error.
    """
    if not api_key:
        return []

    url = f"{DOMAIN_BASE_URL}/listings/residential/_search"
    headers = {
        "X-Api-Key": api_key,
        "Content-Type": "application/json",
    }
    body = {
        "geoWindow": {
            "circle": {
                "center": {"lat": lat, "lon": lng},
                "radiusInMeters": 1500,
            }
        },
        "listingType": listing_type,
        "pageSize": 20,
        "sort": {
            "sortKey": "DateUpdated",
            "direction": "Descending",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
    except Exception:
        return []


async def search_property_by_address(
    address: str,
    api_key: Optional[str],
) -> Optional[dict]:
    """
    Search Domain API for a specific property by address string.
    Tries current Sale listings first, then recently sold.
    Returns extracted property details dict or None if not found.
    """
    if not api_key:
        return None

    url = f"{DOMAIN_BASE_URL}/listings/residential/_search"
    headers = {"X-Api-Key": api_key, "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        for sale_mode in [None, "RecentlySold"]:
            body: dict = {
                "locations": [{"singleLine": address}],
                "listingType": "Sale",
                "pageSize": 5,
            }
            if sale_mode:
                body["saleMode"] = sale_mode
            try:
                resp = await client.post(url, json=body, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    return _extract_property_details(data[0])
            except Exception:
                continue
    return None


def _extract_property_details(listing_wrapper: dict) -> dict:
    """Extract clean autofill data from a Domain listing object."""
    listing = listing_wrapper.get("listing", listing_wrapper)
    details = listing.get("propertyDetails", {})
    pricing = listing.get("pricingDetails", {})
    media = listing.get("media", [])

    # Map Domain property type to app types
    domain_type = (details.get("propertyType") or "").lower()
    if any(t in domain_type for t in ["house", "terrace", "semi", "duplex"]):
        prop_type = "house"
    elif any(t in domain_type for t in ["townhouse", "villa", "row"]):
        prop_type = "townhouse"
    elif any(t in domain_type for t in ["apartment", "unit", "flat", "studio"]):
        prop_type = "unit"
    else:
        prop_type = "house"

    photos = [
        m.get("url") for m in media
        if m.get("category") == "Image" and m.get("url")
    ][:6]

    price = pricing.get("price") or pricing.get("from")
    listing_id = listing.get("id") or ""

    return {
        "found": True,
        "domain_listing_id": str(listing_id),
        "headline": listing.get("headline", ""),
        "property_type": prop_type,
        "bedrooms": details.get("bedrooms"),
        "bathrooms": details.get("bathrooms"),
        "parking": details.get("carspaces"),
        "land_size_sqm": details.get("landArea"),
        "building_area_sqm": details.get("buildingArea"),
        "year_built": details.get("yearBuilt"),
        "features": details.get("features") or [],
        "price": price,
        "display_price": pricing.get("displayPrice", ""),
        "photos": photos,
        "listing_url": f"https://www.domain.com.au/{listing_id}" if listing_id else "",
    }
