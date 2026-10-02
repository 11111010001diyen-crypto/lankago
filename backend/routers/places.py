import json
import threading
import time
from collections import OrderedDict
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query, status

from ..config import NOMINATIM_USER_AGENT

router = APIRouter(prefix="/api/places", tags=["places"])
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
CACHE_TTL_SECONDS = 60 * 60
CACHE_MAX_ENTRIES = 100
_cache: OrderedDict[str, tuple[float, list]] = OrderedDict()
_lock = threading.Lock()
_last_upstream_request_at = 0.0


def _normalise_query(query: str) -> str:
    return " ".join(query.lower().split())


def _get_cached(query: str) -> list | None:
    cached = _cache.get(query)
    if not cached or time.monotonic() - cached[0] > CACHE_TTL_SECONDS:
        if cached:
            _cache.pop(query, None)
        return None
    _cache.move_to_end(query)
    return cached[1]


def _store_cached(query: str, results: list) -> None:
    _cache[query] = (time.monotonic(), results)
    _cache.move_to_end(query)
    while len(_cache) > CACHE_MAX_ENTRIES:
        _cache.popitem(last=False)


def search_nominatim(query: str) -> list:
    global _last_upstream_request_at
    normalised_query = _normalise_query(query)
    with _lock:
        cached = _get_cached(normalised_query)
        if cached is not None:
            return cached
        wait_seconds = 1 - (time.monotonic() - _last_upstream_request_at)
        if wait_seconds > 0:
            time.sleep(wait_seconds)
        parameters = urlencode({"format": "jsonv2", "addressdetails": "1", "countrycodes": "lk", "limit": "6", "q": query})
        request = Request(f"{NOMINATIM_SEARCH_URL}?{parameters}", headers={"User-Agent": NOMINATIM_USER_AGENT, "Accept": "application/json"})
        try:
            with urlopen(request, timeout=10) as response:
                results = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Place search provider is unavailable.") from error
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Place search provider is unavailable.") from error
        _last_upstream_request_at = time.monotonic()
        if not isinstance(results, list):
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Place search provider returned an invalid response.")
        _store_cached(normalised_query, results)
        return results


@router.get("/search")
def search_places(q: str = Query(min_length=3, max_length=180)):
    query = q.strip()
    if len(query) < 3:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter at least 3 characters to search for a place.")
    return search_nominatim(query)