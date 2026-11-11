"""Flask API tests and Hypothesis property-based tests for api/app.py."""

import tempfile

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from api import app as api_app


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "healthy"
    assert isinstance(body["model_loaded"], bool)
    assert set(body["features_supported"]) == {"SoH", "RUL", "TRRI", "ECM_R0", "SecondLife", "XAI"}


def test_history_and_certificate_when_empty(client):
    hist_resp = client.get("/history")
    assert hist_resp.status_code == 200
    assert hist_resp.get_json() == {"success": True, "count": 0, "data": []}

    cert_resp = client.get("/certificate")
    assert cert_resp.status_code == 404
    assert cert_resp.get_json()["success"] is False


def test_predict_persists_history_and_generates_certificate(client, nominal_telemetry):
    resp = client.post("/predict", json=nominal_telemetry)
    assert resp.status_code == 200
    body = resp.get_json()

    assert body["success"] is True
    assert 80.0 <= body["soh_percent"] <= 100.0
    assert body["condition"] == "GOOD"
    assert body["second_life"]["grade"] == "GRADE A"
    assert body["thermal_safety"]["risk_level"] == "NORMAL"
    assert body["thermal_safety"]["relay_cutoff_tripped"] is False

    xai = body["xai"]
    assert sum(xai.values()) == pytest.approx(100.0, abs=0.3)

    hist_resp = client.get("/history")
    assert hist_resp.status_code == 200
    hist_body = hist_resp.get_json()
    assert hist_body["count"] == 1
    assert hist_body["data"][0]["cycle"] == nominal_telemetry["cycle"]
    assert hist_body["data"][0]["predicted_soh"] == body["soh_percent"]

    cert_resp = client.get("/certificate")
    assert cert_resp.status_code == 200
    cert = cert_resp.get_json()["certificate"]
    assert cert["certificate_id"].startswith("EV-CERT-")
    assert len(cert["verification_hash"]) == 16
    assert cert["second_life_grading"]["grade"] == "GRADE A"


def test_predict_lfp_degrades_slower_than_nmc_in_extrapolation(client):
    base_payload = {"cycle": 310, "voltage_avg": 3.65, "current_avg": 1.6, "temp_max": 29.0}

    nmc_resp = client.post("/predict", json={**base_payload, "chemistry": "NMC"}).get_json()
    lfp_resp = client.post("/predict", json={**base_payload, "chemistry": "LFP"}).get_json()

    assert lfp_resp["soh_percent"] > nmc_resp["soh_percent"]
    assert lfp_resp["rul"]["cycles"] > nmc_resp["rul"]["cycles"]


@pytest.mark.parametrize(
    ("temp_max", "voltage_min", "current_avg", "expected_level", "expected_tripped"),
    [
        (27.0, 3.65, 1.8, "NORMAL", False),
        (40.0, 3.50, 2.2, "ELEVATED", False),
        (48.0, 2.90, 3.2, "CRITICAL", True),
    ],
)
def test_predict_thermal_safety_thresholds(
    client, temp_max, voltage_min, current_avg, expected_level, expected_tripped
):
    payload = {
        "cycle": 120,
        "voltage_avg": 3.6,
        "voltage_min": voltage_min,
        "current_avg": current_avg,
        "temp_avg": temp_max - 2.0,
        "temp_max": temp_max,
        "chemistry": "NMC",
    }
    body = client.post("/predict", json=payload).get_json()
    assert body["thermal_safety"]["risk_level"] == expected_level
    assert body["thermal_safety"]["relay_cutoff_tripped"] is expected_tripped


@pytest.mark.parametrize(
    ("cycle", "temp_max", "expected_condition", "expected_grade"),
    [
        (80, 27.0, "GOOD", "GRADE A"),
        (290, 30.0, "WARNING", "GRADE B"),
        (450, 35.0, "CRITICAL", "GRADE C"),
    ],
)
def test_predict_second_life_grade_bands(client, cycle, temp_max, expected_condition, expected_grade):
    payload = {
        "cycle": cycle,
        "voltage_avg": 3.7,
        "current_avg": 2.0,
        "temp_avg": temp_max - 2.0,
        "temp_max": temp_max,
        "chemistry": "NMC",
    }
    body = client.post("/predict", json=payload).get_json()
    assert body["condition"] == expected_condition
    assert body["second_life"]["grade"] == expected_grade


def test_predict_invalid_payload_returns_400(client):
    resp = client.post("/predict", json={"cycle": "invalid-cycle"})
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["success"] is False
    assert "error" in body


def test_metrics_endpoint_present_and_missing(client, tmp_path, monkeypatch):
    resp = client.get("/metrics")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["success"] is True
    assert "Random_Forest" in body["metrics"]

    monkeypatch.setattr(api_app, "MODELS_DIR", str(tmp_path))
    missing_resp = client.get("/metrics")
    assert missing_resp.status_code == 404
    assert missing_resp.get_json()["success"] is False


@given(
    cycle=st.integers(min_value=1, max_value=600),
    voltage_avg=st.floats(min_value=2.6, max_value=4.2, allow_nan=False, allow_infinity=False),
    current_avg=st.floats(min_value=0.1, max_value=5.0, allow_nan=False, allow_infinity=False),
    temp_avg=st.floats(min_value=15.0, max_value=55.0, allow_nan=False, allow_infinity=False),
    temp_delta=st.floats(min_value=0.0, max_value=10.0, allow_nan=False, allow_infinity=False),
    chemistry=st.sampled_from(["NMC", "LFP"]),
)
@settings(max_examples=25, deadline=None)
def test_predict_invariants_property_based(cycle, voltage_avg, current_avg, temp_avg, temp_delta, chemistry):
    with tempfile.TemporaryDirectory() as tmpdir:
        orig_db = api_app.DB_PATH
        try:
            api_app.DB_PATH = f"{tmpdir}/fuzz_predictions.db"
            api_app.init_db()
            api_app.app.config["TESTING"] = True

            with api_app.app.test_client() as test_client:
                resp = test_client.post(
                    "/predict",
                    json={
                        "cycle": cycle,
                        "voltage_avg": voltage_avg,
                        "current_avg": current_avg,
                        "temp_avg": temp_avg,
                        "temp_max": temp_avg + temp_delta,
                        "chemistry": chemistry,
                    },
                )
        finally:
            api_app.DB_PATH = orig_db

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["success"] is True
    assert 10.0 <= body["soh_percent"] <= 100.0
    assert body["degradation_percent"] == pytest.approx(100.0 - body["soh_percent"], abs=0.02)
    assert 0.0 <= body["thermal_safety"]["risk_index"] <= 100.0
    assert body["rul"]["cycles"] >= 0
    assert body["rul"]["km"] >= 0.0
    assert body["condition"] in {"GOOD", "WARNING", "CRITICAL"}
    assert body["second_life"]["grade"] in {"GRADE A", "GRADE B", "GRADE C"}
    assert sum(body["xai"].values()) == pytest.approx(100.0, abs=0.3)
