"""Build LankaGo's nationwide Sri Lanka OSM place index with resume support.

Run manually from the repository root:
    python scripts/build_sri_lanka_places.py

The final JSON indexes are written only after all 25 districts have completed.
Successful district responses are retained in scripts/.overpass_cache/ so a
failed run can be resumed without downloading successful districts again.
"""

from __future__ import annotations

import gzip
import json
import math
import os
import time
from collections import Counter
from pathlib import Path
from socket import timeout as SocketTimeout
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIRECTORY = ROOT / "scripts" / ".overpass_cache"
OVERPASS_MIRRORS = (
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)
RETRY_WAITS_SECONDS = (15, 30, 60, 120, 180)
PAUSE_SECONDS = 4
REQUEST_TIMEOUT_SECONDS = 240
RETRYABLE_HTTP_STATUS_CODES = {429, 502, 503, 504}
PLACE_TYPES = ("city", "town", "suburb", "quarter", "neighbourhood", "village", "hamlet")
COMPACT_PLACE_TYPES = ("city", "town", "suburb", "quarter")
RURAL_PLACE_TYPES = ("neighbourhood", "village", "hamlet")
FRONTEND_TYPES = set(PLACE_TYPES)
LARGE_DISTRICTS = {"Colombo", "Gampaha", "Kandy", "Kurunegala"}

DISTRICTS = {
    "Western Province": ("Colombo", "Gampaha", "Kalutara"),
    "Central Province": ("Kandy", "Matale", "Nuwara Eliya"),
    "Southern Province": ("Galle", "Matara", "Hambantota"),
    "Northern Province": ("Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu"),
    "Eastern Province": ("Batticaloa", "Ampara", "Trincomalee"),
    "North Western Province": ("Kurunegala", "Puttalam"),
    "North Central Province": ("Anuradhapura", "Polonnaruwa"),
    "Uva Province": ("Badulla", "Monaragala"),
    "Sabaragamuwa Province": ("Ratnapura", "Kegalle"),
}
DISTRICT_TO_PROVINCE = {district: province for province, districts in DISTRICTS.items() for district in districts}
OSM_DISTRICT_NAMES = {district: f"{district} District" for district in DISTRICT_TO_PROVINCE}
OSM_DISTRICT_NAMES["Kurunegala"] = "Kurunǣgala"

COLOMBO_POSTAL_ALIASES = {
    "Fort": ("Colombo 1", "Colombo-1", "Col 1"),
    "Slave Island": ("Colombo 2", "Colombo-2", "Col 2"),
    "Kollupitiya": ("Colombo 3", "Colombo-3", "Col 3"),
    "Bambalapitiya": ("Colombo 4", "Colombo-4", "Col 4"),
    "Havelock Town": ("Colombo 5", "Colombo-5", "Col 5"),
    "Wellawatte": ("Colombo 6", "Colombo-6", "Col 6"),
    "Cinnamon Gardens": ("Colombo 7", "Colombo-7", "Col 7"),
    "Borella": ("Colombo 8", "Colombo-8", "Col 8"),
    "Dematagoda": ("Colombo 9", "Colombo-9", "Col 9"),
    "Maradana": ("Colombo 10", "Colombo-10", "Col 10"),
    "Pettah": ("Colombo 11", "Colombo-11", "Col 11"),
    "Hulftsdorp": ("Colombo 12", "Colombo-12", "Col 12"),
    "Kotahena": ("Colombo 13", "Colombo-13", "Col 13"),
    "Grandpass": ("Colombo 14", "Colombo-14", "Col 14"),
    "Mattakkuliya": ("Colombo 15", "Colombo-15", "Col 15"),
}


def read_dotenv_value(name: str) -> str:
    dotenv_path = ROOT / ".env"
    if not dotenv_path.exists():
        return ""
    for line in dotenv_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        if key.strip() == name:
            return value.strip().strip('"').strip("'")
    return ""


CONTACT_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT") or read_dotenv_value("NOMINATIM_USER_AGENT") or "LankaGo/1.0 (place search; contact: admin@lankago.local)"
USER_AGENT = f"LankaGo place-index builder/1.1; {CONTACT_USER_AGENT}"


def normalise(value: str) -> str:
    return "".join(character.lower() for character in value if character.isalnum())


def add_common_spelling_aliases(places: list[dict]) -> None:
    alias_pairs = (("kokkuvil", "Kokuvil"), ("moneragala", "Monaragala"), ("elakanda", "Elakanda"), ("thirunelveli", "Thirunelvely"))
    for place in places:
        if place["type"] == "railway_station":
            continue
        place_name = normalise(place["name"])
        aliases = list(place["aliases"])
        if place_name == "elakandajct":
            aliases.append("Elakanda")
        for expected, alternate in alias_pairs:
            if place_name == expected or normalise(alternate) == place_name:
                aliases.append(alternate)
        if place["district"] == "Jaffna" and place_name in {"thirunelveli", "thirunelvely"}:
            aliases.extend(("Thirunelveli", "Thirunelvely"))
        place["aliases"] = list(dict.fromkeys(aliases))


def distance_km(first: dict, second: dict) -> float:
    latitude_delta = math.radians(second["latitude"] - first["latitude"])
    longitude_delta = math.radians(second["longitude"] - first["longitude"])
    value = math.sin(latitude_delta / 2) ** 2 + math.cos(math.radians(first["latitude"])) * math.cos(math.radians(second["latitude"])) * math.sin(longitude_delta / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(value))


def cache_path(district: str) -> Path:
    return CACHE_DIRECTORY / f"{district}.json"


def overpass_query(district: str, place_types: tuple[str, ...] = PLACE_TYPES) -> str:
    osm_name = OSM_DISTRICT_NAMES[district].replace('"', '\\"')
    place_filters = "|".join(place_types)
    return (
        '[out:json][timeout:180];\n'
        'area["ISO3166-1"="LK"]["admin_level"="2"]->.lk;\n'
        f'rel["boundary"="administrative"]["admin_level"="5"]["name"="{osm_name}"](area.lk);\n'
        'map_to_area->.district;\n'
        '(\n'
        f'  node["place"~"^({place_filters})$"](area.district);\n'
        f'  way["place"~"^({place_filters})$"](area.district);\n'
        f'  relation["place"~"^({place_filters})$"](area.district);\n'
        ');\n'
        'out center tags;'
    )


def is_retryable(error: Exception) -> bool:
    if isinstance(error, HTTPError):
        return error.code in RETRYABLE_HTTP_STATUS_CODES
    return isinstance(error, (URLError, TimeoutError, SocketTimeout))


def request_overpass(district: str, place_types: tuple[str, ...], query_label: str) -> list[dict]:
    query = overpass_query(district, place_types)
    max_attempts = len(RETRY_WAITS_SECONDS) + 1
    for attempt in range(1, max_attempts + 1):
        mirror = OVERPASS_MIRRORS[(attempt - 1) % len(OVERPASS_MIRRORS)]
        print(f"  {district}: {query_label}; mirror {mirror}; attempt {attempt}/{max_attempts}")
        try:
            payload = urlencode({"data": query}).encode("utf-8")
            request = Request(mirror, data=payload, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                result = json.loads(response.read().decode("utf-8"))
            if not isinstance(result.get("elements"), list):
                raise RuntimeError("Overpass returned an invalid element list.")
            return result["elements"]
        except Exception as error:
            if not is_retryable(error):
                raise RuntimeError(f"{district}: {query_label} failed with non-retryable error: {error}") from error
            error_detail = f"HTTP {error.code}" if isinstance(error, HTTPError) else type(error).__name__
            if attempt == max_attempts:
                raise RuntimeError(f"{district}: {query_label} failed after {attempt} attempts ({error_detail}).") from error
            wait_seconds = RETRY_WAITS_SECONDS[attempt - 1]
            print(f"  {district}: {query_label} failed ({error_detail}); waiting {wait_seconds}s before retry.")
            time.sleep(wait_seconds)
    raise RuntimeError(f"{district}: retry loop ended unexpectedly.")


def load_cached_district(district: str) -> list[dict] | None:
    path = cache_path(district)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list) or not data:
            raise ValueError("cache is empty or invalid")
        if not any(place_from_element(element, district) for element in data):
            raise ValueError("cache contains zero supported places")
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"  {district}: ignoring invalid cache ({error}).")
        return None
    print(f"  {district}: loaded {len(data)} raw OSM elements from cache.")
    return data


def save_cached_district(district: str, elements: list[dict]) -> None:
    CACHE_DIRECTORY.mkdir(parents=True, exist_ok=True)
    cache_path(district).write_text(json.dumps(elements, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def download_district(district: str) -> list[dict]:
    cached = load_cached_district(district)
    if cached is not None:
        return cached
    print(f"  {district}: exact OSM administrative name: {OSM_DISTRICT_NAMES[district]}")
    try:
        elements = request_overpass(district, PLACE_TYPES, "all place levels")
    except RuntimeError as error:
        if district not in LARGE_DISTRICTS:
            raise error
        print(f"  {district}: full query exhausted retries; splitting into compact and rural place-level queries.")
        compact = request_overpass(district, COMPACT_PLACE_TYPES, "city/town/suburb/quarter")
        rural = request_overpass(district, RURAL_PLACE_TYPES, "neighbourhood/village/hamlet")
        elements = list({f"{item.get('type')}/{item.get('id')}": item for item in [*compact, *rural]}.values())
    if not elements:
        raise RuntimeError(f"{district}: OSM query returned zero raw elements for {OSM_DISTRICT_NAMES[district]}.")
    if not any(place_from_element(element, district) for element in elements):
        raise RuntimeError(f"{district}: OSM query returned zero supported places for {OSM_DISTRICT_NAMES[district]}.")
    save_cached_district(district, elements)
    return elements


def place_from_element(element: dict, district: str) -> dict | None:
    tags = element.get("tags") or {}
    name = tags.get("name:en") or tags.get("name")
    place_type = tags.get("place")
    coordinates = element if element.get("type") == "node" else element.get("center") or {}
    latitude, longitude = coordinates.get("lat"), coordinates.get("lon")
    if not name or place_type not in PLACE_TYPES or latitude is None or longitude is None:
        return None
    aliases = []
    for key, value in tags.items():
        if key == "alt_name" or key == "old_name" or key.startswith("alt_name:") or key.startswith("old_name:"):
            aliases.extend(part.strip() for part in value.split(";") if part.strip())
    return {"id": f"{element['type']}/{element['id']}", "name": name, "name_si": tags.get("name:si", ""), "name_ta": tags.get("name:ta", ""), "aliases": list(dict.fromkeys(aliases)), "type": place_type, "latitude": float(latitude), "longitude": float(longitude), "district": district, "province": DISTRICT_TO_PROVINCE[district]}


def add_colombo_postal_aliases(places: list[dict]) -> None:
    colombo_places = [place for place in places if place["district"] == "Colombo"]
    by_name = {normalise(place["name"]): place for place in colombo_places}
    for suburb_name, aliases in COLOMBO_POSTAL_ALIASES.items():
        target = by_name.get(normalise(suburb_name))
        if target is None and suburb_name == "Havelock Town":
            target = by_name.get(normalise("Narahenpita"))
        if target is None and suburb_name == "Mattakkuliya":
            target = by_name.get(normalise("Modara"))
        if target is None:
            print(f"WARNING: no downloaded Colombo suburb for {suburb_name}; aliases were not added.")
            continue
        target["aliases"] = list(dict.fromkeys([*target["aliases"], *aliases]))


def append_train_stations(places: list[dict]) -> None:
    network = json.loads((ROOT / "shared" / "trainNetwork.json").read_text(encoding="utf-8"))
    known = {(place["name"], round(place["latitude"], 5), round(place["longitude"], 5)) for place in places}
    indexed_places = [place for place in places if place["type"] != "railway_station" and place["district"] and place["province"]]
    for station, coordinates in network["stations"].items():
        latitude, longitude = coordinates
        if (station, round(latitude, 5), round(longitude, 5)) not in known:
            station_place = {"id": f"train/{normalise(station)}", "name": station, "name_si": "", "name_ta": "", "aliases": [], "type": "railway_station", "latitude": latitude, "longitude": longitude, "district": "", "province": "", "station": True}
            nearest = min(indexed_places, key=lambda place: distance_km(station_place, place), default=None)
            if nearest and distance_km(station_place, nearest) <= 15:
                station_place["district"] = nearest["district"]
                station_place["province"] = nearest["province"]
            else:
                print(f"WARNING: no indexed place within 15 km of railway station {station}.")
            places.append(station_place)


def print_summary(places: list[dict], frontend_path: Path) -> None:
    print("\nCoverage summary")
    province_counts = Counter(place["province"] for place in places if place["province"])
    district_counts = Counter(place["district"] for place in places if place["district"])
    for province, districts in DISTRICTS.items():
        print(f"{province}: {province_counts[province]}")
        for district in districts:
            print(f"  {district}: {district_counts[district]}")
    compressed = gzip.compress(frontend_path.read_bytes())
    print(f"Frontend index gzip size: {len(compressed) / 1024:.1f} KB")
    if len(compressed) > 400 * 1024:
        print("WARNING: frontend index exceeds the 400 KB gzip target.")


def main() -> None:
    places: list[dict] = []
    missing_districts: list[str] = []
    for position, district in enumerate(DISTRICT_TO_PROVINCE, start=1):
        print(f"[{position}/25] Processing {district} District …")
        cached_elements = load_cached_district(district)
        used_valid_cache = cached_elements is not None
        try:
            elements = cached_elements if used_valid_cache else download_district(district)
            district_places = [place for element in elements if (place := place_from_element(element, district))]
            if not district_places:
                raise RuntimeError(f"{district}: zero supported places after filtering. Check OSM name {OSM_DISTRICT_NAMES[district]!r}.")
            places.extend(district_places)
            print(f"  {district}: {len(district_places)} supported OSM places complete.")
        except RuntimeError as error:
            missing_districts.append(district)
            print(f"ERROR: {error}")
        if position < len(DISTRICT_TO_PROVINCE) and not used_valid_cache:
            time.sleep(PAUSE_SECONDS)
    if missing_districts:
        print("\nThe final indexes were not changed. Missing districts:")
        for district in missing_districts:
            print(f"  - {district} ({OSM_DISTRICT_NAMES[district]})")
        print("Re-run the script to continue")
        raise SystemExit(1)
    places = sorted({place["id"]: place for place in places}.values(), key=lambda place: (place["province"], place["district"], place["type"], place["name"]))
    add_colombo_postal_aliases(places)
    add_common_spelling_aliases(places)
    append_train_stations(places)
    shared_path = ROOT / "shared" / "sriLankaPlaces.json"
    frontend_path = ROOT / "frontend" / "src" / "data" / "sriLankaPlacesIndex.json"
    frontend_places = [{"i": place["id"], "n": place["name"], "si": place.get("name_si", ""), "ta": place.get("name_ta", ""), "a": place.get("aliases", []), "t": place["type"], "la": place["latitude"], "lo": place["longitude"], "d": place.get("district", ""), "p": place.get("province", "")} for place in places if place["type"] in FRONTEND_TYPES]
    shared_path.write_text(json.dumps(places, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    frontend_path.write_text(json.dumps(frontend_places, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print_summary(places, frontend_path)
    print(f"\nWrote {len(places)} total records to {shared_path}")
    print(f"Wrote {len(frontend_places)} frontend records to {frontend_path}")


if __name__ == "__main__":
    main()