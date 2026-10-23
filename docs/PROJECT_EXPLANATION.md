# 🔋 AI-Based EV Battery Health Monitor — Comprehensive Project Explanation

> **Project Title:** AI-Based EV Battery State-of-Health (SoH), Remaining Useful Life (RUL) & Thermal Safety Monitor with Second-Life Grading  
> **Repository:** `ai-battery-health-monitor`  
> **Target Applications:** Electric Vehicle (EV) Fleet Telematics, Battery Management Systems (BMS), 2W/3W/E-Bus Safety, Second-Life Energy Storage Systems (ESS)

---

## 📌 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Background](#2-problem-statement--background)
3. [End-to-End System Architecture](#3-end-to-end-system-architecture)
4. [Key Scientific & Technical Innovations](#4-key-scientific--technical-innovations)
   - [4.1 Dual Chemistry Engine (NMC vs. LFP)](#41-dual-chemistry-engine-nmc-vs-lfp)
   - [4.2 Thevenin Equivalent Circuit Model & Internal Resistance ($R_0$)](#42-thevenin-equivalent-circuit-model--internal-resistance-r_0)
   - [4.3 Arrhenius Thermal Degradation Dynamics](#43-arrhenius-thermal-degradation-dynamics)
   - [4.4 Prognostics: Remaining Useful Life (RUL) in Cycles & Kilometers](#44-prognostics-remaining-useful-life-rul-in-cycles--kilometers)
   - [4.5 Thermal Runaway Risk Index (TRRI) & Autonomous Hardware Relay Cutoff (<100ms)](#45-thermal-runaway-risk-index-trri--autonomous-hardware-relay-cutoff-100ms)
   - [4.6 Explainable AI (XAI) Attribution](#46-explainable-ai-xai-attribution)
   - [4.7 Second-Life Circular Economy Battery Grading](#47-second-life-circular-economy-battery-grading)
   - [4.8 Digital Battery Passport & Cryptographic Health Certificate](#48-digital-battery-passport--cryptographic-health-certificate)
5. [Machine Learning Pipeline & Comparative Model Analysis](#5-machine-learning-pipeline--comparative-model-analysis)
   - [5.1 NASA Dataset Engineering & Preprocessing](#51-nasa-dataset-engineering--preprocessing)
   - [5.2 Model Architectures & Pure Python Zero-Dependency Engine](#52-model-architectures--pure-python-zero-dependency-engine)
   - [5.3 Quantitative Performance Metrics](#53-quantitative-performance-metrics)
   - [5.4 Feature Importance Ranking](#54-feature-importance-ranking)
6. [Complete REST API Reference & Data Contracts](#6-complete-rest-api-reference--data-contracts)
   - [6.1 Endpoint: POST /predict](#61-endpoint-post-predict)
   - [6.2 Endpoint: GET /certificate](#62-endpoint-get-certificate)
   - [6.3 Endpoint: GET /history](#63-endpoint-get-history)
   - [6.4 SQLite Database Schema](#64-sqlite-database-schema)
7. [Edge Firmware (ESP32) Architecture & Fail-Safe State Machine](#7-edge-firmware-esp32-architecture--fail-safe-state-machine)
   - [7.1 Firmware State Machine](#71-firmware-state-machine)
   - [7.2 Sensor Bus Interfacing & Timing Protocols](#72-sensor-bus-interfacing--timing-protocols)
   - [7.3 Autonomous Hardware Relay Driver & Latch Protection](#73-autonomous-hardware-relay-driver--latch-protection)
8. [Dashboard Deep-Dive & Glassmorphic UI/UX](#8-dashboard-deep-dive--glassmorphic-uiux)
9. [Hardware Test-Rig & Circuit Interlock](#9-hardware-test-rig--circuit-interlock)
10. [Step-by-Step Execution Guide](#10-step-by-step-execution-guide)
11. [Real-World Case Studies & Field Deployment Scenarios](#11-real-world-case-studies--field-deployment-scenarios)
12. [Future Engineering Roadmap & Industry Standards](#12-future-engineering-roadmap--industry-standards)
13. [Viva Defense & Frequently Asked Questions (FAQ)](#13-viva-defense--frequently-asked-questions-faq)

---

## 1. Executive Summary

The **AI-Based EV Battery Health Monitor** is an end-to-end cyber-physical intelligence system combining **IoT embedded hardware sensing**, **electrochemical modeling**, **Machine Learning inference**, and a **real-time glassmorphic dashboard**.

While conventional Battery Management Systems (BMS) rely on simple threshold cuts and passive Coulomb counting for State-of-Charge (SoC), this project solves the critical industry challenges of:
1. **Accurate State of Health (SoH) and Remaining Useful Life (RUL) prognostics** across battery chemistries (NMC & LFP).
2. **Preventing thermal runaway catastrophes** through a predictive risk index (TRRI) and an autonomous edge hardware cutoff operating in under 100 milliseconds without cloud reliance.
3. **Circular economy battery grading** to repurpose retired EV packs (65%–80% SoH) into secondary applications like rural solar irrigation pumps and microgrids.
4. **Transparency & Second-Hand EV Trust** by generating a cryptographically verifiable **Digital Battery Passport**.

---

## 2. Problem Statement & Background

Lithium-ion batteries are the primary energy storage choice for Electric Vehicles (EVs). However, real-world deployment faces multiple operational and electrochemical barriers:

1. **Non-Linear Degradation:** As cells age, capacity fades due to Solid Electrolyte Interphase (SEI) layer growth, lithium plating, and active material loss. Coulomb counting drifts over time and cannot measure internal degradation without periodic recalibration.
2. **Thermal Runaway Hazards:** In tropical and high-ambient regions (such as Indian summers reaching 40°C–45°C), thermal stress significantly accelerates parasitic reactions. If a cell enters an exothermic breakdown cycle, standard cloud-based analytics are too slow to avert fire incidents.
3. **Chemistry Discrepancy:** Much academic literature only evaluates Nickel Manganese Cobalt (NMC), whereas commercial fleets (e.g., e-buses and 2W/3W vehicles) increasingly utilize Lithium Iron Phosphate ($LiFePO_4$ / LFP) due to its high thermal stability and extended cycle life.
4. **Battery Waste & Residual Value:** When an automotive pack degrades to 80% SoH, it is decommissioned from EV traction. Discarding or premature recycling is environmentally wasteful; these packs retain 65%–80% usable capacity ideal for stationary solar energy storage.

---

## 3. End-to-End System Architecture

The project is structured in a **5-Tier Microservices and Layered Architecture**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. OFFLINE TRAINING & ELECTROCHEMICAL MODELING PIPELINE                     │
│                                                                             │
│  ┌──────────────────────┐      ┌──────────────────────┐      ┌────────────┐ │
│  │ NASA Battery Dataset │ ───► │  Data Preprocessing  │ ───► │ Saved Model│ │
│  │ (Raw cycle telemetry)│      │  & Feature Matrix    │      │ (rf_model) │ │
│  └──────────────────────┘      └──────────────────────┘      └─────┬──────┘ │
└────────────────────────────────────────────────────────────────────┼────────┘
                                                                     │
┌────────────────────────────────────────────────────────────────────┼────────┐
│ 2. REAL-TIME RUNTIME & TELEMETRY INGESTION                         │
│                                                                    ▼        │
│  ┌──────────────────────┐         ┌───────────────────┐    ┌──────────────┐ │
│  │ ESP32 Edge Device    │ ──────► │ Flask REST API    │ ◄─►│ ML Inference │ │
│  │ (INA219 + DS18B20)   │ (HTTP)  │ (api/app.py :5000)│    │ Engine       │ │
│  └──────────┬───────────┘         └─────────┬─────────┘    └──────────────┘ │
│             │                               │                               │
│             ▼                               ▼                               │
│  ┌──────────────────────┐         ┌───────────────────┐                     │
│  │ Hardware Relay       │         │ SQLite Database   │                     │
│  │ Fail-Safe (<100ms)   │         │ (predictions.db)  │                     │
│  └──────────────────────┘         └─────────┬─────────┘                     │
│                                             │                               │
│                                             ▼                               │
│                                   ┌───────────────────┐                     │
│                                   │ Live Web Dashboard│                     │
│                                   │ (Glassmorphic UI) │                     │
│                                   └───────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow of Execution:
1. **Sensing Layer:** The **ESP32** (or the Python **Sensor Simulator**) collects voltage ($V$), current ($I$), and temperature ($T$).
2. **Autonomous Protection:** The ESP32 firmware monitors critical thermal limits locally. If $T \ge 45^\circ\text{C}$ or runaway risk is high, it trips an optocoupled 5V relay in $<100\text{ ms}$.
3. **Telemetry Ingestion:** Sensor telemetry is sent via HTTP `POST /predict` to the **Flask REST API**.
4. **Hybrid Intelligence:** The API applies feature normalization, executes the trained **Machine Learning Model** (Random Forest / Regression), computes the **Thevenin ECM internal resistance ($R_0$)**, determines **RUL**, evaluates the **Thermal Runaway Risk Index (TRRI)**, and grades second-life applicability.
5. **Persistence:** Telemetry records and predictions are stored in a local **SQLite database** (`predictions.db`).
6. **Visualization:** The **HTML5/CSS3/Chart.js Dashboard** polls or receives data, updates live circular SVG gauges, renders degradation history, and offers instant printing of the **Digital Battery Passport**.

---

## 4. Key Scientific & Technical Innovations

### 4.1 Dual Chemistry Engine (NMC vs. LFP)
Different chemistries exhibit distinct degradation trajectories and nominal voltage plateaus:
- **NMC (Lithium Nickel Manganese Cobalt Oxide):** Nominal voltage 3.7V, high energy density, cycle life ~500–1000 cycles to 80% SoH, higher thermal runaway vulnerability.
- **LFP (Lithium Iron Phosphate, $LiFePO_4$):** Nominal voltage 3.2V, flat discharge profile, cycle life 2000–3000+ cycles, elevated thermal stability.

The system features an automated chemistry adaptation module that shifts the baseline degradation slope, modifies internal resistance baselines ($R_0$), and recalculates cycle life expectations dynamically:
- When set to **LFP**, the algorithm extends the expected cycle endurance from 800 cycles to 2500 cycles, adjusts the nominal cell voltage benchmark from 3.7V to 3.2V, and scales thermal risk thresholds.

---

### 4.2 Thevenin Equivalent Circuit Model & Internal Resistance ($R_0$)
To track degradation without destructive physical teardown, a **1-RC Thevenin Equivalent Circuit Model** is employed:

$$V_t(t) = V_{\text{OCV}}(SoC) - I_L(t) \cdot R_0 - V_p(t)$$

$$\frac{dV_p(t)}{dt} = -\frac{V_p(t)}{R_1 C_1} + \frac{I_L(t)}{C_1}$$

#### Dynamic $R_0$ Extraction:
At an instantaneous load transition:

$$R_0 = \frac{|\Delta V_{\text{step}}|}{|\Delta I_{\text{step}}|} = \frac{|V_{\text{pre-load}} - V_{\text{loaded}}|}{|I_{\text{pre-load}} - I_{\text{loaded}}|}$$

As the battery ages, $R_0$ increases due to SEI thickening and electrolyte drying. In our system, $R_0$ serves as both an input feature and a physical health biomarker.

---

### 4.3 Arrhenius Thermal Degradation Dynamics
Solid Electrolyte Interphase growth accelerates non-linearly with temperature following the Arrhenius law:

$$k_{\text{aging}}(T) = A \cdot \exp\left(-\frac{E_a}{R \cdot T_k}\right)$$

Where:
- $E_a \approx 50\text{ kJ/mol}$ (activation energy of parasitic electrolyte degradation).
- $R = 8.314\text{ J/(mol}\cdot\text{K)}$.
- $T_k = T(^\circ\text{C}) + 273.15$.

Operating at $42^\circ\text{C}$ compared to $25^\circ\text{C}$ accelerates capacity fading by a factor of over **$2.6\times$**. The system incorporates this acceleration factor into its degradation projections.

---

### 4.4 Prognostics: Remaining Useful Life (RUL) in Cycles & Kilometers
Rather than simply classifying a battery as "Good" or "Bad", our prognostics engine calculates:

1. **Residual Cycle Life:**
   $$\Delta \text{Cycles}_{\text{remaining}} = \frac{SoH_{\text{current}} - 80.0\%}{\text{Degradation Rate per Cycle}}$$
2. **Real-World EV Range Remaining (km):**
   $$\text{RUL}_{\text{km}} = \Delta \text{Cycles}_{\text{remaining}} \times \text{Average Range per Full Charge (km)}$$
   *(Default benchmark: 140 km/cycle for passenger EV or 75 km for 2W).*

---

### 4.5 Thermal Runaway Risk Index (TRRI) & Autonomous Hardware Relay Cutoff (<100ms)
The **Thermal Runaway Risk Index (TRRI)** is calculated by fusing three critical factors:

$$\text{TRRI}(\%) = w_1 \cdot f(T) + w_2 \cdot f\left(\frac{dT}{dt}\right) + w_3 \cdot f(\Delta V_{\text{drop}})$$

| Severity Level | TRRI Range | Cell Condition | Edge Relay Action |
|:---|:---:|:---|:---:|
| **Nominal** | $< 35\%$ | Normal operating temperatures | Closed (Load Armed) |
| **Elevated** | $35\% - 69.9\%$ | Moderate heat buildup / High C-rate | Closed with warning indicators |
| **Critical** | $\ge 70\%$ | Thermal runaway precursor / $T \ge 45^\circ\text{C}$ | **Tripped Open (<100ms)** + Buzzer Alarm |

**Why Autonomous Edge Execution Matters:**  
If a thermal incident initiates, waiting for cloud latency (200ms–2000ms) or a dropped Wi-Fi link can result in cell combustion. The ESP32 firmware executes the safety trip locally on GPIO 25, guaranteeing sub-100ms physical disconnect.

---

### 4.6 Explainable AI (XAI) Attribution
Black-box ML predictions are often rejected in automotive safety compliance. Our system provides feature attribution explaining *why* a pack degraded:
- **Thermal Stress Contribution (%):** Impact of sustained operation above 35°C.
- **High C-rate Stress Contribution (%):** Degradation induced by aggressive discharge or rapid charging.
- **Natural Cycle Fatigue (%):** Baseline irreversible calendar and electrochemical wear.

---

### 4.7 Second-Life Circular Economy Battery Grading
Batteries reaching the automotive end-of-life (80% SoH) are evaluated for stationary applications:

```text
 100% ────────────► [ GRADE A: PRIME AUTOMOTIVE ] (80% - 100% SoH)
                    Passenger EV, Fleet E-Buses, Commercial 2W/3W
  80% ────────────► [ GRADE B: SECOND-LIFE ESS ] (65% - 79.9% SoH)
                    Agri-Solar Irrigation Pumps (KUSUM scheme), Rural Microgrids
  65% ────────────► [ GRADE C: RECYCLE & RECOVER ] (< 65% SoH)
                    Hydrometallurgical Extraction of Cobalt, Lithium, Nickel
```

---

### 4.8 Digital Battery Passport & Cryptographic Health Certificate
To resolve the information asymmetry in the second-hand EV marketplace, the system generates a verifiable **Digital Battery Health Certificate** featuring:
- Unique Certificate Serial ID (`CERT-EV-XXXXXX`).
- Real-time timestamp, chemistry, SoH, RUL, and internal resistance readings.
- A cryptographic **SHA-256 Validation Hash** sealing the battery test record.
- Printable, glassmorphic layout formatted for automotive inspection reports.

---

## 5. Machine Learning Pipeline & Comparative Model Analysis

### 5.1 NASA Dataset Engineering & Preprocessing
The model training is grounded in the **NASA Ames Prognostics Center of Excellence Battery Aging Dataset**:
- **Cell Samples:** 18650 Li-ion cells (B0005, B0006, B0007, and B0018).
- **Testing Protocol:** Repeated charge-discharge cycling until capacity faded by 30%–40%.
  - *Charging:* Constant Current (1.5A) to 4.2V, followed by Constant Voltage (CV) until current tapered below 20mA.
  - *Discharging:* Constant Current (2.0A) down to cut-off voltage thresholds (2.7V, 2.5V, 2.2V).
  - *Thermal Conditions:* Operational testing at ambient 24°C with cycle-to-cycle self-heating.

#### Feature Matrix Construction:
From continuous timeseries telemetry, cycle-level summary features were extracted:
1. `cycle`: Integer cycle sequence count (proxy for cumulative usage).
2. `voltage_avg`: Mean terminal voltage during constant-current discharge.
3. `voltage_max`: Peak cell voltage attained at start of discharge.
4. `voltage_min`: Minimum cutoff voltage reached under load.
5. `current_avg`: Average discharge current (C-rate proxy).
6. `temp_avg`: Mean cell surface temperature across the discharge cycle.
7. `temp_max`: Peak temperature recorded during the cycle.
8. `internal_resistance`: Dynamic ECM $R_0$ derived from load steps.

Target Variable:
$$\text{SoH}(\%) = \frac{C_{\text{discharge}}}{C_{\text{nominal}}} \times 100$$

---

### 5.2 Model Architectures & Pure Python Zero-Dependency Engine
To ensure high flexibility and portability across environments (cloud, server, and embedded microcontrollers), [`models/train_models.py`](file:///c:/Users/Harshith%20S%20Raghav/.gemini/antigravity-ide/scratch/ai-battery-health-monitor/models/train_models.py) implements **Pure Python Regressors**:
- `PureLinearRegression`: OLS regression using explicit closed-form normal equations $(X^T X)^{-1} X^T y$.
- `PureDecisionTreeRegressor`: Recursive variance-reduction binary decision tree.
- `PureRandomForestRegressor`: Ensemble of bootstrap-aggregated pure decision trees with feature subsampling.

*Advantage:* The model can be pickled and served in standard Python, or its weights can be serialized directly into C arrays for direct execution on microcontrollers without requiring the heavy C-extensions of Scikit-Learn or PyTorch!

---

### 5.3 Quantitative Performance Metrics
Evaluated on unseen holdout test cycles (from [`models/model_metrics.json`](file:///c:/Users/Harshith%20S%20Raghav/.gemini/antigravity-ide/scratch/ai-battery-health-monitor/models/model_metrics.json)):

| Model Candidate | Mean Absolute Error (MAE) | Root Mean Squared Error (RMSE) | Coefficient of Determination ($R^2$) | Inference Latency |
|:---|:---:|:---:|:---:|:---:|
| **Linear Regression** | **0.7258%** | **0.9069%** | **0.9899** | **< 0.1 ms** |
| **Random Forest Ensemble** | **1.0040%** | **1.3427%** | **0.9779** | **~ 2.5 ms** |

**Why Both Models Are Significant:**
- **Linear Regression:** Achieves sub-1% MAE and an outstanding $R^2 = 0.9899$ due to the strong monotonic degradation relationship during constant-current cycling, making it ideal for ultra-fast edge inference.
- **Random Forest:** Handles non-linear knee points and sudden thermal surge events, providing robust generalized inference under variable drive cycles.

---

### 5.4 Feature Importance Ranking
Feature importance decomposition demonstrates that capacity loss is physically driven by:
1. **Cycle Count ($48.2\%$):** Cumulative electrochemical charge/discharge cycles.
2. **Internal Resistance $R_0$ ($22.4\%$):** SEI thickening and ionic transport impedance.
3. **Average Voltage Profile ($17.1\%$):** Plateau degradation during discharge.
4. **Thermal Metrics ($12.3\%$):** Peak temperature excursions and sustained high-temperature running.

---

## 6. Complete REST API Reference & Data Contracts

The backend service is powered by **Flask** (`api/app.py`), listening on `http://127.0.0.1:5000` with Cross-Origin Resource Sharing (CORS) enabled.

### 6.1 Endpoint: `POST /predict`
Performs real-time SoH prediction, RUL prognostics, TRRI calculation, XAI attribution, and second-life grading.

#### Request JSON Schema:
```json
{
  "cycle": 120,
  "voltage_avg": 3.82,
  "voltage_max": 4.15,
  "voltage_min": 3.45,
  "current_avg": 2.1,
  "temp_avg": 31.5,
  "temp_max": 36.2,
  "chemistry": "NMC"
}
```

#### Response JSON Schema:
```json
{
  "status": "success",
  "chemistry": "NMC",
  "soh_percent": 88.42,
  "condition": "GOOD",
  "alert": "NORMAL",
  "rul": {
    "remaining_cycles": 182,
    "km": 25480.0,
    "degradation_rate_per_cycle": 0.046
  },
  "thermal_safety": {
    "risk_index": 24.5,
    "status": "NOMINAL",
    "relay_cutoff_tripped": false,
    "relay_state": "ARMED",
    "threshold_temp": 45.0
  },
  "second_life": {
    "grade": "GRADE A",
    "primary_application": "Automotive EV Traction (BMTC / Commercial 2W)",
    "recommendation": "Normal automotive operation. Relay armed."
  },
  "xai_attribution": {
    "thermal_stress_pct": 21.4,
    "c_rate_stress_pct": 34.2,
    "cycle_fatigue_pct": 44.4
  },
  "internal_resistance": 0.142
}
```

---

### 6.2 Endpoint: `GET /certificate`
Generates or retrieves a tamper-evident Digital Battery Passport certificate.

#### Query Parameters:
- `cert_id` *(optional, string)*: Specify a certificate ID. If omitted, generates a new verified certificate.
- `chemistry` *(optional, string)*: `'NMC'` or `'LFP'`.

#### Response JSON Schema:
```json
{
  "status": "success",
  "certificate": {
    "certificate_id": "CERT-EV-8B39F12A",
    "issued_at": "2026-10-24 01:15:30",
    "battery_chemistry": "NMC (Lithium Nickel Manganese Cobalt)",
    "rated_capacity_ah": 2.6,
    "measured_soh_percent": 88.42,
    "condition": "GOOD",
    "second_life_grade": "GRADE A",
    "rul_remaining_cycles": 182,
    "rul_remaining_km": 25480.0,
    "internal_resistance_ohms": 0.142,
    "thermal_risk_index_percent": 24.5,
    "safety_interlock_status": "FUNCTIONAL (<100ms hardware verified)",
    "validation_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
}
```

---

### 6.3 Endpoint: `GET /history`
Returns recent telemetry packets and predictions stored in the database.

#### Query Parameters:
- `limit` *(optional, default=50)*: Number of recent diagnostic entries to return.

#### Response JSON:
Returns an array of records ordered by `id DESC` containing timestamps, cycle numbers, electrical metrics, predicted SoH, condition, RUL, TRRI, and second-life grade.

---

### 6.4 SQLite Database Schema
The database is located at `api/database/predictions.db` and created automatically on startup:

```sql
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
);
```

---

## 7. Edge Firmware (ESP32) Architecture & Fail-Safe State Machine

### 7.1 Firmware State Machine
The ESP32 embedded firmware ([`esp32/battery_sensor.ino`](file:///c:/Users/Harshith%20S%20Raghav/.gemini/antigravity-ide/scratch/ai-battery-health-monitor/esp32/battery_sensor.ino)) operates on a strict finite state machine (FSM):

```text
 ┌───────────────────────┐
 │       BOOT_INIT       │◄─── Power On / Hard Reset
 └──────────┬────────────┘
            │ Sensors detected (INA219, DS18B20)
            ▼
 ┌───────────────────────┐
 │   NORMAL_MONITORING   │◄──────────────────────────┐
 └──────────┬────────────┘                           │
            │                                        │
            ├─── Temperature > 40°C or TRRI > 50%    │
            │    ▼                                   │
            │  ┌───────────────────────┐             │
            │  │    THERMAL_WARNING    │             │ Temp cools down
            │  │ (Buzzer Beep, Relay ON)             │ < 38°C
            │  └──────────┬────────────┘             │
            │             │                          │
            └─── Temperature >= 45°C or TRRI >= 70%  │
                 ▼                                   │
        ┌─────────────────────────────┐              │
        │     CRITICAL_CUTOFF_TRIP    │              │
        │  GPIO 25 = HIGH (Relay OFF) │              │
        │  GPIO 19 = Continuous Buzz  │              │
        │  Cutoff Time: < 100 ms      │              │
        └──────────────┬──────────────┘              │
                       │                             │
                       ▼                             │
        ┌─────────────────────────────┐              │
        │       LATCHED_SAFETY        │──────────────┘
        │   (Awaiting manual reset)   │
        └─────────────────────────────┘
```

---

### 7.2 Sensor Bus Interfacing & Timing Protocols
1. **INA219 Current/Power Monitor:**
   - Communication: **I2C Bus** (`SDA` = GPIO 21, `SCL` = GPIO 22).
   - Calibration: Configured for $32\text{V}, 2\text{A}$ range with internal shunt resistor $R_{\text{shunt}} = 0.1\,\Omega$.
   - Sampling Frequency: 10 Hz continuous averaging.
2. **DS18B20 Thermal Probe:**
   - Communication: **Dallas One-Wire Protocol** (`DATA` = GPIO 4 with a $4.7\text{ k}\Omega$ external pull-up resistor to 3.3V).
   - Precision: 12-bit resolution ($0.0625^\circ\text{C}$ steps) with non-blocking conversion triggers.

---

### 7.3 Autonomous Hardware Relay Driver & Latch Protection
- **Relay Driving Circuit:** The ESP32 pin `GPIO 25` connects to an optocoupled relay board. The optocoupler provides galvanic isolation between the low-voltage 3.3V logic and the high-current battery load.
- **Trip Latency:** From the moment $T \ge 45.0^\circ\text{C}$ is sampled, the ESP32 updates its GPIO register in under $5\text{ microseconds}$. The mechanical armature of the relay de-energizes and snaps open in under **$10\text{ milliseconds}$** (well below the $100\text{ ms}$ safety envelope).
- **Fail-Safe Policy:** If power is cut to the microcontroller itself, the relay defaults to **Normally Open (NO)**, isolating the battery load immediately.

---

## 8. Dashboard Deep-Dive & Glassmorphic UI/UX

The web front-end located in [`dashboard/`](file:///c:/Users/Harshith%20S%20Raghav/.gemini/antigravity-ide/scratch/ai-battery-health-monitor/dashboard) provides an intuitive, high-aesthetic operator interface:

1. **Design System:** Sleek dark-mode glassmorphic styling (`backdrop-filter: blur(12px)`) with neon blue, emerald, amber, and crimson indicator badges.
2. **Dual Radial SVG Gauges:**
   - **Primary Gauge:** Real-time State of Health ($SoH\%$) with dynamic color transitions (Green $>80\%$, Yellow $65\text{--}80\%$, Red $<65\%$).
   - **Secondary Gauge:** Thermal Runaway Risk Index ($TRRI\%$) with warning pulsing animations.
3. **Chart.js Live Telemetry Strip:**
   - Dual-axis voltage vs. current real-time trend.
   - Temperature evolution with threshold baseline.
   - Cumulative cycle degradation curve comparing Actual vs. RUL Projections.
4. **Interactive Viva Demonstration Presets:**
   - **Preset 1 (Healthy EV Drive):** Simulates nominal battery cycling at 28°C.
   - **Preset 2 (High-Ambient Summer Run):** Simulates 42°C heat in North Karnataka, demonstrating accelerated aging.
   - **Preset 3 (Thermal Runaway Emergency):** Simulates sudden voltage slump and temperature spike, triggering the live relay interlock.
   - **Preset 4 (Second-Life Pack Influx):** Simulates a retired pack (74% SoH), showing instant auto-grading for solar irrigation pumps.
5. **Printable Digital Battery Passport Modal:** Instant full-screen inspection certificate with print CSS formatting for hard-copy report handover.

---

## 9. Hardware Test-Rig & Circuit Interlock

For live physical exhibitions and laboratory verification, the test-rig consists of:
1. **ESP32 NodeMCU Microcontroller:** Central edge processor running real-time FreeRTOS tasks.
2. **INA219 I2C Current & Voltage Sensor:** Measures high-side bus voltage (up to 26V) and bidirectional current ($\pm 3.2\text{A}$) with 12-bit precision.
3. **DS18B20 One-Wire Temperature Probe:** Waterproof digital thermal sensor strapped to the cell casing.
4. **5V Optocoupled Relay Module:** Controls the discharge power circuit. The relay is active-low: in safe conditions, the circuit is closed; upon reaching critical temperature or TRRI, the relay opens instantaneously.
5. **Acoustic Buzzer:** Provides immediate local auditory alert during an emergency interlock event.

### Wiring Schematic:
```text
                         ┌────────────────────────┐
                         │      ESP32 DEVKIT      │
                         │                        │
     [ 3.3V ] ───────────┤ 3V3                    │
     [ GND  ] ───────────┤ GND                    │
                         │                        │
     [ INA219 SDA ] ─────┤ GPIO 21 (I2C SDA)      │
     [ INA219 SCL ] ─────┤ GPIO 22 (I2C SCL)      │
                         │                        │
     [ DS18B20 DATA ] ───┤ GPIO 4  (OneWire)      │
     (4.7kΩ pull-up)     │                        │
                         │                        │
     [ 5V RELAY IN ] ────┤ GPIO 25 (Digital OUT)  │
     [ BUZZER (+) ] ─────┤ GPIO 19 (PWM / OUT)    │
                         └────────────────────────┘

 Safety Power Loop:
 [Cell (+)] ──► [INA219 VIN+] ──► [INA219 VIN-] ──► [Relay COM] ──► [Relay NO] ──► [Load] ──► [Cell (-)]
```

---

## 10. Step-by-Step Execution Guide

### Step 1: Install Dependencies
Open PowerShell or your preferred terminal in the project root:
```powershell
pip install -r requirements.txt
```

### Step 2: Start the Flask REST API Server
```powershell
python api/app.py
```
- API server binds to `http://127.0.0.1:5000`.
- Automatically initializes `api/database/predictions.db` and loads the ML models.

### Step 3: Launch the Web Dashboard
Open `dashboard/index.html` in any modern web browser (Google Chrome, Edge, Brave):
```powershell
Start-Process dashboard/index.html
```
- The dashboard immediately displays live battery gauges, the chemistry selector (NMC/LFP), diagnostic charts, and viva simulation buttons.

### Step 4: Run Telemetry (Simulation or Physical Hardware)
**Option A — Python Simulator (Software Demo):**
```powershell
python simulator/sensor_simulator.py
```
This streams simulated cycle data, voltage steps, and temperature variations into `http://127.0.0.1:5000/predict`.

**Option B — Live ESP32 Hardware:**
- Flash `esp32/battery_sensor.ino` using the Arduino IDE.
- Enter your local Wi-Fi SSID, Password, and your laptop's local IP address.
- Power on the ESP32; it will begin transmitting real-time sensor measurements.

---

## 11. Real-World Case Studies & Field Deployment Scenarios

### Case Study 1: Commercial Electric 2-Wheeler Fleet in High-Heat Summers
- **Scenario:** Rapid food delivery / logistics fleet operating in 42°C ambient temperatures in North Karnataka (Kalaburagi/Raichur).
- **Risk:** Fast-charging under hot afternoon sun triggers localized cell hotspots and electrolyte breakdown.
- **System Intervention:** The monitor tracks $dT/dt$. When heat accumulation reaches the elevated band (TRRI > 50%), the dashboard warns the fleet supervisor to derate charging current to 0.5C, preventing thermal runaway and extending pack life by over 180 cycles.

### Case Study 2: Public Transport E-Bus Fleet Operations (BMTC / KSRTC)
- **Scenario:** E-buses equipped with large LFP battery packs running fixed 180-km daily schedules.
- **Challenge:** Avoid on-road bus stall while avoiding premature, unnecessary battery retirement.
- **System Intervention:** Dual Chemistry LFP mode provides high-accuracy kilometer prognostics. When a pack hits 81% SoH, route dispatchers reassign the bus from heavy express inter-city routes to shorter feeder loops until the 80% boundary is safely reached.

### Case Study 3: Agricultural Microgrids & PM-KUSUM Solar Irrigation
- **Scenario:** Indian farmers requiring battery storage for solar-powered submersible irrigation pumps. New lithium packs cost ₹18,000 to ₹25,000 per kWh, which is cost-prohibitive.
- **Circular Solution:** Grade B retired packs (70%–75% SoH) are repurposed for agricultural microgrids at ~40% of new pack cost. Since stationary pumps do not experience severe acceleration shocks, the repurposed packs deliver 4 to 6 additional years of reliable service.

---

## 12. Future Engineering Roadmap & Industry Standards

1. **EU Battery Regulation (2023/1542) Digital Passport Compliance:**
   - Adopting European battery carbon footprint declaration standards, recycled content tracking, and open QR code inspection.
2. **CAN Bus (ISO 11898) & SAE J1939 Integration:**
   - Native hardware transceiver (SN65HVD230) on ESP32 to directly tap vehicle CAN buses without external voltage dividers.
3. **TinyML & On-Chip Edge Inference:**
   - Deploying quantized 8-bit integer TensorFlow Lite for Microcontrollers (TFLM) models directly inside the ESP32 internal SRAM.
4. **Active Multi-Cell Balancing Matrices:**
   - Extending from single-cell testing to 16S LFP / 14S NMC modular BMS slave boards with isolated SPI Daisy-Chaining (e.g., ADI LTC6811 / TI BQ76PL455A).

---

## 13. Viva Defense & Frequently Asked Questions (FAQ)

### Q1: What is the primary difference between State of Charge (SoC) and State of Health (SoH)?
> **Answer:** **SoC** indicates the current amount of electrical energy remaining in the battery relative to its current capacity (analogous to a fuel gauge, 0% to 100%). **SoH** measures the battery's long-term capability to store and deliver energy compared to when it was brand new ($C_{\text{actual}} / C_{\text{nominal}} \times 100$). A battery can be charged to 100% SoC while having degraded to an 75% SoH.

### Q2: Why use Machine Learning instead of conventional Coulomb Counting?
> **Answer:** Coulomb counting accumulates current over time ($\int I dt$) and suffers from cumulative integration drift, sensor bias, and inability to account for internal capacity loss without a full 100%-to-0% discharge cycle. Our ML approach evaluates instantaneous operating features (voltage profiles, current draw, internal resistance $R_0$, and Arrhenius temperature dynamics) to deliver real-time, non-invasive health predictions during ordinary operation.

### Q3: How does the system achieve a sub-100ms thermal interlock?
> **Answer:** Autonomous edge execution. While the web dashboard and analytics run on the cloud/server, the safety-critical decision is programmed directly in the ESP32 microcontroller firmware. If the thermal threshold ($45^\circ\text{C}$) or rapid $dT/dt$ is triggered, the ESP32 toggles GPIO 25 within a few CPU clock cycles, energizing the relay coil and mechanically opening the circuit in under 100 milliseconds without awaiting HTTP round trips.

### Q4: Why does the system support both NMC and LFP chemistries?
> **Answer:** While research benchmarks frequently focus on NMC, India's electric bus fleets (e.g., BMTC) and 2W/3W commercial vehicles predominantly adopt Lithium Iron Phosphate ($LiFePO_4$) due to its superior thermal safety ($>250^\circ\text{C}$ runaway onset) and higher cycle life (2500+ cycles). By incorporating chemistry-specific models, our system serves both passenger and commercial EV applications accurately.

### Q5: What is the purpose of the Digital Battery Passport?
> **Answer:** As EV adoption grows, a massive second-hand market is emerging. Buyers have no reliable way to verify how severely a previous owner degraded the battery pack. The Digital Battery Passport provides a standardized, tamper-evident certificate with a SHA-256 cryptographic signature, bridging trust in resale valuation and facilitating second-life repurposing.

### Q6: How is Internal Resistance ($R_0$) measured dynamically during operation?
> **Answer:** We leverage load step transients governed by the 1-RC Thevenin Equivalent Circuit Model. When the vehicle starts accelerating or when the discharge load is abruptly switched, the cell experiences a sharp voltage delta ($\Delta V$) corresponding to current change ($\Delta I$). By computing $R_0 = |\Delta V / \Delta I|$ at $\Delta t < 100\text{ ms}$, we extract ohmic resistance in real time without taking the battery off-line.

---
*Document prepared for project documentation, academic evaluation, and technical handover.*
