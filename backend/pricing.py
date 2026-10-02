import math

MODE_PROFILES = {
    "train": {"base_fare": 30, "rate_per_km": 2.5, "route_multiplier": 1.18},
    "bus": {"base_fare": 40, "rate_per_km": 3.5, "route_multiplier": 1.28},
    "car": {"base_fare": 300, "rate_per_km": 28, "route_multiplier": 1.28},
    "three-wheel": {"base_fare": 150, "rate_per_km": 10, "route_multiplier": 1.28},
}
BUS_MULTIPLIERS = {"CTB (Government)": 1.0, "Private Intercity A/C": 1.6, "Metro/City Bus": 1.15}
TRAIN_MULTIPLIERS = {"Third Class": 1.0, "Second Class": 1.8, "First Class": 3.0}


def _distance_km(from_latitude: float, from_longitude: float, to_latitude: float, to_longitude: float) -> float:
    latitude_difference = math.radians(to_latitude - from_latitude)
    longitude_difference = math.radians(to_longitude - from_longitude)
    haversine = math.sin(latitude_difference / 2) ** 2 + math.cos(math.radians(from_latitude)) * math.cos(math.radians(to_latitude)) * math.sin(longitude_difference / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def calculate_unit_price(mode: str, from_latitude: float, from_longitude: float, to_latitude: float, to_longitude: float, departure_time: str, weather: str, bus_type: str | None, train_class: str | None) -> int:
    profile = MODE_PROFILES[mode]
    route_distance_km = _distance_km(from_latitude, from_longitude, to_latitude, to_longitude) * profile["route_multiplier"]
    base_price = profile["base_fare"] + (route_distance_km * profile["rate_per_km"])
    surge_multiplier = 1
    if mode in {"car", "three-wheel"}:
        surge_multiplier = (1.3 if departure_time in {"Morning peak", "Evening peak"} else 1) * (1.2 if weather == "Rainy" else 1)
    class_multiplier = BUS_MULTIPLIERS[bus_type] if mode == "bus" else TRAIN_MULTIPLIERS[train_class] if mode == "train" else 1
    return round(base_price * surge_multiplier * class_multiplier)


def quote(mode: str, passengers: int, unit_price: int) -> dict:
    if mode in {"train", "bus"}:
        units, unit_label = passengers, "tickets"
    elif mode == "car":
        units, unit_label = math.ceil(passengers / 4), "vehicles"
    elif mode == "three-wheel":
        units, unit_label = math.ceil(passengers / 3), "vehicles"
    else:
        raise ValueError("Unsupported transport mode.")
    total_price = unit_price * units
    return {"units": units, "unit_label": unit_label, "unit_price": unit_price, "total_price": total_price, "per_person_cost": round(total_price / passengers, 2)}