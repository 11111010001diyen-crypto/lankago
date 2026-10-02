import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "LankaGo/1.0 (place search; contact: admin@lankago.local)")


def require_settings() -> None:
    missing = [name for name, value in {
        "DATABASE_URL": DATABASE_URL,
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_ANON_KEY": SUPABASE_ANON_KEY,
    }.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")