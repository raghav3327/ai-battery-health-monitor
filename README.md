# 🔋 AI-Based EV Battery State-of-Health (SoH), RUL & Thermal Safety Monitor

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Machine Learning](https://img.shields.io/badge/ML-Random_Forest_%7C_XGBoost-FF6F00?style=flat&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Backend](https://img.shields.io/badge/API-Flask_REST-000000?style=flat&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Frontend](https://img.shields.io/badge/Dashboard-HTML5_%2F_CSS3_%2F_Chart.js-E34F26?style=flat&logo=html5&logoColor=white)](https://chartjs.org/)

An end-to-end Machine Learning and IoT embedded system engineered to predict, monitor, and safeguard Electric Vehicle (EV) Lithium-ion batteries. Features **dual chemistry support (NMC & LFP)**, **Remaining Useful Life (RUL) prognostics**, **Thevenin ECM internal resistance estimation ($R_0$)**, **autonomous edge hardware relay cutoff (<100ms)** against thermal runaway, and **Second-Life Circular Economy battery grading**.

---

## 🌟 Award-Winning Core Features

1. **Dual Chemistry Engine (NMC vs. LFP):**
   - Tailored for Indian commercial EV adoption: supports high-energy NMC and thermally stable $LiFePO_4$ (LFP) used in BMTC electric buses and 2W/3W fleets.
2. **Prognostics & Remaining Useful Life (RUL):**
   - Forecasts residual cycles and real-world kilometers remaining before reaching the 80% automotive End-of-Life (EoL) boundary.
3. **Autonomous Edge Safety Interlock (<100ms Cutoff):**
   - Computes real-time **Thermal Runaway Risk Index (TRRI)**.
   - If cell temperature exceeds 45°C or thermal rate of change accelerates, the ESP32 firmware trips a 5V relay autonomously to isolate the load circuit, sounding an acoustic buzzer—even if Wi-Fi or Cloud is down.
4. **Explainable AI (XAI) Attribution:**
   - Decomposes capacity degradation into Thermal Stress %, High C-Rate %, and Natural Cycle Fatigue %.
5. **Second-Life Battery Grading for Rural Karnataka:**
   - Automatically grades retired EV batteries (65%–80% SoH) for secondary deployment in **Karnataka agricultural solar irrigation pumps (KUSUM scheme)**.
6. **Digital Battery Passport & Official Certificate:**
   - Generates verified, printable inspection certificates with unique IDs and cryptographic validation hashes for the second-hand EV market.

---

## 📐 SoH Definition & Degradation Thresholds

$$SoH(\%) = \frac{\text{Current Battery Capacity (Ah)}}{\text{Rated Capacity (Ah)}} \times 100$$

| Battery Grade | SoH Range | Primary Deployment Recommendation | Action / Relay State |
|---|---|---|---|
| **Grade A (Prime)** | **80% – 100%** | Automotive EV Traction (BMTC / Commercial 2W) | Normal operation. Relay Armed (Closed). |
| **Grade B (Second-Life)** | **65% – 79.9%** | **Karnataka Rural Solar Agri-Pumps & Microgrids** | Automotive retirement advised. Repurpose pack. |
| **Grade C (Recycle)** | **< 65%** | Urban Mining & Hydrometallurgical Recycling | Critical capacity loss. Decommission. |

---

## 🗂️ Project Repository Structure

```
ai-battery-health-monitor/
├── data/                         # Data pipeline & raw/processed CSVs
│   ├── raw/
│   │   └── nasa_battery_raw.csv
│   ├── processed/
│   │   └── battery_soh_processed.csv
│   └── prepare_dataset.py
│
├── docs/                         # Strategy, Math & Architecture Specs
│   ├── AWARD_WINNING_STRATEGY.md         # Master strategy, Viva Q&A & Stall layout
│   ├── 01_problem_definition_and_literature_review.md
│   ├── 02_system_architecture.md
│   └── 03_mathematical_modelling_and_algorithms.md # Arrhenius & ECM Thevenin Math
│
├── notebooks/                    # EDA & Model evaluation scripts
│   ├── 01_eda_data_preprocessing.py
│   └── 02_model_training_evaluation.py
│
├── models/                       # Saved ML Models & Training script
│   ├── train_models.py
│   ├── rf_model.pkl
│   ├── scaler.pkl
│   └── model_metrics.json
│
├── api/                          # Flask REST API Server
│   ├── app.py                    # Multi-chemistry, RUL, TRRI & Certificate endpoints
│   └── database/
│       └── predictions.db
│
├── dashboard/                    # Award-Grade Glassmorphic Web Dashboard
│   ├── index.html                # Dual gauges, viva presets, certificate modal
│   ├── css/style.css
│   └── js/
│       └── main.js
│
├── esp32/                        # Edge Firmware with Fail-Safe Interlock
│   └── battery_sensor.ino        # DS18B20 OneWire, INA219, Relay Cutoff & Buzzer
│
├── HARDWARE_REQUIREMENTS.md      # BOM list with INR pricing & exhibition rig wiring
├── requirements.txt
└── README.md
```

---

## 🚀 Quick Execution Guide

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Flask API Server
```bash
python api/app.py
```
API runs on `http://127.0.0.1:5000` with live endpoints:
- `POST /predict`: Real-time SoH, RUL, TRRI & XAI calculation.
- `GET /certificate`: Generates official Digital Battery Passport.
- `GET /history`: Retrieves recent diagnostic records.

### 3. Launch Dashboard UI
Open `dashboard/index.html` directly in your browser or serve via Live Server.

### 4. Flash Hardware ESP32 Firmware
- Open `esp32/battery_sensor.ino` in Arduino IDE.
- Connect DS18B20 (GPIO 4), INA219 (GPIO 21/22), 5V Relay (GPIO 25), and Buzzer (GPIO 19).
- Enter your Wi-Fi credentials and laptop IP address, then upload to ESP32.

---

## 🏆 Project Resources
- 📖 Read the complete [Award-Winning Strategy Guide](file:///c:/Users/Harshith%20S%20Raghav/.gemini/antigravity-ide/scratch/ai-battery-health-monitor/docs/AWARD_WINNING_STRATEGY.md) for exhibition stall checklist and top 10 viva defense questions.
- 📐 Read the [Mathematical Modeling & Algorithms](file:///c:/Users/Harshith%20S%20Raghav/.gemini/antigravity-ide/scratch/ai-battery-health-monitor/docs/03_mathematical_modelling_and_algorithms.md) for Arrhenius degradation and Thevenin ECM equations.
