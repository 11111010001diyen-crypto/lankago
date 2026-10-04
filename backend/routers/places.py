import json
import threading
import time
from collections import OrderedDict
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query, status

from ..config import NOMINATIM_USER_AGENT
from ..services import place_index

router = APIRouter(prefix="/api/places", tags=["places"])
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
CACHE_TTL_SECONDS = 60 * 60
CACHE_MAX_ENTRIES = 100
SRI_LANKA_BOUNDS = {"south": 5.85, "north": 9.95, "west": 79.45, "east": 82.05}
_cache: OrderedDict[str, tuple[float, object]] = OrderedDict()
_lock = threading.Lock()
_last_upstream_request_at = 0.0


def _normalise_query(query: str) -> str:
    return " ".join(query.casefold().split())


def _get_cached(key: str):
    cached = _cache.get(key)
    if not cached or time.monotonic() - cached[0] > CACHE_TTL_SECONDS:
        if cached:
            _cache.pop(key, None)
        return None
    _cache.move_to_end(key)
    return cached[1]


def _store_cached(key: str, result) -> None:
    _cache[key] = (time.monotonic(), result)
    _cache.move_to_end(key)
    while len(_cache) > CACHE_MAX_ENTRIES:
        _cache.popitem(last=False)


def _nominatim_request(url: str, parameters: dict, cache_key: str):
    global _last_upstream_request_at
    with _lock:
        cached = _get_cached(cache_key)
        if cached is not None:
            return cached
        wait_seconds = 1 - (time.monotonic() - _last_upstream_request_at)
        if wait_seconds > 0:
            time.sleep(wait_seconds)
        request = Request(f"{url}?{urlencode(parameters)}", headers={"User-Agent": NOMINATIM_USER_AGENT, "Accept": "application/json"})
        try:
            with urlopen(request, timeout=10) as response:
                result = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Place search provider is unavailable.") from error
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Place search provider is unavailable.") from error
        _last_upstream_request_at = time.monotonic()
        _store_cached(cache_key, result)
        return result


def _format_nominatim_place(result: dict) -> dict | None:
    address = result.get("address") or {}
    name = result.get("name") or (result.get("display_name") or "").split(",")[0].strip()
    try:
        latitude, longitude = float(result["lat"]), float(result["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    if not name:
        return None
    district = address.get("state_district") or address.get("county") or ""
    province = address.get("state") or address.get("province") or ""
    area = address.get("suburb") or address.get("city_district") or address.get("city") or address.get("town") or address.get("village") or district or "Sri Lanka"
    return {"id": f"nominatim/{result.get('osm_type', '')}/{result.get('osm_id', '')}", "name": name, "area": area, "district": district, "province": province, "type": result.get("type") or result.get("class") or "landmark", "latitude": latitude, "longitude": longitude, "fullAddress": result.get("display_name") or name, "matchedText": ""}


def search_nominatim(query: str) -> list[dict]:
    results = _nominatim_request(NOMINATIM_SEARCH_URL, {"format": "jsonv2", "addressdetails": "1", "countrycodes": "lk", "limit": "8", "q": query}, f"search:{_normalise_query(query)}")
    if not isinstance(results, list):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Place search provider returned an invalid response.")
    return results


def search_places_with_fallback(query: str) -> list[dict]:
    local_results = place_index.search_local(query)
    if local_results:
        return local_results
    upstream_results = search_nominatim(query)
    formatted = [place for result in upstream_results if isinstance(result, dict) and (place := _format_nominatim_place(result))]
    if formatted:
        return formatted[:8]
    area = place_index.nearest_matching_area(query)
    variants = place_index.spelling_variants(query)
    variant = variants[1] if len(variants) > 1 else query
    retry_query = f"{variant}, {area['name']}, {area['district']}" if area and area.get("district") else variant
    retry_results = search_nominatim(retry_query)
    formatted = [place for result in retry_results if isinstance(result, dict) and (place := _format_nominatim_place(result))]
    if formatted:
        return formatted[:8]
    return []


def _inside_sri_lanka(latitude: float, longitude: float) -> bool:
    return SRI_LANKA_BOUNDS["south"] <= latitude <= SRI_LANKA_BOUNDS["north"] and SRI_LANKA_BOUNDS["west"] <= longitude <= SRI_LANKA_BOUNDS["east"]


def reverse_nominatim(latitude: float, longitude: float) -> dict:
    if not _inside_sri_lanka(latitude, longitude):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose a point inside Sri Lanka.")
    result = _nominatim_request(NOMINATIM_REVERSE_URL, {"format": "jsonv2", "addressdetails": "1", "lat": f"{latitude:.7f}", "lon": f"{longitude:.7f}", "zoom": "18"}, f"reverse:{latitude:.5f}:{longitude:.5f}")
    if not isinstance(result, dict):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Place search provider returned an invalid response.")
    address = result.get("address") or {}
    area = address.get("suburb") or address.get("city_district") or address.get("city") or address.get("town") or address.get("village") or "Sri Lanka"
    district = address.get("state_district") or address.get("county") or ""
    province = address.get("state") or address.get("province") or ""
    landmark = result.get("name") or address.get("road") or address.get("neighbourhood") or area
    name = f"Near {landmark}" if landmark and landmark != area else f"Near {area}"
    full_address = result.get("display_name") or " · ".join(part for part in (name, area, district, province) if part)
    return {"id": f"picked/{latitude:.6f}/{longitude:.6f}", "name": name, "area": area, "district": district, "province": province, "type": "picked_pin", "latitude": latitude, "longitude": longitude, "fullAddress": full_address, "matchedText": ""}


@router.get("/search")
def search_places(q: str = Query(min_length=3, max_length=180)):
    query = q.strip()
    if len(query) < 3:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter at least 3 characters to search for a place.")
    return search_places_with_fallback(query)


@router.get("/reverse")
def reverse_place(lat: float = Query(), lon: float = Query()):
    return reverse_nominatim(lat, lon)