# Phase 1: Problem Definition & Literature Review

## 1. Problem Statement
Lithium-Ion (Li-ion) batteries degrade over operating cycles due to chemical aging, electrolyte decomposition, and SEI layer growth. Predicting the **State of Health (SoH)** accurately enables proactive battery management, extends vehicle range safety, and prevents sudden power failures.

---

## 2. Parameter Definitions

| Parameter | Metric | Impact on SoH |
|---|---|---|
| Voltage ($V$) | Terminal Voltage | Decreases during discharge as internal resistance increases |
| Current ($I$) | Operating C-Rate | High current acceleration increases thermal stress |
| Temperature ($T$) | Operating Temperature | Elevated temperature (>35°C) degrades SEI layer rapidly |
| Cycle ($N$) | Charge/Discharge Count | Direct proxy for cumulative degradation |
| Capacity ($C$) | Ampere-Hours (Ah) | Primary ground-truth metric for SoH |
