import unittest
from unittest.mock import patch

from backend.services import place_index


FIXTURE_PLACES = (
    {"id": "node/1", "name": "Kotahena", "name_si": "කොටහේන", "name_ta": "கொட்டாஞ்சேனை", "aliases": ["Colombo 13", "Colombo-13", "Col 13"], "type": "suburb", "latitude": 6.95, "longitude": 79.86, "district": "Colombo", "province": "Western Province"},
    {"id": "node/2", "name": "Kokuvil", "name_si": "", "name_ta": "கொக்குவில்", "aliases": [], "type": "suburb", "latitude": 9.69, "longitude": 80.02, "district": "Jaffna", "province": "Northern Province"},
    {"id": "node/3", "name": "Kokuvil Central College", "name_si": "", "name_ta": "", "aliases": [], "type": "landmark", "latitude": 9.69, "longitude": 80.03, "district": "Jaffna", "province": "Northern Province"},
    {"id": "node/4", "name": "Thirunelveli", "name_si": "", "name_ta": "திருநெல்வேலி", "aliases": ["Thirunelvely"], "type": "suburb", "latitude": 9.68, "longitude": 80.04, "district": "Jaffna", "province": "Northern Province"},
    {"id": "node/5", "name": "Kandy", "name_si": "මහනුවර", "name_ta": "கண்டி", "aliases": [], "type": "city", "latitude": 7.29, "longitude": 80.63, "district": "Kandy", "province": "Central Province"},
    {"id": "node/6", "name": "Nayakakanda", "name_si": "", "name_ta": "", "aliases": [], "type": "hamlet", "latitude": 7.0, "longitude": 79.9, "district": "Gampaha", "province": "Western Province"},
    {"id": "node/7", "name": "Elakanda Jct.", "name_si": "", "name_ta": "", "aliases": ["Elakanda"], "type": "neighbourhood", "latitude": 6.99, "longitude": 79.9, "district": "Gampaha", "province": "Western Province"},
    {"id": "node/8", "name": "Kokkuvil", "name_si": "", "name_ta": "கொக்குவில்", "aliases": ["Kokuvil"], "type": "village", "latitude": 9.69, "longitude": 80.02, "district": "Jaffna", "province": "Northern Province"},
    {"id": "node/9", "name": "Moneragala", "name_si": "", "name_ta": "", "aliases": ["Monaragala"], "type": "city", "latitude": 6.87, "longitude": 81.35, "district": "Monaragala", "province": "Uva Province"},
)


class PlaceIndexTests(unittest.TestCase):
    def setUp(self):
        self.patch = patch("backend.services.place_index.load_places", return_value=FIXTURE_PLACES)
        self.patch.start()

    def tearDown(self):
        self.patch.stop()

    def test_colombo_postal_aliases_and_punctuation_rank_kotahena(self):
        for query in ("Colombo 13", "Colombo-13", "Col 13"):
            self.assertEqual(place_index.search_local(query)[0]["name"], "Kotahena")

    def test_area_beats_same_named_landmark(self):
        self.assertEqual(place_index.search_local("Kokuvil")[0]["name"], "Kokuvil")

    def test_tamil_and_sinhala_match(self):
        self.assertEqual(place_index.search_local("கொக்குவில்")[0]["name"], "Kokuvil")
        self.assertEqual(place_index.search_local("මහනුවර")[0]["name"], "Kandy")

    def test_spelling_variant_alias_matches(self):
        self.assertEqual(place_index.search_local("Thirunelvely")[0]["name"], "Thirunelveli")

    def test_suffix_double_letter_and_vowel_variants_match(self):
        self.assertEqual(place_index.search_local("Elakanda")[0]["name"], "Elakanda Jct.")
        self.assertEqual(place_index.search_local("Kokuvil")[0]["name"], "Kokuvil")
        self.assertEqual(place_index.search_local("Monaragala")[0]["name"], "Moneragala")

    def test_unknown_landmark_is_not_in_local_index(self):
        self.assertEqual(place_index.search_local("Roar Fitness Elakanda"), [])