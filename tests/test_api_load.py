"""Live WSGI concurrency and HTTP smoke tests for the Flask REST API."""

import threading
from concurrent.futures import ThreadPoolExecutor

import requests
from werkzeug.serving import make_server

from api import app as api_app


def test_live_http_concurrent_predictions_and_reads(tmp_path, monkeypatch):
    """Verify real HTTP requests and SQLite writes under modest concurrency."""
    test_db = tmp_path / "concurrent_predictions.db"
    monkeypatch.setattr(api_app, "DB_PATH", str(test_db))
    api_app.init_db()

    server = make_server("127.0.0.1", 0, api_app.app, threaded=True)
    port = server.server_port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    base_url = f"http://127.0.0.1:{port}"
    try:
        health = requests.get(f"{base_url}/health", timeout=3)
        assert health.status_code == 200
        assert health.json()["status"] == "healthy"

        def post_prediction(idx):
            resp = requests.post(
                f"{base_url}/predict",
                json={
                    "cycle": 80 + idx,
                    "voltage_avg": 3.85,
                    "current_avg": 2.0,
                    "temp_avg": 27.0,
                    "temp_max": 30.0,
                    "chemistry": "NMC" if idx % 2 == 0 else "LFP",
                },
                timeout=5,
            )
            return resp.status_code, resp.json()["success"]

        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(post_prediction, range(12)))

        assert all(status == 200 and ok for status, ok in results)

        history = requests.get(f"{base_url}/history", timeout=3)
        assert history.status_code == 200
        assert history.json()["count"] == 12

        cert = requests.get(f"{base_url}/certificate", timeout=3)
        assert cert.status_code == 200
        assert cert.json()["certificate"]["certificate_id"].startswith("EV-CERT-")
    finally:
        server.shutdown()
        server.server_close()

