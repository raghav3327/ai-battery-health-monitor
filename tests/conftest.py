"""Shared pytest fixtures for backend API, ML, and pipeline tests."""

import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from api import app as api_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Return a Flask test client backed by an isolated temporary SQLite database."""
    test_db = tmp_path / "test_predictions.db"
    monkeypatch.setattr(api_app, "DB_PATH", str(test_db))
    api_app.init_db()
    api_app.app.config["TESTING"] = True
    with api_app.app.test_client() as test_client:
        yield test_client


@pytest.fixture()
def nominal_telemetry():
    """Return a baseline nominal NMC telemetry payload for /predict."""
    return {
        "cycle": 80,
        "voltage_avg": 3.92,
        "voltage_max": 4.02,
        "voltage_min": 3.67,
        "current_avg": 1.8,
        "temp_avg": 25.0,
        "temp_max": 27.0,
        "chemistry": "NMC",
    }
