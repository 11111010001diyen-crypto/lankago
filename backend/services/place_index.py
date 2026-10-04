"""Local Sri Lanka place-index loading, matching, ranking, and formatting."""

from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

INDEX_PATH = Path(__file__).resolve().parents[2] / "shared" / "sriLankaPlaces.json"
TYPE_PRIORITY = {"city": 0, "town": 1, "suburb": 2, "quarter": 3, "neighbourhood": 4, "village": 5, "hamlet": 6, "railway_station": 7, "landmark": 8}
IGNORED_SUFFIXES = {"jct", "junction", "town", "road"}


def _latin_canonical(value: str) -> str:
    value = re.sub(r"([a-z])\1+", r"\1", value)
    if len(value) >= 5:
        value = re.sub(r"[aei]", "a", value)
    return value.replace("th", "t").replace("d", "t")


def normalise(value: str = "") -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    text = "".join(character for character in decomposed if not unicodedata.combining(character) and character.isalnum())
    return _latin_canonical(text) if re.fullmatch(r"[a-z0-9]+", text) else text


def tokens(value: str) -> list[str]:
    raw = re.findall(r"[^\W_]+", value, flags=re.UNICODE)
    if raw and raw[-1].casefold().rstrip(".") in IGNORED_SUFFIXES:
        raw.pop()
    return [normalise(item) for item in raw if normalise(item)]


def spelling_variants(query: str) -> list[str]:
    variants = [query]
    substitutions = ((r"\bsaint\b", "St."), (r"\bst\.?\b", "Saint"), (r"\bkovil temple\b", "Kovil"), (r"\bkovil\b", "Temple"), (r"kandaswamy", "kanthaswamy"), (r"kanthaswamy", "kandaswamy"), (r"veli\b", "vely"), (r"vely\b", "veli"))
    for pattern, replacement in substitutions:
        candidate = re.sub(pattern, replacement, query, flags=re.IGNORECASE)
        if candidate not in variants:
            variants.append(candidate)
    postal = re.fullmatch(r"\s*(?:colombo|col)\s*[- ]?\s*(1[0-5]|[1-9])\s*", query, flags=re.IGNORECASE)
    if postal:
        number = postal.group(1)
        variants.extend([f"Colombo {number}", f"Colombo-{number}", f"Col {number}"])
    return list(dict.fromkeys(variants))


def edit_distance(first: str, second: str) -> int:
    if abs(len(first) - len(second)) > 2:
        return 3
    previous = list(range(len(second) + 1))
    for row, first_character in enumerate(first, start=1):
        current = [row]
        for column, second_character in enumerate(second, start=1):
            current.append(min(current[-1] + 1, previous[column] + 1, previous[column - 1] + (first_character != second_character)))
        previous = current
    return previous[-1]


@lru_cache(maxsize=1)
def load_places() -> tuple[dict, ...]:
    try:
        data = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return ()
    return tuple(item for item in data if isinstance(item, dict) and item.get("name"))


def reset_cache() -> None:
    load_places.cache_clear()


def candidates(place: dict) -> list[tuple[str, str]]:
    result = [(place.get("name", ""), "name"), (place.get("name_si", ""), "name_si"), (place.get("name_ta", ""), "name_ta")]
    result.extend((alias, "alias") for alias in place.get("aliases", []) if isinstance(alias, str))
    return [(value, source) for value, source in result if value]


def _canonical(value: str) -> str:
    raw = re.findall(r"[^\W_]+", value, flags=re.UNICODE)
    if raw and raw[-1].casefold().rstrip(".") in IGNORED_SUFFIXES:
        raw.pop()
    return normalise("".join(raw))


def _fuzzy_match(query_tokens: list[str], candidate_tokens: list[str]) -> bool:
    if not query_tokens or len(query_tokens) != len(candidate_tokens):
        return False
    for query_token, candidate_token in zip(query_tokens, candidate_tokens):
        length = max(len(query_token), len(candidate_token))
        limit = 2 if length >= 8 else 1 if length >= 5 else 0
        if not limit or edit_distance(query_token, candidate_token) > limit:
            return False
    return True


def match_score(place: dict, query: str) -> tuple[int, str] | None:
    canonical_query = _canonical(query)
    query_tokens = tokens(query)
    if not canonical_query:
        return None
    best: tuple[int, str] | None = None
    for candidate, source in candidates(place):
        canonical_candidate = _canonical(candidate)
        candidate_tokens = tokens(candidate)
        if canonical_candidate == canonical_query:
            score = 0 if source == "name" else 1
        elif canonical_candidate.startswith(canonical_query):
            score = 2
        elif query_tokens and all(any(token.startswith(query_token) for token in candidate_tokens) for query_token in query_tokens):
            score = 3
        elif canonical_query in canonical_candidate:
            score = 4
        elif _fuzzy_match(query_tokens, candidate_tokens):
            score = 5
        else:
            continue
        if best is None or score < best[0]:
            best = (score, candidate)
    return best


def format_place(place: dict, matched_text: str = "") -> dict:
    district = place.get("district", "")
    province = place.get("province", "")
    name = place["name"]
    area = district or province or "Sri Lanka"
    location_parts = [part for part in (name, district, province, "Sri Lanka") if part]
    return {"id": place.get("id", ""), "name": name, "area": area, "district": district, "province": province, "type": place.get("type", "landmark"), "latitude": float(place["latitude"]), "longitude": float(place["longitude"]), "fullAddress": ", ".join(location_parts), "matchedText": matched_text}


def search_local(query: str, limit: int = 8) -> list[dict]:
    matches = []
    for place in load_places():
        matched_options = [match_score(place, candidate) for candidate in spelling_variants(query)]
        matched_options = [matched for matched in matched_options if matched is not None]
        if not matched_options:
            continue
        score, matched_text = min(matched_options, key=lambda matched: matched[0])
        matches.append(((score, TYPE_PRIORITY.get(place.get("type"), 99), len(place.get("name", "")), place.get("name", "").casefold()), format_place(place, matched_text)))
    matches.sort(key=lambda item: item[0])
    return [place for _, place in matches[:limit]]


def nearest_matching_area(query: str) -> dict | None:
    matches = search_local(query, limit=1)
    if matches:
        return matches[0]
    for word in reversed(re.findall(r"[^\W_]+", query, flags=re.UNICODE)):
        matches = search_local(word, limit=1)
        if matches:
            return matches[0]
    return None