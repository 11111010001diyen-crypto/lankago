import json
import unittest
from unittest.mock import patch

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
        self.assertIn("limit=6", request.full_url)
        self.assertTrue(request.get_header("User-agent"))

    def test_short_queries_are_rejected_by_endpoint_validation(self):
        from fastapi import HTTPException

        with self.assertRaises(HTTPException):
            places.search_places("ka")