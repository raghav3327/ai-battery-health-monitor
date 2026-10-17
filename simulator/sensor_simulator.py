"""
Phase 6: IoT Telemetry Sensor Simulator
Simulates realistic battery operating conditions including normal cycling,
high-temperature degradation climates, and thermal runaway precursors.
"""

import time
import random
import requests

API_URL = "http://127.0.0.1:5000/predict"

def run_simulator(interval_sec=3, chemistry="NMC"):
    print("=" * 70)
    print("📡 STARTING IOT EV BATTERY TELEMETRY SIMULATOR")
    print(f"Target API Endpoint: {API_URL}")
    print(f"Active Chemistry: {chemistry}")
    print(f"Sending telemetry packet every {interval_sec} seconds... (Press Ctrl+C to stop)")
    print("=" * 70)
    
    cycle = 80
    base_temp = 28.0
    
    while True:
        try:
            # Simulate gradual battery aging and temperature fluctuations
            voltage = round(3.92 - (0.0012 * (cycle - 80)) + random.uniform(-0.015, 0.015), 3)
            current = round(2.1 + random.uniform(-0.15, 0.15), 2)
            temp = round(base_temp + (0.05 * (cycle - 80)) + random.uniform(-0.4, 0.4), 1)
            
            payload = {
                "cycle": cycle,
                "voltage_avg": voltage,
                "voltage_max": round(voltage + 0.1, 3),
                "voltage_min": round(voltage - 0.25, 3),
                "current_avg": current,
                "temp_avg": round(temp - 2.0, 1),
                "temp_max": temp,
                "chemistry": chemistry
            }
            
            response = requests.post(API_URL, json=payload, timeout=3)
            if response.status_code == 200:
                result = response.json()
                soh = result['soh_percent']
                cond = result['condition']
                rul_km = result.get('rul', {}).get('km', 0)
                trri = result.get('thermal_safety', {}).get('risk_index', 0)
                relay = "TRIPPED" if result.get('thermal_safety', {}).get('relay_cutoff_tripped') else "ARMED"
                grade = result.get('second_life', {}).get('grade', 'GRADE A')
                
                print(f"[CYCLE {cycle:03d}] V: {voltage:.2f}V | I: {current:.2f}A | T: {temp:.1f}°C | "
                      f"SoH: {soh}% ({cond}) | RUL: {rul_km:,.0f}km | TRRI: {trri}% | Relay: {relay} | {grade}")
            else:
                print(f"[ERROR] API returned status code {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"[OFFLINE] Unable to connect to Flask API at {API_URL}. Ensure 'python api/app.py' is running.")
        except Exception as e:
            print(f"[ERROR] {e}")
            
        cycle += 2
        time.sleep(interval_sec)

if __name__ == '__main__':
    run_simulator(interval_sec=3, chemistry="NMC")
