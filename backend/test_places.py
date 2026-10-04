import json
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from backend.routers import places


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def read(self):
        return json.dumps(self.payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class PlaceSearchTests(unittest.TestCase):
    def setUp(self):
        places._cache.clear()
        places._last_upstream_request_at = 0.0

    @patch("backend.routers.places.urlopen")
    def test_search_uses_sri_lanka_parameters_user_agent_and_cache(self, mock_urlopen):
        payload = [{"display_name": "Shangri-La Hotel Colombo, Galle Road, Colombo, Sri Lanka", "lat": "6.927", "lon": "79.844", "address": {"city": "Colombo"}}]
        mock_urlopen.return_value = FakeResponse(payload)
        first_result = places.search_nominatim("Shangri-La Hotel")
        second_result = places.search_nominatim("  shangri-la   hotel ")
        self.assertEqual(first_result, payload)
        self.assertEqual(second_result, payload)
        self.assertEqual(mock_urlopen.call_count, 1)
        request = mock_urlopen.call_args.args[0]
        self.assertIn("countrycodes=lk", request.full_url)
        self.assertIn("limit=8", request.full_url)
        self.assertTrue(request.get_header("User-agent"))

    @patch("backend.routers.places.place_index.search_local")
    @patch("backend.routers.places.urlopen")
    def test_local_index_results_are_returned_before_nominatim(self, mock_urlopen, mock_local):
        mock_local.return_value = [{"name": "Kotahena", "area": "Colombo", "latitude": 6.95, "longitude": 79.86}]
        self.assertEqual(places.search_places_with_fallback("Colombo 13")[0]["name"], "Kotahena")
        mock_urlopen.assert_not_called()

    @patch("backend.routers.places.place_index.nearest_matching_area")
    @patch("backend.routers.places.place_index.search_local", return_value=[])
    @patch("backend.routers.places.urlopen")
    def test_empty_search_retries_once_with_spelling_variant_and_area(self, mock_urlopen, _mock_local, mock_area):
        mock_area.return_value = {"name": "Kotahena", "district": "Colombo"}
        mock_urlopen.side_effect = [FakeResponse([]), FakeResponse([{"display_name": "St. Benedict's College, Kotahena, Colombo, Sri Lanka", "lat": "6.95", "lon": "79.86", "address": {"suburb": "Kotahena", "state_district": "Colombo", "state": "Western Province"}}])]
        result = places.search_places_with_fallback("Saint Benedicts College")
        self.assertEqual(result[0]["name"], "St. Benedict's College")
        self.assertEqual(mock_urlopen.call_count, 2)
        self.assertIn("Kotahena", mock_urlopen.call_args.args[0].full_url)

    @patch("backend.routers.places.urlopen")
    def test_reverse_returns_selected_pin_label_and_rejects_outside_sri_lanka(self, mock_urlopen):
        mock_urlopen.return_value = FakeResponse({"display_name": "Elakanda Junction, Wattala, Gampaha District, Western Province, Sri Lanka", "address": {"road": "Elakanda Junction", "suburb": "Wattala", "state_district": "Gampaha District", "state": "Western Province"}})
        result = places.reverse_nominatim(6.99, 79.9)
        self.assertEqual(result["name"], "Near Elakanda Junction")
        self.assertEqual(result["area"], "Wattala")
        with self.assertRaises(HTTPException) as error:
            places.reverse_nominatim(0, 0)
        self.assertEqual(error.exception.status_code, 422)

    def test_short_queries_are_rejected_by_endpoint_validation(self):
        with self.assertRaises(HTTPException):
            places.search_places("ka")