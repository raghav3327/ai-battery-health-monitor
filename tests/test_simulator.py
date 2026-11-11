"""Unit tests for the IoT telemetry simulator using unittest.mock / monkeypatch."""

from unittest.mock import MagicMock

import requests

from simulator import sensor_simulator


def _stop_after(n_iterations):
    """Return a fake sleep function that raises KeyboardInterrupt after n calls."""
    calls = {"count": 0}

    def fake_sleep(_seconds):
        calls["count"] += 1
        if calls["count"] >= n_iterations:
            raise KeyboardInterrupt

    return fake_sleep


def test_run_simulator_posts_expected_telemetry_payload(monkeypatch):
    posted = []

    def fake_post(url, json=None, timeout=None):
        posted.append((url, json, timeout))
        response = MagicMock()
        response.status_code = 200
        response.json.return_value = {
            "soh_percent": 91.5,
            "condition": "GOOD",
            "rul": {"km": 8500},
            "thermal_safety": {"risk_index": 12.0, "relay_cutoff_tripped": False},
            "second_life": {"grade": "GRADE A"},
        }
        return response

    monkeypatch.setattr(sensor_simulator.requests, "post", fake_post)
    monkeypatch.setattr(sensor_simulator.time, "sleep", _stop_after(2))

    try:
        sensor_simulator.run_simulator(interval_sec=0, chemistry="LFP")
    except KeyboardInterrupt:
        pass

    assert len(posted) == 2
    first_url, first_payload, first_timeout = posted[0]
    _, second_payload, _ = posted[1]

    assert first_url == sensor_simulator.API_URL
    assert first_timeout == 3
    assert first_payload["cycle"] == 80
    assert second_payload["cycle"] == 82
    assert first_payload["chemistry"] == "LFP"
    assert first_payload["voltage_max"] > first_payload["voltage_avg"] > first_payload["voltage_min"]
    assert first_payload["temp_max"] > first_payload["temp_avg"]


def test_run_simulator_handles_connection_error_gracefully(monkeypatch, capsys):
    def failing_post(*_args, **_kwargs):
        raise requests.exceptions.ConnectionError("API down")

    monkeypatch.setattr(sensor_simulator.requests, "post", failing_post)
    monkeypatch.setattr(sensor_simulator.time, "sleep", _stop_after(1))

    try:
        sensor_simulator.run_simulator(interval_sec=0, chemistry="NMC")
    except KeyboardInterrupt:
        pass

    output = capsys.readouterr().out
    assert "[OFFLINE]" in output


def test_run_simulator_logs_non_200_status(monkeypatch, capsys):
    def error_post(*_args, **_kwargs):
        response = MagicMock()
        response.status_code = 500
        return response

    monkeypatch.setattr(sensor_simulator.requests, "post", error_post)
    monkeypatch.setattr(sensor_simulator.time, "sleep", _stop_after(1))

    try:
        sensor_simulator.run_simulator(interval_sec=0, chemistry="NMC")
    except KeyboardInterrupt:
        pass

    output = capsys.readouterr().out
    assert "status code 500" in output
