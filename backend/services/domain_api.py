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
