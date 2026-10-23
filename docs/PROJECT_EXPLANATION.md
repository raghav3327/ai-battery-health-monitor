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
5. [Repository Structure & Component Breakdown](#5-repository-structure--component-breakdown)
6. [Hardware Test-Rig & Circuit Interlock](#6-hardware-test-rig--circuit-interlock)
7. [Step-by-Step Execution Guide](#7-step-by-step-execution-guide)
8. [Viva Defense & Frequently Asked Questions (FAQ)](#8-viva-defense--frequently-asked-questions-faq)

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

The system features an automated chemistry adaptation module that shifts the baseline degradation slope, modifies internal resistance baselines ($R_0$), and recalculates cycle life expectations dynamically.

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

## 5. Repository Structure & Component Breakdown

```text
ai-battery-health-monitor/
├── api/
│   ├── app.py                     # Flask REST API with ML inference, RUL, TRRI & DB
│   └── database/
│       └── predictions.db         # SQLite persistent storage for telemetry logs
│
├── dashboard/
│   ├── index.html                 # Glassmorphic UI with gauges, charts & certificate modal
│   ├── css/
│   │   └── style.css              # Modern dark-mode styling, animations, responsiveness
│   └── js/
│       └── main.js                # Real-time polling, Chart.js rendering, Viva presets
│
├── data/
│   ├── raw/
│   │   └── nasa_battery_raw.csv   # NASA Ames 18650 Li-ion experimental cycles
│   ├── processed/
│   │   └── battery_soh_processed.csv # Cleaned features: cycle, V, I, T, capacity, SoH
│   └── prepare_dataset.py         # Data preprocessing and feature engineering script
│
├── docs/
│   ├── PROJECT_EXPLANATION.md     # This comprehensive guide
│   ├── AWARD_WINNING_STRATEGY.md  # Exhibition master guide & viva defense preparation
│   ├── 01_problem_definition_and_literature_review.md
│   ├── 02_system_architecture.md  # System architecture & mermaid diagrams
│   ├── 03_mathematical_modelling_and_algorithms.md # Arrhenius & Thevenin ECM math
│   └── commands                   # Quick terminal commands
│
├── esp32/
│   └── battery_sensor.ino         # Edge firmware: INA219, DS18B20, Relay, Buzzer
│
├── models/
│   ├── train_models.py            # Model training & standalone pure python regressors
│   ├── rf_model.pkl               # Serialized Random Forest model artifact
│   ├── scaler.pkl                 # Feature scaling parameters
│   └── model_metrics.json         # MAE, RMSE, and R2 performance metrics
│
├── notebooks/
│   ├── 01_eda_data_preprocessing.py # Exploratory data analysis
│   └── 02_model_training_evaluation.py # Model evaluation scripts
│
├── simulator/
│   └── sensor_simulator.py        # Python telemetry generator for test-bench validation
│
├── HARDWARE_REQUIREMENTS.md       # Bill of Materials (BOM), pricing & wiring diagrams
├── requirements.txt               # Python package dependencies
└── README.md                      # Project summary and quick start guide
```

---

## 6. Hardware Test-Rig & Circuit Interlock

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

## 7. Step-by-Step Execution Guide

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

## 8. Viva Defense & Frequently Asked Questions (FAQ)

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

---
*Document prepared for project documentation, academic evaluation, and technical handover.*
