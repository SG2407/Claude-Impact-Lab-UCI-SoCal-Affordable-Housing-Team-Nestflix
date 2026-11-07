import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

APP_NAME = "NestFlix"
APP_VERSION = "0.1.0"

DATABASE_URL = os.getenv("NESTFLIX_DATABASE_URL", f"sqlite:///{BASE_DIR / 'nestflix.db'}")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "NESTFLIX_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if o.strip()
]


def anthropic_api_key() -> str | None:
    """Read at call time so tests and users can set/unset the key without a restart."""
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    return key or None
