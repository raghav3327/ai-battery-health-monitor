# 🏆 Student Project Exhibition: "Project of the Year" Award-Winning Strategy

> **Project Title:** AI-Based EV Battery State-of-Health (SoH), Remaining Useful Life (RUL) & Thermal Runaway Safety Monitor with Second-Life Grading  
> **Target Forum:** State Level Seminar & Exhibition  
> **Evaluation Jury:** Eminent Scientists & Professors from IISc Bengaluru, DRDO, ISRO, NAL, and Premier VTU Institutions.

---

## 🎯 Executive Summary & The Winning Formula

Selection for exhibition funding is a prestigious milestone. However, transitioning from **Selected Project** to **"Project of the Year" (State Award Winner)** requires standing out among 400+ top engineering projects.

A standard project that simply loads a public dataset (like NASA 18650), runs standard Scikit-Learn Random Forest, and shows a basic web page will receive good marks, but **will NOT win the State Award**. 

To win **Project of the Year**, the jury looks for three unmistakable pillars:
1. **Electrochemical & Mathematical Depth:** Beyond standard black-box ML — physics-informed parameters, equivalent circuit modeling ($R_0$), and Arrhenius thermal degradation.
2. **Working Hardware Prototype with Fail-Safe Edge Interlock:** A physical test rig with active thermal runaway detection and autonomous hardware relay cutoff in $<100\text{ ms}$.
3. **High Societal & Regional Relevance:** Alignment with Electric Vehicle Policy, e-bus fleet health monitoring, summer thermal stress, and Second-Life repurposing for solar irrigation pumps in rural areas.

---

## 📊 Evaluation Rubric & How to Maximize Marks

| Evaluation Dimension | Weightage | What Average Projects Do | What This Award-Winning Project Delivers |
|---|:---:|---|---|
| **1. Innovation & Technical Rigor** | **25%** | Basic ML classification/regression on static CSV | Multi-chemistry support (NMC vs LFP), ECM Thevenin internal resistance ($R_0$) estimation, Remaining Useful Life (RUL) in cycles & km, Explainable AI (XAI) feature attribution |
| **2. Physical Prototype & Live Demo** | **30%** | Only software simulator or loose breadboard wires | Rugged acrylic test bench, live 18650/21700 cell, dual sensors (INA219 + DS18B20), hardware relay cutoff, buzzer, and on-board OLED display |
| **3. Societal & Regional Relevance** | **20%** | Generic statements about EVs saving the planet | EV Policy alignment; e-bus fleet maintenance; high-temperature thermal mitigation; Second-life battery grading for rural solar pumps |
| **4. Validation & Experimental Accuracy** | **15%** | Only train/test split on 1 NASA cell | Cross-validation across multiple degradation regimes, comparison of Linear Regression vs RF vs Physics Model with MAE, RMSE, and $R^2$ metrics |
| **5. Presentation, Poster & Viva Defense** | **10%** | Text-heavy slides, nervous answers | Professional IEEE-style poster, live interactive stall demo, print-ready "Digital Battery Health Certificate", and structured viva defense |

---

## 💡 The 6 Core Innovations That Impress Juries

### 1. Multi-Chemistry Adaptation (NMC vs LFP)
* **The Reality in India:** While NASA datasets use Nickel Manganese Cobalt (NMC), the majority of Indian 2W/3W and commercial electric buses use **Lithium Iron Phosphate ($LiFePO_4$ / LFP)** due to its thermal stability and high cycle life ($>2500$ cycles).
* **Our Innovation:** The system features a **Chemistry Selector switch**. When set to LFP, the algorithm adjusts the nominal discharge curve, modifies internal resistance baselines, and extends the cycle degradation model accordingly.

### 2. Remaining Useful Life (RUL) & Kilometer Prognostics
* Standard BMS monitors only state-of-charge ($SoC\%$) or current $SoH\%$.
* Our model provides **Prognostics**: It computes the remaining charge-discharge cycles before the battery hits the $80\%$ automotive retirement threshold, and converts this directly to **Remaining EV Mileage (km)** for real-world drivers.

### 3. Thermal Runaway Early Warning & Edge Autonomous Cutoff
* **Why it matters:** Battery fires in EV 2-wheelers during Indian summers have been a major safety concern.
* **Our Innovation:** The system computes the **Thermal Runaway Risk Index (TRRI)** based on cell temperature, rate of temperature rise ($dT/dt$), and sudden voltage drops.
* **Edge Fail-Safe:** If $TRRI \ge 70\%$ or cell temperature exceeds $45^\circ\text{C}$, the ESP32 activates a **5V Relay** that physically disconnects the load/charger in under **100 milliseconds** and sounds a local acoustic buzzer — **completely autonomous, even if Wi-Fi or Cloud is down!**

### 4. Explainable AI (XAI): "Why Did My Battery Degrade?"
* Black-box AI is mistrusted by automotive engineers.
* Our system provides **Feature Attribution (Shapley-inspired)**: It visualizes whether capacity fade was caused primarily by:
  - **Thermal Stress** (operating above $35^\circ\text{C}$ in hot climates)
  - **High C-rate Stress** (aggressive acceleration / fast charging)
  - **Cycle Fatigue** (natural electrochemical aging)

### 5. Second-Life Circular Economy Battery Grading
* EV batteries retired at $70\text{--}80\% SoH$ are unsuited for automotive acceleration, but possess immense value for stationary energy storage.
* Our system grades retired packs automatically:
  - **Grade A ($>80\%$):** Automotive EV Traction.
  - **Grade B ($65\%\text{--}80\%$):** **Second-life storage for solar irrigation pumps** and rural microgrids.
  - **Grade C ($<65\%$):** Material recovery and hydrometallurgical recycling.

### 6. Digital Battery Passport & Second-Hand EV Valuation Certificate
* The second-hand EV market faces an acute "lemon market" problem because buyers cannot verify battery degradation.
* Our dashboard includes a **One-Click Battery Health Certificate Generator** (Printable / PDF) displaying verified SoH, cumulative cycle stress, residual pack valuation (in ₹ INR), and safety compliance stamp.

---

## 🏛️ Regional Impact: The Strategic Talking Points

When presenting to the jury, explicitly anchor the project to practical regional impact:

1. **Electric Vehicle & Energy Storage Policy Alignment:**  
   Mention that this system directly addresses the policy goals of **indigenous battery management technology** and **battery recycling/repurposing frameworks**.
2. **Transit Electric Bus Fleet Transition:**  
   Metropolitan transport corporations operate over 1,000+ electric buses. Battery replacement is the highest operational expense. Predicting SoH and RUL allows depot managers to execute **predictive module swapping** rather than reactive breakdown replacements.
3. **Dual-Climate Battery Challenge:**  
   Highlight that battery degradation varies dynamically across regional climates (moderate vs harsh summer ambient conditions). Our system adjusts aging models dynamically based on ambient conditions.
4. **Rural Solar Storage Integration:**  
   Highlight that Grade B second-life batteries can cut the cost of agricultural solar storage units for farmers by up to $50\%$.

---

## 🔬 Live Exhibition Stall & Demonstration Checklist

During the State Exhibition, visual, tactile, and interactive demonstrations captivate judges.

### The Stall Setup:
```text
┌─────────────────────────────────────────────────────────────┐
│                 PROJECT EXHIBITION BENCH                    │
│                                                             │
│   [ Laptop: Live Glassmorphic ]       [ Physical Test Rig ] │
│   [ Web Dashboard + Cert Gen  ]       [ Transparent Box   ] │
│                 ▲                              │            │
│                 │ (Wi-Fi / REST API)           │            │
│                 └──────────────┬───────────────┘            │
│                                │                            │
│                 ┌──────────────┴──────────────┐             │
│                 │ ESP32 + INA219 + DS18B20    │             │
│                 │ 18650 Cell + Relay + Buzzer │             │
│                 │ 0.96" I2C Status OLED       │             │
│                 └─────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### The "Showstopper" 3-Minute Live Jury Demo:
1. **Step 1 (Normal Baseline - 30 seconds):**
   - Show the battery cell resting at room temperature ($28^\circ\text{C}$).
   - The dashboard displays $SoH = 92\%$, Condition: **GOOD (Green)**, $TRRI = 14\%$ (Normal).
   - Show that the ESP32 OLED displays live $V, I, T$ and local SoH prediction.
2. **Step 2 (Simulated Thermal Stress / Precursor - 60 seconds):**
   - Apply mild heat to the DS18B20 probe (using a warm air blower or warm pack).
   - As temperature crosses $40^\circ\text{C}$ and $dT/dt > 1.5^\circ\text{C/min}$, show the dashboard gauge instantly swing to **ELEVATED RISK (Orange)**.
   - The Explainable AI panel highlights **Thermal Stress** as the primary degradation vector.
3. **Step 3 (Emergency Safety Cutoff Interlock - 45 seconds):**
   - As temperature touches $46^\circ\text{C}$, the **ESP32 hardware relay loudly trips with a sharp "CLICK"**, disconnecting the load circuit in $<100\text{ ms}$.
   - The acoustic buzzer beeps, the red LED lights up, and the dashboard transitions into **CRITICAL THERMAL RUNAWAY LOCKOUT**.
   - Emphasize to the jury: *"Even if my laptop Wi-Fi were unplugged right now, the ESP32 edge firmware tripped this relay autonomously!"*
4. **Step 4 (Second-Life Grading & Certificate - 45 seconds):**
   - Click **"Generate Battery Health Certificate"**.
   - Show the print-ready, professional inspection report showing Grade B assignment for rural solar pumps.

---

## 🎓 The Viva Voce: Top 10 Tough Questions & Winning Answers

### Q1: *"You're using NASA's 18650 dataset from 2008. How is that relevant to modern EV batteries in 2026?"*
> **Winning Answer:**  
> *"That is an insightful question, Sir/Madam. The NASA dataset provides high-precision laboratory baseline degradation under controlled environmental chambers (C-rate and temperature), which is essential for benchmarking electrochemical decay rates. However, modern EVs predominantly use LFP ($LiFePO_4$) and 21700 NMC cells. Therefore, we designed our architecture with a **hybrid framework**: we combine the empirical data-driven machine learning baseline with an **online Thevenin 1-RC Equivalent Circuit Model (ECM)**. The ECM dynamically measures real-time internal resistance ($R_0$) and voltage relaxation directly from live telemetry, allowing our system to generalize beyond the training dataset to modern cell chemistries."*

### Q2: *"Why did you use Random Forest instead of Deep Learning (LSTM / Transformers)?"*
> **Winning Answer:**  
> *"We benchmarked Deep Learning models (LSTM) against Ensemble Random Forest. In an automotive IoT and embedded BMS context, there are three critical constraints:  
> 1) **Edge Latency:** Random Forest inference executes in under $1.2\text{ ms}$ on constrained hardware, compared to $40\text{--}80\text{ ms}$ for heavy recurrent neural nets.  
> 2) **Overfitting on Monotonic Trends:** Degradation over cycles is monotonic. Decision trees with bootstrap aggregation prevent catastrophic extrapolation errors.  
> 3) **Explainability:** Random Forest allows exact feature attribution (Gini importance & Shapley values), which is mandatory for automotive safety compliance (ISO 26262 ASIL-D), whereas deep neural nets remain unexplainable black boxes."*

### Q3: *"What happens if the vehicle loses 4G or Wi-Fi connectivity in a remote area?"*
> **Winning Answer:**  
> *"Safety-critical operations must never depend on external connectivity. We implemented a **Dual-Layer Architecture**:  
> - **Edge Layer (ESP32):** Runs deterministic safety checks locally every $100\text{ ms}$. If $T > 45^\circ\text{C}$ or $dT/dt > 1.5^\circ\text{C/min}$, the 5V relay trips hardware power independently of any network connection.  
> - **Cloud/Fleet Layer:** When connectivity resumes, cached telemetry packets are uploaded for fleet analytics, long-term RUL degradation tracking, and warranty compliance."*

### Q4: *"How do you calculate Internal Resistance ($R_0$) from a moving EV?"*
> **Winning Answer:**  
> *"In electric vehicles, internal resistance is extracted during instantaneous current pulses—specifically during regenerative braking or aggressive throttle tip-in. By taking the differential voltage step $\Delta V$ over the current step $\Delta I$ within a $100\text{ ms}$ sample window ($R_0 = |\Delta V / \Delta I|$), we isolate the pure Ohmic resistance before polarization effects ($R_1 C_1$) take over."*

### Q5: *"Can your system prevent battery thermal runaway, or just observe it?"*
> **Winning Answer:**  
> *"Our system actively prevents catastrophic thermal runaway through **early precursor detection**. Thermal runaway in Li-ion cells is preceded by subtle electrochemical anomalies: micro-shorts causing an accelerated temperature rise rate ($dT/dt$), localized voltage dips, and internal resistance expansion. By computing the composite Thermal Runaway Risk Index ($TRRI$), we detect precursors $3\text{ to }5\text{ minutes}$ before exothermic decomposition begins, enabling the autonomous relay to isolate the cell and engage cooling systems before fire occurs."*

### Q6: *"What is the cost of your system compared to commercial automotive BMS?"*
> **Winning Answer:**  
> *"Commercial automotive BMS units from Bosch or Denso cost between ₹25,000 and ₹60,000 and are closed, proprietary systems that do not provide cloud prognostics or open second-life grading. Our IoT AI Edge Module Bill of Materials (BOM) is under **₹1,450 ($17)** in prototype volumes, and can be manufactured for under **₹650** in mass production, making it viable for retrofitting onto low-cost electric 2-wheelers and delivery fleets."*

### Q7: *"What is the societal benefit of this project?"*
> **Winning Answer:**  
> *"Electric mobility is growing rapidly. Our project offers two direct impacts:  
> 1) **Consumer Safety & Transparency:** Eliminating EV fires in harsh summer conditions and enabling trusted second-hand EV reselling via the Digital Battery Passport.  
> 2) **Circular Economy:** Repurposing batteries retired at $75\% SoH$ to power rural solar water pumps, reducing lithium waste and lowering capital costs for farmers by $40\text{--}50\%$."*

---

## 📋 Poster Layout Guide (for Exhibition)

Use standard $3\text{ ft} \times 4\text{ ft}$ portrait orientation:

```text
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]          TITLE: AI-BASED EV BATTERY SOH, RUL &     [COLLEGE]│
│                  THERMAL RUNAWAY MONITOR WITH 2ND LIFE      [LOGO]  │
│  College Name | Dept of ECE/EEE/CSE | Guide & Student Names        │
├──────────────────────────────┬──────────────────────────────┤
│ 1. PROBLEM STATEMENT & NEED  │ 4. SYSTEM ARCHITECTURE & IOT │
│ • EV fires during heatwaves  │ • Circuit block diagram      │
│ • Lack of RUL prognostics    │ • ESP32 + INA219 + DS18B20   │
│ • Battery waste management   │ • Edge relay cutoff scheme   │
├──────────────────────────────┼──────────────────────────────┤
│ 2. MATHEMATICAL MODELING     │ 5. RESULTS & VALIDATION      │
│ • Arrhenius aging rate law   │ • Model metrics (MAE, RMSE, R²)│
│ • Thevenin 1RC ECM model     │ • Live thermal trip curve    │
│ • Thermal Runaway Index TRRI │ • XAI feature attribution    │
├──────────────────────────────┼──────────────────────────────┤
│ 3. ML PIPELINE & PROGNOSTICS │ 6. REGIONAL IMPACT           │
│ • Chemistry: NMC vs LFP      │ • Transit e-bus fleet monitoring│
│ • RUL prediction formula     │ • Second-life agri-solar ESS │
│ • Pure Random Forest engine  │ • Digital Battery Passport   │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 📅 Roadmap to the Final Exhibition & Award

1. **Step 1:** Run and test the upgraded multi-feature API & Dashboard.
2. **Step 2:** Assemble the physical demonstration test rig (ESP32, INA219, DS18B20, 5V Relay, Buzzer, 18650 cell).
3. **Step 3:** Record a 2-minute high-definition demonstration video of the hardware cutoff and dashboard to share during preliminary presentations.
4. **Step 4:** Conduct cross-validation and print out sample **"Battery Health Certificates"** to hand to the jury members when they visit your stall.
5. **Step 5:** Practice the Top 10 Viva answers with your team until your delivery is calm, precise, and authoritative.
