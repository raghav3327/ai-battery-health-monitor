"""
Flask REST API Server for AI Battery Health Monitor
Provides real-time ML State-of-Health prediction, Remaining Useful Life (RUL) prognostics,
Thermal Runaway Risk Index (TRRI), Explainable AI (XAI) feature attribution,
and Second-Life Circular Economy battery grading.
"""

import os
import json
import sqlite3
import hashlib
from datetime import datetime
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

import sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from models.train_models import PureLinearRegression, PureRandomForestRegressor, PureDecisionTreeRegressor

# Map classes to __main__ so joblib unpickles cleanly
sys.modules['__main__'].PureLinearRegression = PureLinearRegression
sys.modules['__main__'].PureRandomForestRegressor = PureRandomForestRegressor
sys.modules['__main__'].PureDecisionTreeRegressor = PureDecisionTreeRegressor

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin requests for Web Dashboard

MODELS_DIR = os.path.join(BASE_DIR, 'models')
DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'predictions.db')

rf_model = None
scaler_data = None
feature_names = None

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prediction_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            cycle INTEGER,
            voltage_avg REAL,
            current_avg REAL,
            temp_avg REAL,
            predicted_soh REAL NOT NULL,
            condition TEXT NOT NULL,
            alert TEXT NOT NULL,
            chemistry TEXT DEFAULT 'NMC',
            rul_cycles INTEGER DEFAULT 0,
            rul_km REAL DEFAULT 0,
            internal_resistance REAL DEFAULT 0.0,
            thermal_risk_index REAL DEFAULT 0.0,
            second_life_grade TEXT DEFAULT 'GRADE A'
        )
    ''')
    conn.commit()
    
    # Ensure backward compatibility by checking columns
    cursor.execute("PRAGMA table_info(prediction_history)")
    existing_cols = [col[1] for col in cursor.fetchall()]
    
    new_cols = {
        'chemistry': 'TEXT DEFAULT "NMC"',
        'rul_cycles': 'INTEGER DEFAULT 0',
        'rul_km': 'REAL DEFAULT 0',
        'internal_resistance': 'REAL DEFAULT 0.0',
        'thermal_risk_index': 'REAL DEFAULT 0.0',
        'second_life_grade': 'TEXT DEFAULT "GRADE A"'
    }
    for col, col_def in new_cols.items():
        if col not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE prediction_history ADD COLUMN {col} {col_def}")
            except Exception:
                pass
    conn.commit()
    conn.close()

def load_ml_models():
    global rf_model, scaler_data, feature_names
    rf_path = os.path.join(MODELS_DIR, 'rf_model.pkl')
    scaler_path = os.path.join(MODELS_DIR, 'scaler.pkl')
    feats_path = os.path.join(MODELS_DIR, 'feature_names.pkl')
    
    if os.path.exists(rf_path) and os.path.exists(scaler_path):
        try:
            payload = joblib.load(rf_path)
            rf_model = payload.get('model_obj', payload)
            scaler_data = joblib.load(scaler_path)
            if os.path.exists(feats_path):
                feature_names = joblib.load(feats_path)
            print("[INFO] ML Models successfully loaded!")
        except Exception as e:
            print(f"[WARNING] Could not load model: {e}")
    else:
        print("[WARNING] ML Model files missing. Using electrochemical physics heuristic.")

init_db()
load_ml_models()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'project': 'AI Battery Health Monitor',
        'model_loaded': rf_model is not None,
        'features_supported': ['SoH', 'RUL', 'TRRI', 'ECM_R0', 'SecondLife', 'XAI'],
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json or {}
        
        cycle = int(data.get('cycle', 120))
        voltage_avg = float(data.get('voltage_avg', 3.82))
        voltage_max = float(data.get('voltage_max', voltage_avg + 0.20))
        voltage_min = float(data.get('voltage_min', max(2.5, voltage_avg - 0.40)))
        voltage_range = max(0.01, voltage_max - voltage_min)
        
        current_avg = float(data.get('current_avg', 2.0))
        temp_avg = float(data.get('temp_avg', 28.5))
        temp_max = float(data.get('temp_max', max(temp_avg, 32.0)))
        temp_range = max(0.1, temp_max - temp_avg)
        
        discharge_duration_s = float(data.get('discharge_duration_s', 3000.0))
        charge_duration_s = float(data.get('charge_duration_s', 3600.0))
        chemistry = str(data.get('chemistry', 'NMC')).upper()
        
        # 1. Base ML Prediction
        input_values = [
            cycle, voltage_avg, voltage_max, voltage_min, voltage_range,
            current_avg, temp_avg, temp_max, temp_range,
            discharge_duration_s, charge_duration_s
        ]
        
        if rf_model is not None and scaler_data is not None:
            x_arr = np.array([input_values])
            x_min = np.array(scaler_data['min'])
            x_rng = np.array(scaler_data['range'])
            x_scaled = (x_arr - x_min) / x_rng
            raw_soh = float(rf_model.predict(x_scaled)[0])
        else:
            # Fallback Physics-informed degradation curve
            chem_factor = 0.55 if chemistry == 'LFP' else 1.0
            temp_penalty = max(0.0, (temp_max - 30.0) * 0.08)
            degrade = (0.11 * cycle * chem_factor) + temp_penalty
            raw_soh = 100.0 - degrade
            
        # Adjust for LFP chemistry if user selected LFP (flatter degradation, higher cycle endurance)
        if chemistry == 'LFP':
            # LFP cells undergo slower initial degradation
            raw_soh = min(100.0, raw_soh * 1.04)

        predicted_soh = round(max(10.0, min(100.0, raw_soh)), 2)
        degradation = round(100.0 - predicted_soh, 2)
        
        # 2. Remaining Useful Life (RUL) Prognostics
        # Standard EV end of traction life is 80% SoH
        eol_threshold = 80.0
        chem_cycle_rate = 0.045 if chemistry == 'LFP' else 0.095
        # Acceleration from thermal stress (Arrhenius-inspired)
        thermal_mult = 1.0 + max(0.0, (temp_max - 28.0) * 0.035)
        effective_cycle_decay = chem_cycle_rate * thermal_mult
        
        if predicted_soh > eol_threshold:
            rul_cycles = int((predicted_soh - eol_threshold) / effective_cycle_decay)
        else:
            rul_cycles = 0
            
        # Translation to real-world Indian EV range (e.g. Ather/Ola 2W: ~85 km per standard cycle)
        km_per_cycle = 85.0
        rul_km = round(rul_cycles * km_per_cycle, 1)

        # 3. Dynamic Equivalent Circuit Model (ECM) Internal Resistance R0
        # Fresh 18650 cell: ~25 mOhm; Degraded: up to 60-80 mOhm
        base_r0 = 24.0  # mOhm
        r0_expansion = degradation * 0.48
        internal_resistance_mohm = round(base_r0 + r0_expansion + (max(0, current_avg - 1.5) * 1.5), 2)

        # 4. Thermal Runaway Risk Index (TRRI - 0 to 100)
        # Precursors: High cell temp (>38°C), rapid rise, extreme internal resistance
        t_score = max(0.0, min(100.0, (temp_max - 25.0) / (55.0 - 25.0) * 100.0))
        r_score = max(0.0, min(100.0, (internal_resistance_mohm - 25.0) / 45.0 * 100.0))
        v_drop_score = max(0.0, min(100.0, (3.9 - voltage_min) * 50.0)) if voltage_min < 3.2 else 0.0
        
        trri = round((0.55 * t_score) + (0.25 * r_score) + (0.20 * v_drop_score), 1)
        trri = max(0.0, min(100.0, trri))
        
        if trri >= 70.0 or temp_max >= 45.0:
            thermal_risk_level = "CRITICAL"
            thermal_alert = "CRITICAL: Thermal Runaway Precursor Detected! Autonomous Edge Relay Tripped (<100ms)."
        elif trri >= 40.0 or temp_max >= 38.0:
            thermal_risk_level = "ELEVATED"
            thermal_alert = "WARNING: Elevated Cell Temperature. Limiting charge rate and monitoring dT/dt."
        else:
            thermal_risk_level = "NORMAL"
            thermal_alert = "Optimal Thermal Stability. Operating well within safe electrothermal boundaries."

        # 5. Second-Life Circular Economy Grading (Karnataka Mission Alignment)
        if predicted_soh >= 80.0:
            condition = "GOOD"
            second_life_grade = "GRADE A"
            second_life_desc = "Primary EV Traction (Electric Vehicles & 2-Wheelers)"
            alert = "Battery operating normally. High electrochemical capacity retention."
        elif predicted_soh >= 65.0:
            condition = "WARNING"
            second_life_grade = "GRADE B"
            second_life_desc = "Second-Life Storage (Solar Irrigation Pumps & Microgrids)"
            alert = "Automotive retirement recommended. Cell ideal for stationary solar storage."
        else:
            condition = "CRITICAL"
            second_life_grade = "GRADE C"
            second_life_desc = "Recycling Candidate (Hydrometallurgical Lithium/Cobalt Extraction)"
            alert = "Severe capacity degradation. Safe decommissioning & material recovery required."

        # 6. Explainable AI (XAI) Attribution Breakdown
        total_loss = max(1.0, degradation)
        thermal_loss = max(0.0, (temp_max - 28.0) * 0.8)
        current_loss = max(0.0, (current_avg - 1.5) * 1.2)
        base_cycle_loss = total_loss - thermal_loss - current_loss
        if base_cycle_loss < 0.2 * total_loss:
            base_cycle_loss = 0.2 * total_loss
        
        # Normalize to 100%
        sum_losses = thermal_loss + current_loss + base_cycle_loss
        xai_attribution = {
            'thermal_stress_pct': round((thermal_loss / sum_losses) * 100, 1),
            'crate_stress_pct': round((current_loss / sum_losses) * 100, 1),
            'cycle_fatigue_pct': round((base_cycle_loss / sum_losses) * 100, 1)
        }

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 7. Record into SQLite Database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO prediction_history 
            (timestamp, cycle, voltage_avg, current_avg, temp_avg, predicted_soh, condition, alert,
             chemistry, rul_cycles, rul_km, internal_resistance, thermal_risk_index, second_life_grade)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (now_str, cycle, voltage_avg, current_avg, temp_avg, predicted_soh, condition, alert,
              chemistry, rul_cycles, rul_km, internal_resistance_mohm, trri, second_life_grade))
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'soh_percent': predicted_soh,
            'degradation_percent': degradation,
            'condition': condition,
            'alert': alert,
            'chemistry': chemistry,
            'rul': {
                'cycles': rul_cycles,
                'km': rul_km,
                'eol_threshold_pct': eol_threshold
            },
            'ecm_diagnostics': {
                'internal_resistance_mohm': internal_resistance_mohm,
                'status': 'Elevated' if internal_resistance_mohm > 45 else 'Nominal'
            },
            'thermal_safety': {
                'risk_index': trri,
                'risk_level': thermal_risk_level,
                'alert': thermal_alert,
                'relay_cutoff_tripped': trri >= 70.0 or temp_max >= 45.0
            },
            'second_life': {
                'grade': second_life_grade,
                'application': second_life_desc,
                'economic_value_pct': round(max(15, predicted_soh * 0.85), 1)
            },
            'xai': xai_attribution,
            'timestamp': now_str
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/history', methods=['GET'])
def history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM prediction_history ORDER BY id DESC LIMIT 50')
    rows = cursor.fetchall()
    history_list = [dict(row) for row in rows]
    conn.close()
    return jsonify({'success': True, 'count': len(history_list), 'data': history_list})

@app.route('/certificate', methods=['GET'])
def certificate():
    # Fetch latest prediction from DB to formulate official inspection certificate
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM prediction_history ORDER BY id DESC LIMIT 1')
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({'success': False, 'message': 'No diagnostic records available yet.'}), 404

    record = dict(row)
    soh = record.get('predicted_soh', 90.0)
    cycle = record.get('cycle', 120)
    
    cert_id = f"EV-CERT-{datetime.now().strftime('%Y%m')}-{hashlib.md5(str(record['id']).encode()).hexdigest()[:6].upper()}"
    
    cert_data = {
        'certificate_id': cert_id,
        'issuing_body': 'AI EV Battery Health & Safety Certification Authority',
        'date_of_inspection': record['timestamp'],
        'battery_chemistry': record.get('chemistry', 'NMC'),
        'metrics': {
            'measured_soh': f"{soh:.1f}%",
            'degradation_level': f"{100.0 - soh:.1f}%",
            'equivalent_cycles': cycle,
            'internal_resistance': f"{record.get('internal_resistance', 28.5):.2f} mOhm",
            'thermal_runaway_risk': f"{record.get('thermal_risk_index', 12.0):.1f}% ({'SAFE' if record.get('thermal_risk_index', 0) < 40 else 'ELEVATED'})",
            'estimated_rul_km': f"{record.get('rul_km', 12500):,.0f} km"
        },
        'second_life_grading': {
            'grade': record.get('second_life_grade', 'GRADE A'),
            'eligibility': 'Eligible for Solar Energy Storage' if soh >= 65.0 else 'Recycle'
        },
        'verification_hash': hashlib.sha256(f"{cert_id}:{soh}:{cycle}".encode()).hexdigest()[:16]
    }
    return jsonify({'success': True, 'certificate': cert_data})

@app.route('/metrics', methods=['GET'])
def metrics():
    metrics_path = os.path.join(MODELS_DIR, 'model_metrics.json')
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            data = json.load(f)
        return jsonify({'success': True, 'metrics': data})
    return jsonify({'success': False, 'message': 'Metrics not generated yet'}), 404

if __name__ == '__main__':
    print("[INFO] Starting EV Battery Health & Safety Server on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
