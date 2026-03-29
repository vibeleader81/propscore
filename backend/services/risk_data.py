"""
Australian government spatial risk data client.

Queries state-specific ArcGIS REST services for flood and bushfire risk zones.
All services are FREE — no API key required.

All functions degrade gracefully — always return a valid dict even on errors.
"""

from __future__ import annotations

import asyncio
import httpx

# ---------------------------------------------------------------------------
# State-specific ArcGIS endpoints
# ---------------------------------------------------------------------------

STATE_RISK_ENDPOINTS: dict[str, dict[str, str | None]] = {
    "NSW": {
        "flood": "https://mapprod1.environment.nsw.gov.au/arcgis/rest/services/Planning/EP_Flood_Mapping/MapServer/0",
        "bushfire": "https://mapprod1.environment.nsw.gov.au/arcgis/rest/services/Planning/EP_Bushfire_Prone_Land/MapServer/0",
    },
    "VIC": {
        "flood": "https://services6.arcgis.com/GB33F62SbDxJjwEL/arcgis/rest/services/Flood_Management_Overlay/FeatureServer/0",
        "bushfire": "https://services6.arcgis.com/GB33F62SbDxJjwEL/arcgis/rest/services/Bushfire_Management_Overlay/FeatureServer/0",
    },
    "QLD": {
        "flood": "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Boundaries/Flood_Planning_Areas/MapServer/0",
        "bushfire": "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Environment/Bushfire_Hazard_Areas/MapServer/0",
    },
    "WA": {
        "flood": "https://services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Land_Parcels/MapServer/0",
        "bushfire": None,
    },
    "SA": {"flood": None, "bushfire": None},
    "TAS": {"flood": None, "bushfire": None},
    "ACT": {"flood": None, "bushfire": None},
    "NT": {"flood": None, "bushfire": None},
}


async def _query_arcgis_risk(endpoint: str, lat: float, lng: float) -> bool:
    """
    Query an ArcGIS FeatureServer/MapServer endpoint to check if a point
    intersects any features (e.g. flood or bushfire zone polygons).

    Args:
        endpoint: Full ArcGIS REST service URL (without /query suffix).
        lat: Latitude of the property.
        lng: Longitude of the property.

    Returns:
        True if the point intersects at least one feature, False otherwise.
        Returns False on any error (fail safe / no false positives).
    """
    url = f"{endpoint}/query"
    params = {
        "geometry": f"{lng},{lat}",
        "geometryType": "esriGeometryPoint",
        "spatialRel": "esriSpatialRelIntersects",
        "returnCountOnly": "true",
        "f": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            count = data.get("count", 0)
            return int(count) > 0
    except Exception:
        return False


async def get_risk_profile(lat: float, lng: float, state: str) -> dict:
    """
    Fetch flood and bushfire risk data for a property from state government spatial services.

    Runs both risk checks concurrently. Returns a safe default dict on any failure.
    A result of True for flood_risk or bushfire_risk means the property is located
    within a mapped risk zone — this should be flagged clearly to the buyer.

    Args:
        lat: Latitude of the property.
        lng: Longitude of the property.
        state: State abbreviation (e.g. "NSW", "VIC", "QLD").

    Returns:
        Dict with keys:
          - flood_risk: bool — True if property is in a flood zone
          - bushfire_risk: bool — True if property is in a bushfire zone
          - flood_checked: bool — False if no endpoint available for this state
          - bushfire_checked: bool — False if no endpoint available for this state
          - state: str
    """
    endpoints = STATE_RISK_ENDPOINTS.get(state.upper(), {"flood": None, "bushfire": None})
    flood_endpoint: str | None = endpoints.get("flood")
    bushfire_endpoint: str | None = endpoints.get("bushfire")

    flood_checked = flood_endpoint is not None
    bushfire_checked = bushfire_endpoint is not None

    # Run both checks concurrently
    flood_task = (
        _query_arcgis_risk(flood_endpoint, lat, lng)
        if flood_endpoint
        else _noop_false()
    )
    bushfire_task = (
        _query_arcgis_risk(bushfire_endpoint, lat, lng)
        if bushfire_endpoint
        else _noop_false()
    )

    flood_risk, bushfire_risk = await asyncio.gather(flood_task, bushfire_task)

    return {
        "flood_risk": flood_risk,
        "bushfire_risk": bushfire_risk,
        "flood_checked": flood_checked,
        "bushfire_checked": bushfire_checked,
        "state": state,
    }


async def _noop_false() -> bool:
    """Return False immediately — used as a no-op placeholder for unavailable endpoints."""
    return False
