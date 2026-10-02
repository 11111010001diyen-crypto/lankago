import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2.errors import UniqueViolation

from ..database import execute_returning, fetch_all, fetch_one
from ..dependencies import current_user
from ..pricing import calculate_unit_price, quote
from ..schemas import BookingRequest
from ..train_network import get_train_availability

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def serialize(booking):
    return dict(booking) if booking else None


def prepare_passenger_manifest(mode: str, passengers: int, passenger_names: list[str]) -> tuple[list[str], list[str]]:
    names = [name.strip() for name in passenger_names]
    if any(len(name) < 2 or len(name) > 120 for name in names):
        raise HTTPException(status_code=422, detail="Each passenger name must be between 2 and 120 characters.")
    if mode in {"train", "bus"}:
        if len(names) != passengers:
            raise HTTPException(status_code=422, detail="Train and bus bookings require one passenger name for each traveller.")
        prefix = "T" if mode == "train" else "B"
        return names, [f"{prefix}-{index:02d}" for index in range(1, passengers + 1)]
    if len(names) != 1:
        raise HTTPException(status_code=422, detail="Vehicle bookings require exactly one lead passenger name.")
    return names, []


@router.post("", status_code=status.HTTP_201_CREATED)
def create_booking(payload: BookingRequest, user=Depends(current_user)):
    if payload.mode == "bus" and not payload.bus_type:
        raise HTTPException(status_code=422, detail="A bus type is required for bus bookings.")
    if payload.mode == "train" and not payload.train_class:
        raise HTTPException(status_code=422, detail="A train class is required for train bookings.")
    if payload.mode == "train" and not get_train_availability(payload.from_latitude, payload.from_longitude, payload.to_latitude, payload.to_longitude)["available"]:
        raise HTTPException(status_code=422, detail="No train route between these places.")
    passenger_names, seat_numbers = prepare_passenger_manifest(payload.mode, payload.passengers, payload.passenger_names)
    if payload.lead_passenger_name.strip() != passenger_names[0]:
        raise HTTPException(status_code=422, detail="The lead passenger name must match the first passenger name.")
    try:
        unit_price = calculate_unit_price(payload.mode, payload.from_latitude, payload.from_longitude, payload.to_latitude, payload.to_longitude, payload.departure_time, payload.weather, payload.bus_type, payload.train_class)
    except KeyError as error:
        raise HTTPException(status_code=422, detail="The selected transport class is invalid.") from error
    pricing = quote(payload.mode, payload.passengers, unit_price)
    payment_status = "paid_demo" if payload.payment_method == "card" else "pending_cash"
    for _ in range(3):
        reference = f"LG-{secrets.token_hex(5).upper()}"
        try:
            booking = execute_returning(
                """insert into public.bookings
                (user_id, booking_reference, from_location, to_location, from_name, from_area, to_name, to_area, travel_date, mode, bus_type, train_class, passengers, units, unit_price, total_price, lead_passenger_name, passenger_names, seat_numbers, contact_number, assistance_notes, payment_method, payment_status)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                returning *""",
                (user["id"], reference, payload.from_location.strip(), payload.to_location.strip(), payload.from_name.strip() if payload.from_name else None, payload.from_area.strip() if payload.from_area else None, payload.to_name.strip() if payload.to_name else None, payload.to_area.strip() if payload.to_area else None, payload.travel_date, payload.mode, payload.bus_type if payload.mode == "bus" else None, payload.train_class if payload.mode == "train" else None, payload.passengers, pricing["units"], pricing["unit_price"], pricing["total_price"], passenger_names[0], passenger_names, seat_numbers, payload.contact_number, payload.assistance_notes.strip() if payload.assistance_notes else None, payload.payment_method, payment_status),
            )
            result = serialize(booking)
            result.update({"unit_label": pricing["unit_label"], "per_person_cost": pricing["per_person_cost"]})
            return result
        except UniqueViolation:
            continue
    raise HTTPException(status_code=500, detail="Unable to generate a booking reference.")


@router.get("")
def list_bookings(user=Depends(current_user)):
    bookings = fetch_all("select * from public.bookings where user_id = %s order by created_at desc", (user["id"],))
    return [serialize(booking) for booking in bookings]


@router.get("/{booking_reference}")
def get_booking(booking_reference: str, user=Depends(current_user)):
    booking = fetch_one("select * from public.bookings where user_id = %s and booking_reference = %s", (user["id"], booking_reference))
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return serialize(booking)