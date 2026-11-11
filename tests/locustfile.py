"""Locust load-test scenario for simulating concurrent ESP32 nodes and dashboard clients.

Run after starting `python api/app.py`:
    python -m pip install locust
    python -m locust -f tests/locustfile.py --host=http://127.0.0.1:5000
"""

import random

from locust import HttpUser, between, task


class BatteryTelemetryUser(HttpUser):
    """Simulates ESP32 telemetry posts and dashboard polling."""

    wait_time = between(0.5, 2.0)

    @task(3)
    def post_predict(self):
        cycle = random.randint(40, 360)
        temp = round(random.uniform(25.0, 48.0), 1)
        self.client.post(
            "/predict",
            json={
                "cycle": cycle,
                "voltage_avg": round(random.uniform(3.2, 4.0), 2),
                "current_avg": round(random.uniform(1.2, 3.2), 2),
                "temp_avg": round(temp - 2.0, 1),
                "temp_max": temp,
                "chemistry": random.choice(["NMC", "LFP"]),
            },
        )

    @task(1)
    def get_history_and_health(self):
        self.client.get("/health")
        self.client.get("/history")

