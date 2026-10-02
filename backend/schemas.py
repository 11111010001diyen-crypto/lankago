from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(pattern=r"^\d{10}$")
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    identity: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)


class BookingRequest(BaseModel):
    from_location: str = Field(min_length=1, max_length=180)
    to_location: str = Field(min_length=1, max_length=180)
    from_name: str | None = Field(default=None, min_length=1, max_length=120)
    from_area: str | None = Field(default=None, min_length=1, max_length=120)
    to_name: str | None = Field(default=None, min_length=1, max_length=120)
    to_area: str | None = Field(default=None, min_length=1, max_length=120)
    travel_date: date
    mode: Literal["train", "bus", "car", "three-wheel"]
    bus_type: str | None = Field(default=None, max_length=80)
    train_class: str | None = Field(default=None, max_length=80)
    passengers: int = Field(ge=1, le=100)
    from_latitude: float = Field(ge=-90, le=90)
    from_longitude: float = Field(ge=-180, le=180)
    to_latitude: float = Field(ge=-90, le=90)
    to_longitude: float = Field(ge=-180, le=180)
    departure_time: str = Field(min_length=1, max_length=30)
    weather: str = Field(min_length=1, max_length=30)
    lead_passenger_name: str = Field(min_length=2, max_length=120)
    passenger_names: list[str] = Field(min_length=1, max_length=100)
    contact_number: str = Field(pattern=r"^\d{10}$")
    assistance_notes: str | None = Field(default=None, max_length=1000)
    payment_method: Literal["card", "cash"]