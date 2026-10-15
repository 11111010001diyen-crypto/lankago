import unittest
from unittest.mock import patch

from fastapi import HTTPException

from backend.routers.auth import TERMS_VERSION, register
from backend.schemas import RegisterRequest


class RegistrationConsentTests(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "full_name": "Test User",
            "email": "test@example.com",
            "phone": "7712345678",
            "password": "secure-password",
        }

    @patch("backend.routers.auth.sign_up")
    def test_register_without_accepted_terms_returns_consent_message(self, mock_sign_up):
        with self.assertRaises(HTTPException) as error:
            register(RegisterRequest(**self.payload))

        self.assertEqual(error.exception.status_code, 400)
        self.assertEqual(
            error.exception.detail,
            "Please agree to the Terms of Use and Privacy Policy to create an account.",
        )
        mock_sign_up.assert_not_called()

    @patch("backend.routers.auth.execute_returning")
    @patch("backend.routers.auth.sign_up")
    def test_register_with_accepted_terms_sends_consent_metadata(self, mock_sign_up, mock_execute_returning):
        mock_sign_up.return_value = {"user": {"id": "user-123", "identities": [{"id": "identity-123"}]}}
        mock_execute_returning.return_value = {"user_id": "user-123"}

        response = register(RegisterRequest(**self.payload, accepted_terms=True))

        self.assertEqual(response["message"], "Account created. Check your email to confirm it before logging in.")
        mock_sign_up.assert_called_once()
        metadata = mock_sign_up.call_args.args[2]
        self.assertIn("accepted_terms_at", metadata)
        self.assertTrue(metadata["accepted_terms_at"])
        self.assertEqual(metadata["terms_version"], TERMS_VERSION)


if __name__ == "__main__":
    unittest.main()