import json
import math
from collections import deque
from pathlib import Path

MAXIMUM_STATION_ACCESS_KM = 3
NETWORK_PATH = Path(__file__).resolve().parent.parent / "shared" / "trainNetwork.json"
TRAIN_NETWORK = json.loads(NETWORK_PATH.read_text(encoding="utf-8"))


def _distance_km(from_latitude: float, from_longitude: float, to_latitude: float, to_longitude: float) -> float:
    latitude_difference = math.radians(to_latitude - from_latitude)
    longitude_difference = math.radians(to_longitude - from_longitude)
    haversine = math.sin(latitude_difference / 2) ** 2 + math.cos(math.radians(from_latitude)) * math.cos(math.radians(to_latitude)) * math.sin(longitude_difference / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def _nearest_station(latitude: float, longitude: float) -> tuple[str, float]:
    return min(((name, _distance_km(latitude, longitude, coordinates[0], coordinates[1])) for name, coordinates in TRAIN_NETWORK["stations"].items()), key=lambda station: station[1])


def _are_connected(from_station: str, to_station: str) -> bool:
    graph: dict[str, set[str]] = {}
    for line in TRAIN_NETWORK["lines"]:
        for first, second in zip(line["stations"], line["stations"][1:]):
            graph.setdefault(first, set()).add(second)
            graph.setdefault(second, set()).add(first)
    visited = {from_station}
    queue = deque([from_station])
    while queue:
        station = queue.popleft()
        if station == to_station:
            return True
        for connected_station in graph.get(station, set()):
            if connected_station not in visited:
                visited.add(connected_station)
                queue.append(connected_station)
    return False


def get_train_availability(from_latitude: float, from_longitude: float, to_latitude: float, to_longitude: float) -> dict:
    from_station, from_distance_km = _nearest_station(from_latitude, from_longitude)
    to_station, to_distance_km = _nearest_station(to_latitude, to_longitude)
    available = from_distance_km <= MAXIMUM_STATION_ACCESS_KM and to_distance_km <= MAXIMUM_STATION_ACCESS_KM and from_station != to_station and _are_connected(from_station, to_station)
    return {"available": available, "from_station": from_station, "to_station": to_station}