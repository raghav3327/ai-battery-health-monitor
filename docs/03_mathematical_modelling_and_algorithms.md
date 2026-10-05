# 📐 Phase 1.3: Mathematical Modeling, Electrochemical Formulations & Algorithms

This technical document establishes the theoretical foundations of the **AI-Based EV Battery State-of-Health (SoH), Remaining Useful Life (RUL), and Thermal Runaway Safety Monitor**.

---

## 1. State of Health (SoH) Definition

The State of Health ($SoH$) is defined as the ratio of current deliverable capacity to the nominal initial capacity:

$$SoH(\%) = \frac{C_{\text{actual}}}{C_{\text{nominal}}} \times 100$$

Where:
* $C_{\text{nominal}}$ = Rated capacity specified by cell manufacturer (e.g., $2.60\text{ Ah}$ for 18650 NMC or $3.20\text{ Ah}$ for 21700).
* $C_{\text{actual}} = \int_{0}^{t_{\text{discharge}}} I(t)\,dt$ = Coulomb counting during full constant-current/constant-voltage discharge.
* **End-of-Life (EoL) Criteria for EV Traction:** $SoH \le 80.0\%$.
* **Second-Life Retirement Criteria:** $SoH \le 65.0\%$.

---

## 2. Arrhenius Chemical Degradation Law (Thermal Stress)

The rate of Solid Electrolyte Interphase (SEI) layer growth on the graphite anode follows an Arrhenius reaction rate:

$$k_{\text{aging}}(T) = A \cdot \exp\left(-\frac{E_a}{R \cdot T_k}\right)$$

Where:
* $A$ = Pre-exponential frequency factor ($\text{s}^{-1}$).
* $E_a$ = Activation energy for side chemical reactions ($\approx 50\text{ kJ/mol}$ for standard Li-ion).
* $R$ = Universal Gas Constant ($8.314\text{ J/(mol}\cdot\text{K)}$).
* $T_k$ = Cell core temperature in Kelvin ($T(^\circ\text{C}) + 273.15$).

**Karnataka Ambient Temperature Implication:**
In North Karnataka districts (Kalaburagi, Raichur, Ballari), ambient summer temperatures regularly reach $42^\circ\text{C}$ to $44^\circ\text{C}$. Operating cells at $42^\circ\text{C}$ increases the aging velocity by over $2.6\times$ compared to Bengaluru's baseline of $26^\circ\text{C}$.

---

## 3. Equivalent Circuit Model (ECM - 1RC Thevenin Model)

To dynamically track internal cell degradation without destructive testing, a 1-RC Thevenin Equivalent Circuit Model is utilized:

```text
       ┌───[ R0 ]───┬───[ R1 ]───┬───┐
       │   Ohmic    │            │   │
  (+) ─┴─ Resistance│   ┌──┴┴──┐ │   ┴─ (-)
   Terminal         └───┤  C1  ├─┘    Terminal
   Voltage (Vt)         └──────┘      OCV(SoC)
```

The terminal voltage $V_t(t)$ under load current $I_L(t)$ is modeled as:

$$V_t(t) = V_{\text{OCV}}(SoC) - I_L(t) \cdot R_0 - V_{p}(t)$$

$$\frac{dV_p(t)}{dt} = -\frac{V_p(t)}{R_1 C_1} + \frac{I_L(t)}{C_1}$$

### Dynamic Internal Resistance ($R_0$) Extraction:
At the instantaneous load step ($\Delta t < 100\text{ ms}$):

$$R_0 = \frac{|\Delta V_{\text{step}}|}{|\Delta I_{\text{step}}|} = \frac{|V_{\text{pre-load}} - V_{\text{loaded}}|}{|I_{\text{pre-load}} - I_{\text{loaded}}|}$$

As the battery degrades, $R_0$ grows monotonically due to electrolyte loss and binder breakdown ($R_{0,\text{aged}} \approx 1.8\text{--}2.5 \times R_{0,\text{fresh}}$).

---

## 4. Remaining Useful Life (RUL) Prognostics Algorithm

Remaining Useful Life ($RUL$) estimates the number of charge-discharge cycles or kilometers remaining before the cell reaches the $80\%$ automotive retirement boundary ($EoL$):

$$RUL_{\text{cycles}} = \max\left(0, \; \frac{SoH_{\text{current}} - SoH_{\text{EoL}}}{\alpha_{\text{eff}}}\right)$$

Where $\alpha_{\text{eff}}$ is the dynamic degradation coefficient per cycle:

$$\alpha_{\text{eff}} = \alpha_{\text{base}} \cdot \gamma_{\text{chem}} \cdot \left[1 + \beta_T \cdot \max(0, T_{\text{avg}} - 30) + \beta_I \cdot \max(0, C_{\text{rate}} - 1.0)\right]$$

* $\alpha_{\text{base}} \approx 0.08\%$ to $0.12\%$ capacity loss per standard cycle.
* $\gamma_{\text{chem}}$: Chemistry factor ($1.0$ for NMC; $0.45$ for LFP due to superior $2500+$ cycle life).
* $\beta_T = 0.04$ ($4\%$ acceleration per degree above $30^\circ\text{C}$).
* $\beta_I = 0.25$ ($25\%$ acceleration per C-rate above $1C$).

### EV Vehicle Mileage Translation:
$$RUL_{\text{distance}} (\text{km}) = RUL_{\text{cycles}} \times D_{\text{cycle-range}}$$
For a standard Indian 2-wheeler (e.g., Ather 450X / Ola S1 with $3.7\text{ kWh}$ pack, rated $100\text{ km/cycle}$):
$$D_{\text{cycle-range}} \approx 85\text{ km (Real-world Indian Drive Cycle IDC)}$$

---

## 5. Multi-Parameter Thermal Runaway Risk Index (TRRI)

Battery thermal runaway does not occur abruptly without precursors. The **Thermal Runaway Risk Index ($TRRI \in [0, 100]$)** computes a real-time composite safety score:

$$TRRI = w_1 \cdot f_T(T_{\text{cell}}) + w_2 \cdot f_{\nabla}\left(\frac{dT}{dt}\right) + w_3 \cdot f_R(R_0) + w_4 \cdot f_V(\Delta V_{\text{drop}})$$

Where:
* $w = [0.35, 0.35, 0.15, 0.15]$ (Normalized weights).
* $f_T(T) = \min\left(100, \max\left(0, \frac{T - 35}{55 - 35} \times 100\right)\right)$
* $f_{\nabla}\left(\frac{dT}{dt}\right) = \min\left(100, \max\left(0, \frac{\frac{dT}{dt} - 0.5}{2.0 - 0.5} \times 100\right)\right)$ (Alert if temperature rises $>1.5^\circ\text{C/min}$).
* $f_R(R_0) = \min\left(100, \frac{R_0 - R_{\text{nominal}}}{R_{\text{critical}} - R_{\text{nominal}}} \times 100\right)$

### Tri-State Autonomous Safety Interlock:
* **$TRRI < 40$ (NORMAL):** Normal operation. Green LED indicator.
* **$40 \le TRRI < 70$ (ELEVATED RISK):** Warning state. Limit charge current to $0.5C$, trigger dashboard alert.
* **$TRRI \ge 70$ (CRITICAL THERMAL RUNAWAY RISK):** Immediate edge hardware cutoff via 5V Relay in $<100\text{ ms}$, sound acoustic buzzer, isolate pack.

---

## 6. Second-Life Circular Economy Grading Matrix

Aligned with Karnataka's Renewable Energy and Waste Management initiatives:

| Battery Grade | SoH Range | Primary Deployment Recommendation | Economic Value Retention |
|---|---|---|---|
| **Grade A (Prime)** | $80.0\% - 100\%$ | Automotive EV Traction (BMTC Buses, Electric 2W/3W) | $100\% - 75\%$ of vehicle battery value |
| **Grade B (Second-Life)** | $65.0\% - 79.9\%$ | **Karnataka Rural Solar Agri-Pumps & Microgrids** (Stationary ESS) | $45\% - 30\%$ residual value |
| **Grade C (Recycle)** | $< 65.0\%$ | Urban Mining / Hydrometallurgical Material Recovery (Li, Co, Ni) | Scrap / Raw Material recovery |
