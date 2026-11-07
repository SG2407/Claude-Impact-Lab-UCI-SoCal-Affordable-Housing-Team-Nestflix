import os
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp()
os.environ["NESTFLIX_DATABASE_URL"] = f"sqlite:///{Path(_tmp) / 'test.db'}"
os.environ.pop("ANTHROPIC_API_KEY", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture()
def client():
    from app.main import app

    with TestClient(app) as c:
        c.post("/api/projects/1/contributions/reset")
        c.post("/api/projects/1/costs/reset")
        yield c
        c.post("/api/projects/1/contributions/reset")
