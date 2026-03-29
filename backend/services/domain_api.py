"""
Domain.com.au API client.

Two authentication modes:
  1. OAuth2 client credentials (DOMAIN_CLIENT_ID + DOMAIN_CLIENT_SECRET)
     Uses the properties/_suggest → /properties/{id} flow.
     Works for any property — not just currently listed ones.
     Token is cached in-process and reused until near expiry.

  2. Legacy X-Api-Key (DOMAIN_API_KEY)
     Used for suburb performance stats and as a fallback for property lookup.
     Only finds properties currently listed for sale / recently sold.

All functions degrade gracefully — return None or [] on any error.
"""

from __future__ import annotations

import asyncio
import re
import time
from typing import Optional

import httpx

DOMAIN_BASE_URL = "https://api.domain.com.au/v1"
DOMAIN_AUTH_URL = "https://auth.domain.com.au/v1/connect/token"

# ---------------------------------------------------------------------------
# OAuth2 token cache (module-level, shared across requests)
# ---------------------------------------------------------------------------

_token_cache: dict = {"token": None, "expires_at": 0.0}


async def _get_oauth_token(client_id: str, client_secret: str) -> str:
    """
    Fetch an OAuth2 access token using client credentials flow.
    Caches the token and reuses it until 60 seconds before expiry.
    Raises on auth failure — callers should not swallow this.
    """
    now = time.time()
    if _token_cache["token"] and _token_cache["expires_at"] - now > 60:
        return _token_cache["token"]  # type: ignore[return-value]

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            DOMAIN_AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
                "scope": "api_listings_read api_properties_read",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if not resp.is_success:
            raise RuntimeError(
                f"Domain OAuth2 authentication failed: {resp.status_code} — {resp.text}"
            )
        data = resp.json()
        _token_cache["token"] = data["access_token"]
        _token_cache["expires_at"] = now + data["expires_in"]
        return _token_cache["token"]  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# OAuth2-based property lookup
# ---------------------------------------------------------------------------

async def _suggest_property_id(address: str, token: str) -> Optional[str]:
    """Resolve an address string to a Domain propertyId via the suggest endpoint."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{DOMAIN_BASE_URL}/properties/_suggest",
                params={"terms": address, "channel": "All"},
                headers={"Authorization": f"Bearer {token}"},
            )
            if not resp.is_success:
                return None
            results = resp.json()
            if not isinstance(results, list) or not results:
                return None
            best = max(results, key=lambda x: x.get("relativeScore", 0))
            if best.get("relativeScore", 0) < 50:
                return None
            return best.get("id")
    except Exception:
        return None


async def _fetch_property_details(property_id: str, token: str) -> Optional[dict]:
    """Fetch full property details for a known propertyId."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{DOMAIN_BASE_URL}/properties/{property_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            return resp.json() if resp.is_success else None
    except Exception:
        return None


async def _fetch_price_details(property_id: str, token: str) -> Optional[dict]:
    """
    Fetch price history and AVM estimate.
    Returns None gracefully on 403 (free tier restriction) or any other error.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{DOMAIN_BASE_URL}/properties/{property_id}/priceDetails",
                headers={"Authorization": f"Bearer {token}"},
            )
            return resp.json() if resp.is_success else None
    except Exception:
        return None


def _map_property_type(raw_type: str) -> str:
    t = raw_type.lower()
    if any(k in t for k in ["house", "terrace", "semi", "duplex", "cottage"]):
        return "house"
    if any(k in t for k in ["townhouse", "villa", "row"]):
        return "townhouse"
    if any(k in t for k in ["apartment", "unit", "flat", "studio"]):
        return "unit"
    return "house"


def _build_lookup_result(property_id: str, details: Optional[dict], price: Optional[dict]) -> dict:
    result: dict = {"found": True, "property_id": property_id}

    if details:
        addr = details.get("address") or {}
        street = " ".join(filter(None, [addr.get("streetNumber"), addr.get("streetName"), addr.get("streetType")]))
        full_address = ", ".join(filter(None, [street, addr.get("suburb"), f"{addr.get('state', '')} {addr.get('postcode', '')}".strip()]))

        photos: list[str] = []
        for p in (details.get("photos") or [])[:3]:
            url = p.get("url") or p.get("fullUrl") or p.get("thumbnailUrl")
            if url:
                photos.append(url)

        result.update({
            "headline": full_address,
            "property_type": _map_property_type(details.get("propertyType") or ""),
            "bedrooms": details.get("bedrooms"),
            "bathrooms": details.get("bathrooms"),
            "parking": details.get("carSpaces") or details.get("carspaces"),
            "land_size_sqm": details.get("landArea"),
            "building_area_sqm": details.get("buildingArea"),
            "year_built": details.get("yearBuilt"),
            "features": details.get("features") or [],
            "photos": photos,
            "listing_url": f"https://www.domain.com.au/{property_id}",
        })

    if price:
        est = price.get("estimatedValue") or (price.get("avm") or {}).get("value")
        est_low = price.get("estimatedValueLow") or (price.get("avm") or {}).get("low")
        est_high = price.get("estimatedValueHigh") or (price.get("avm") or {}).get("high")

        # Derive last sold from dedicated fields or price history
        last_sold_price = price.get("lastSoldPrice")
        last_sold_date = price.get("lastSoldDate")
        history = price.get("priceHistory") or []
        if not last_sold_price:
            sales = [h for h in history if h.get("type") == "Sale"]
            if sales:
                last_sold_price = sales[0].get("price")
                last_sold_date = sales[0].get("date")

        result.update({
            "price": est,
            "display_price": f"Est. ${est:,.0f}" if est else None,
            "estimated_value_low": est_low,
            "estimated_value_high": est_high,
            "last_sold_price": last_sold_price,
            "last_sold_date": last_sold_date,
        })

    return result


async def lookup_property_by_address(
    address: str,
    client_id: str,
    client_secret: str,
) -> Optional[dict]:
    """
    OAuth2-based property lookup.
    Works for any Australian property — not just active listings.
    Raises RuntimeError if authentication fails (caller should surface this).
    Returns None if address cannot be resolved to a Domain propertyId.
    """
    token = await _get_oauth_token(client_id, client_secret)

    property_id = await _suggest_property_id(address, token)
    if not property_id:
        return None

    details, price = await asyncio.gather(
        _fetch_property_details(property_id, token),
        _fetch_price_details(property_id, token),
    )

    return _build_lookup_result(property_id, details, price)


# ---------------------------------------------------------------------------
# Comparable listings search (OAuth2 Bearer)
# ---------------------------------------------------------------------------

_DOMAIN_TYPE_MAP: dict[str, list[str]] = {
    "house":     ["House", "Terrace", "SemiDetached", "Duplex"],
    "townhouse": ["Townhouse", "Villa"],
    "apartment": ["ApartmentUnitFlat", "Studio"],
    "unit":      ["ApartmentUnitFlat", "Studio"],
}


async def _search_comparable_listings(
    lat: float,
    lng: float,
    property_type: str,
    bedrooms: int,
    token: str,
) -> list[dict]:
    """
    Find up to 5 recently sold properties within 2km with similar beds/type.
    Uses OAuth2 Bearer token (api_listings_read scope).
    """
    domain_types = _DOMAIN_TYPE_MAP.get(property_type.lower(), ["House"])
    body = {
        "geoWindow": {
            "circle": {
                "center": {"lat": lat, "lon": lng},
                "radiusInMeters": 2000,
            }
        },
        "propertyTypes": domain_types,
        "bedrooms": {"minimum": max(1, bedrooms - 1), "maximum": bedrooms + 1},
        "listingType": "Sale",
        "saleMode": "RecentlySold",
        "pageSize": 5,
        "sort": {"sortKey": "DateUpdated", "direction": "Descending"},
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{DOMAIN_BASE_URL}/listings/residential/_search",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            if not resp.is_success:
                return []
            data = resp.json()
            return data if isinstance(data, list) else []
    except Exception:
        return []


def _parse_comp(wrapper: dict) -> Optional[dict]:
    listing = wrapper.get("listing", wrapper)
    details = listing.get("propertyDetails", {})
    pricing = listing.get("pricingDetails", {})

    price = (
        pricing.get("price")
        or pricing.get("soldPrice")
        or pricing.get("from")
    )
    date = pricing.get("soldDate") or pricing.get("lastUpdatedDateTime", "")[:10]
    address = (
        details.get("displayableAddress")
        or f"{details.get('streetAddress', '')} {details.get('suburb', '')}".strip()
    )

    if not price or not address:
        return None

    return {
        "address": address,
        "price": int(price),
        "sold_date": date,
        "bedrooms": details.get("bedrooms"),
        "bathrooms": details.get("bathrooms"),
        "carspaces": details.get("carspaces"),
        "land_area": details.get("landArea"),
        "property_type": details.get("propertyType", ""),
    }


# ---------------------------------------------------------------------------
# Main intelligence orchestrator
# ---------------------------------------------------------------------------

async def get_property_intelligence(
    address: str,
    lat: float,
    lng: float,
    property_type: str,
    bedrooms: int,
    client_id: str,
    client_secret: str,
) -> Optional[dict]:
    """
    Run all 4 Domain OAuth2 calls in optimal parallel order and return a
    combined intelligence dict for feeding into the AI analysis prompt.

    Steps:
      1. _suggest → propertyId
      2. /properties/{id}           ┐ parallel
      3. /properties/{id}/priceDetails ┘
      4. /listings/_search (comps, recently sold, within 2km)

    Returns None on any fatal error (auth failure, network outage).
    Individual step failures are noted in result["warnings"].
    """
    warnings: list[str] = []
    try:
        token = await _get_oauth_token(client_id, client_secret)
    except Exception as exc:
        # Auth failure — nothing we can do, bail out silently
        return None

    property_id = await _suggest_property_id(address, token)
    if not property_id:
        warnings.append("Address could not be resolved to a Domain propertyId.")
        # Still try comps even if we can't get the specific property record
        comps_raw = await _search_comparable_listings(lat, lng, property_type, bedrooms, token)
        comps = [c for c in (_parse_comp(w) for w in comps_raw) if c]
        return {
            "property_id": None,
            "domain_details": None,
            "price_history": [],
            "estimated_value": None,
            "comparable_sales": comps,
            "warnings": warnings,
        }

    # Fetch property record, price history, and comps in parallel
    details_raw, price_raw, comps_raw = await asyncio.gather(
        _fetch_property_details(property_id, token),
        _fetch_price_details(property_id, token),
        _search_comparable_listings(lat, lng, property_type, bedrooms, token),
    )

    # --- Parse property details ---
    domain_details: Optional[dict] = None
    if details_raw:
        addr = details_raw.get("address") or {}
        domain_details = {
            "bedrooms":      details_raw.get("bedrooms"),
            "bathrooms":     details_raw.get("bathrooms"),
            "carspaces":     details_raw.get("carSpaces") or details_raw.get("carspaces"),
            "land_area":     details_raw.get("landArea"),
            "building_area": details_raw.get("buildingArea"),
            "year_built":    details_raw.get("yearBuilt"),
            "property_type": details_raw.get("propertyType"),
            "suburb":        addr.get("suburb"),
            "state":         addr.get("state"),
            "features":      details_raw.get("features") or [],
        }
    else:
        warnings.append("Property details unavailable from Domain.")

    # --- Parse price history ---
    price_history: list[dict] = []
    estimated_value: Optional[dict] = None
    if price_raw:
        for entry in (price_raw.get("priceHistory") or []):
            price_history.append({
                "date":  entry.get("date", ""),
                "price": entry.get("price"),
                "type":  entry.get("type", "Sale"),
            })
        # AVM estimate (may be None on free tier)
        avm = price_raw.get("avm") or {}
        est = price_raw.get("estimatedValue") or avm.get("value")
        if est:
            estimated_value = {
                "value": est,
                "low":   price_raw.get("estimatedValueLow") or avm.get("low"),
                "high":  price_raw.get("estimatedValueHigh") or avm.get("high"),
            }
    else:
        warnings.append("Price history unavailable from Domain (may require paid tier).")

    # --- Parse comparable sales ---
    comps = [c for c in (_parse_comp(w) for w in comps_raw) if c]
    if not comps:
        warnings.append("No comparable recent sales found within 2km.")

    return {
        "property_id":    property_id,
        "domain_details": domain_details,
        "price_history":  price_history,
        "estimated_value": estimated_value,
        "comparable_sales": comps,
        "warnings":       warnings,
    }


# ---------------------------------------------------------------------------
# Alternative listings search (OAuth2 Bearer — active For Sale listings)
# ---------------------------------------------------------------------------


async def _search_for_sale_listings(
    lat: float,
    lng: float,
    property_type: str,
    bedrooms: int,
    max_price: float,
    token: str,
    radius_m: int = 20000,
    page_size: int = 8,
) -> list[dict]:
    """Find active for-sale listings within radius with similar specs."""
    domain_types = _DOMAIN_TYPE_MAP.get(property_type.lower(), ["House"])
    body = {
        "geoWindow": {
            "circle": {
                "center": {"lat": lat, "lon": lng},
                "radiusInMeters": radius_m,
            }
        },
        "propertyTypes": domain_types,
        "bedrooms": {"minimum": max(1, bedrooms - 1), "maximum": bedrooms + 1},
        "listingType": "Sale",
        "price": {"maximum": int(max_price)},
        "pageSize": page_size,
        "sort": {"sortKey": "DateUpdated", "direction": "Descending"},
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{DOMAIN_BASE_URL}/listings/residential/_search",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            if not resp.is_success:
                return []
            data = resp.json()
            return data if isinstance(data, list) else []
    except Exception:
        return []


def _parse_listing(wrapper: dict) -> Optional[dict]:
    listing = wrapper.get("listing", wrapper)
    details = listing.get("propertyDetails", {})
    pricing = listing.get("pricingDetails", {})
    media = listing.get("media", [])

    address = (
        details.get("displayableAddress")
        or f"{details.get('streetAddress', '')} {details.get('suburb', '')}".strip()
    )
    listing_id = listing.get("id")
    if not address or not listing_id:
        return None

    price = pricing.get("price") or pricing.get("from")
    photos = [
        m.get("url") for m in media
        if m.get("category") == "Image" and m.get("url")
    ][:3]

    return {
        "listing_id": str(listing_id),
        "address": address,
        "suburb": details.get("suburb", ""),
        "state": details.get("state", ""),
        "postcode": details.get("postcode", ""),
        "price": int(price) if price else None,
        "display_price": pricing.get("displayPrice", ""),
        "bedrooms": details.get("bedrooms"),
        "bathrooms": details.get("bathrooms"),
        "parking": details.get("carspaces"),
        "land_size_sqm": details.get("landArea"),
        "property_type": _map_property_type(details.get("propertyType") or ""),
        "photos": photos,
        "listing_url": f"https://www.domain.com.au/{listing_id}",
        "headline": listing.get("headline", ""),
    }


async def get_alternative_listings(
    lat: float,
    lng: float,
    property_type: str,
    bedrooms: int,
    price: float,
    client_id: str,
    client_secret: str,
) -> list[dict]:
    """
    Search Domain for active for-sale listings as alternatives to the assessed property.
    Returns [] gracefully on any error.
    """
    try:
        token = await _get_oauth_token(client_id, client_secret)
    except Exception:
        return []

    raw = await _search_for_sale_listings(
        lat, lng, property_type, bedrooms, price * 1.15, token
    )
    listings = [p for p in (_parse_listing(w) for w in raw) if p]
    return listings[:5]


# ---------------------------------------------------------------------------
# Listing URL → rich listing content (for AI context enrichment)
# ---------------------------------------------------------------------------

def extract_listing_id_from_url(url: str) -> Optional[str]:
    """
    Extract a Domain listing ID from a Domain.com.au listing URL.

    Supports formats:
      https://www.domain.com.au/1-example-st-suburb-nsw-2000-2016839485
      https://www.domain.com.au/property-profile/...   (no listing ID — returns None)
      https://domain.com.au/....-2016839485?...

    Returns the numeric listing ID string, or None if not found.
    """
    # Strip query string and trailing slashes
    clean = url.split("?")[0].rstrip("/")
    # Listing IDs are 7–12 digit numbers at the end of the path segment
    match = re.search(r"-(\d{7,12})$", clean)
    return match.group(1) if match else None


async def fetch_listing_content(
    listing_id: str,
    client_id: str,
    client_secret: str,
) -> Optional[dict]:
    """
    Fetch the full Domain listing record for a known listing ID.

    Returns a dict with:
      - headline, tagline, description (agent marketing copy)
      - features list
      - land_area, building_area
      - property_type, bedrooms, bathrooms, parking
      - listing_url

    Returns None gracefully on any error.
    """
    try:
        token = await _get_oauth_token(client_id, client_secret)
    except Exception:
        return None

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(
                f"{DOMAIN_BASE_URL}/listings/{listing_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if not resp.is_success:
                return None
            data = resp.json()
    except Exception:
        return None

    prop = data.get("propertyDetails") or data.get("property") or data
    pricing = data.get("priceDetails") or data.get("pricingDetails") or {}
    land = data.get("landDetails") or {}
    building = data.get("buildingDetails") or {}

    # Description is the most valuable field — it's the agent's full marketing text
    description: str = (
        data.get("description")
        or data.get("summary")
        or ""
    ).strip()

    features: list[str] = (
        data.get("features")
        or prop.get("features")
        or []
    )

    return {
        "listing_id":    listing_id,
        "headline":      data.get("headline") or prop.get("displayableAddress", ""),
        "tagline":       data.get("tagline") or "",
        "description":   description,
        "features":      features,
        "land_area":     land.get("area") or prop.get("landArea"),
        "building_area": building.get("area") or prop.get("buildingArea"),
        "property_type": _map_property_type(prop.get("propertyType") or ""),
        "bedrooms":      prop.get("bedrooms"),
        "bathrooms":     prop.get("bathrooms"),
        "parking":       prop.get("carspaces"),
        "display_price": pricing.get("displayPrice") or "",
        "listing_url":   f"https://www.domain.com.au/{listing_id}",
    }


# ---------------------------------------------------------------------------
# Legacy X-Api-Key functions (suburb stats + fallback listing search)
# ---------------------------------------------------------------------------

async def get_suburb_performance(
    suburb: str,
    state: str,
    postcode: str,
    property_category: str,
    api_key: Optional[str],
) -> Optional[dict]:
    """
    Fetch suburb performance statistics from the Domain API (X-Api-Key auth).
    Returns median price, days on market, auction clearance rate over 3 years.
    """
    if not api_key:
        return None

    url = f"{DOMAIN_BASE_URL}/suburbPerformance/residential/{state}/{suburb}/{postcode}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                url,
                params={"propertyCategory": property_category, "chronologicalSpan": 3},
                headers={"X-Api-Key": api_key},
            )
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
    Fetch nearby residential listings via geo-circle search (X-Api-Key auth).
    1500m radius, up to 20 results, sorted by most recently updated.
    """
    if not api_key:
        return []

    body = {
        "geoWindow": {"circle": {"center": {"lat": lat, "lon": lng}, "radiusInMeters": 1500}},
        "listingType": listing_type,
        "pageSize": 20,
        "sort": {"sortKey": "DateUpdated", "direction": "Descending"},
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{DOMAIN_BASE_URL}/listings/residential/_search",
                json=body,
                headers={"X-Api-Key": api_key, "Content-Type": "application/json"},
            )
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
    Listing-based property search (X-Api-Key auth).
    Fallback when OAuth2 credentials are not configured.
    Only finds properties currently listed for sale or recently sold.
    """
    if not api_key:
        return None

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
                resp = await client.post(
                    f"{DOMAIN_BASE_URL}/listings/residential/_search",
                    json=body,
                    headers=headers,
                )
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    return _extract_listing_details(data[0])
            except Exception:
                continue
    return None


def _extract_listing_details(listing_wrapper: dict) -> dict:
    """Extract autofill data from a Domain listing object (legacy path)."""
    listing = listing_wrapper.get("listing", listing_wrapper)
    details = listing.get("propertyDetails", {})
    pricing = listing.get("pricingDetails", {})
    media = listing.get("media", [])

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
        "property_type": _map_property_type(details.get("propertyType") or ""),
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
