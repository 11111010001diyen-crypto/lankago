import unittest

from fastapi import HTTPException

from backend.routers.bookings import prepare_passenger_manifest
from backend.pricing import quote
from backend.train_network import get_train_availability


class PassengerManifestTests(unittest.TestCase):
    def test_train_requires_one_name_per_passenger_and_generates_seats(self):
        names, seats = prepare_passenger_manifest("train", 3, ["Asha Silva", "Nimal Perera", "Ravi Fernando"])
        self.assertEqual(names, ["Asha Silva", "Nimal Perera", "Ravi Fernando"])
        self.assertEqual(seats, ["T-01", "T-02", "T-03"])

    def test_bus_requires_one_name_per_passenger(self):
        with self.assertRaises(HTTPException) as error:
            prepare_passenger_manifest("bus", 2, ["Asha Silva"])
        self.assertEqual(error.exception.status_code, 422)


class TrainAvailabilityTests(unittest.TestCase):
    def test_connected_stations_within_three_kilometres_are_available(self):
        route = get_train_availability(6.9344, 79.8428, 7.2906, 80.6337)
        self.assertTrue(route["available"])
        self.assertEqual(route["from_station"], "Colombo Fort")
        self.assertEqual(route["to_station"], "Kandy")

    def test_hotel_route_near_one_station_is_not_a_train_route(self):
        route = get_train_availability(6.9271, 79.8445, 6.9259, 79.8464)
        self.assertFalse(route["available"])
        self.assertEqual(route["from_station"], route["to_station"])

    def test_endpoint_outside_station_access_radius_is_not_available(self):
        route = get_train_availability(6.9271, 79.8445, 6.9271, 80.3)
        self.assertFalse(route["available"])

    def test_vehicle_requires_one_lead_name_and_has_no_seats(self):
        names, seats = prepare_passenger_manifest("car", 5, ["Asha Silva"])
        self.assertEqual(names, ["Asha Silva"])
        self.assertEqual(seats, [])
        self.assertEqual(quote("car", 5, 1000)["units"], 2)
        self.assertEqual(quote("three-wheel", 7, 1000)["units"], 3)

    def test_vehicle_rejects_multiple_names(self):
        with self.assertRaises(HTTPException) as error:
            prepare_passenger_manifest("three-wheel", 2, ["Asha Silva", "Nimal Perera"])
        self.assertEqual(error.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()