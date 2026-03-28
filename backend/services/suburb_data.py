import json
import math
import os
from functools import lru_cache
from typing import Optional


_DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "suburb_stats.json")


@lru_cache(maxsize=1)
def _load_data() -> dict:
    """Load and cache suburb stats JSON from disk."""
    with open(_DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return the distance in kilometres between two WGS-84 coordinates."""
    R = 6_371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_suburb_stats(suburb: str, state: str) -> Optional[dict]:
    """
    Retrieve suburb statistics by suburb name and state.

    Performs a case-insensitive match on the suburb and state fields.
    Returns the matching dict or None if not found.
    """
    data = _load_data()
    suburb_lower = suburb.strip().lower()
    state_upper = state.strip().upper()

    for entry in data.values():
        if (
            entry.get("suburb", "").lower() == suburb_lower
            and entry.get("state", "").upper() == state_upper
        ):
            return entry
    return None


def get_nearby_suburbs(
    lat: float,
    lng: float,
    max_distance_km: float = 25.0,
) -> list[dict]:
    """
    Return all suburbs within *max_distance_km* of (lat, lng),
    sorted by distance ascending, with a `distance_km` field injected.
    """
    data = _load_data()
    results: list[dict] = []

    for entry in data.values():
        s_lat = entry.get("lat")
        s_lng = entry.get("lng")
        if s_lat is None or s_lng is None:
            continue
        dist = _haversine_km(lat, lng, s_lat, s_lng)
        if dist <= max_distance_km:
            enriched = dict(entry)
            enriched["distance_km"] = round(dist, 2)
            results.append(enriched)

    results.sort(key=lambda x: x["distance_km"])
    return results
