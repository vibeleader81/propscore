"""
OpenStreetMap Overpass API client for fetching nearby amenity counts.

No API key required. Queries the public Overpass API endpoint.
All functions degrade gracefully — never raise exceptions.
"""

from __future__ import annotations

import httpx
from typing import Optional

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
RADIUS_M = 1500

# Mapping from category name to the amenity/shop/leisure tags queried
_CATEGORY_TAGS: dict[str, list[tuple[str, str]]] = {
    "food_drink": [
        ("amenity", "cafe"),
        ("amenity", "restaurant"),
        ("amenity", "fast_food"),
        ("amenity", "pub"),
        ("amenity", "bar"),
    ],
    "supermarkets": [
        ("shop", "supermarket"),
        ("shop", "convenience"),
    ],
    "healthcare": [
        ("amenity", "hospital"),
        ("amenity", "clinic"),
        ("amenity", "pharmacy"),
        ("amenity", "doctors"),
        ("amenity", "dentist"),
    ],
    "childcare_education": [
        ("amenity", "kindergarten"),
        ("amenity", "childcare"),
        ("leisure", "playground"),
    ],
    "fitness": [
        ("leisure", "gym"),
        ("leisure", "sports_centre"),
        ("leisure", "swimming_pool"),
        ("leisure", "fitness_centre"),
    ],
    "shopping": [
        ("shop", "mall"),
        ("shop", "department_store"),
        ("shop", "clothes"),
        ("shop", "hairdresser"),
    ],
}

# Special radius overrides for certain tags
_RADIUS_OVERRIDES: dict[tuple[str, str], int] = {
    ("leisure", "playground"): 800,
    ("shop", "convenience"): 1000,
}


def _build_overpass_query(lat: float, lng: float) -> str:
    """Build the Overpass QL query string for all amenity categories."""
    lines: list[str] = [
        f"[out:json][timeout:20];",
        "(",
    ]
    for _category, tags in _CATEGORY_TAGS.items():
        for key, value in tags:
            radius = _RADIUS_OVERRIDES.get((key, value), RADIUS_M)
            lines.append(f'  node["{key}"="{value}"](around:{radius},{lat},{lng});')
    lines.append(");")
    lines.append("out tags;")
    return "\n".join(lines)


def _classify_element(tags: dict) -> Optional[str]:
    """Return the category name for an OSM element based on its tags."""
    for category, tag_list in _CATEGORY_TAGS.items():
        for key, value in tag_list:
            if tags.get(key) == value:
                return category
    return None


async def get_walkability_data(lat: float, lng: float) -> dict:
    """
    Fetch counts of nearby amenities within ~1500m using the OpenStreetMap Overpass API.

    Queries cafes, restaurants, supermarkets, healthcare facilities, childcare,
    fitness venues, and shopping in parallel categories.

    Args:
        lat: Latitude of the property.
        lng: Longitude of the property.

    Returns:
        Dict with keys:
          - counts: dict[str, int] per category
          - total: int total amenity count
          - radius_m: int radius used
          - raw_amenities: list[dict] first 10 amenities with name/type
    """
    empty_result = {
        "counts": {cat: 0 for cat in _CATEGORY_TAGS},
        "total": 0,
        "radius_m": RADIUS_M,
        "raw_amenities": [],
    }

    try:
        query = _build_overpass_query(lat, lng)
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            resp.raise_for_status()
            data = resp.json()

        elements: list[dict] = data.get("elements", [])

        counts: dict[str, int] = {cat: 0 for cat in _CATEGORY_TAGS}
        raw_amenities: list[dict] = []

        for element in elements:
            tags = element.get("tags", {})
            category = _classify_element(tags)
            if category:
                counts[category] += 1
                if len(raw_amenities) < 10:
                    raw_amenities.append({
                        "name": tags.get("name", "Unknown"),
                        "type": category,
                    })

        total = sum(counts.values())

        return {
            "counts": counts,
            "total": total,
            "radius_m": RADIUS_M,
            "raw_amenities": raw_amenities,
        }

    except Exception:
        return empty_result
