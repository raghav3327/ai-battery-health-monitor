# Phase 1: System Architecture

```text
  ┌───────────────────────┐         ┌───────────────────────┐
  │   ESP32 / Telemetry   │         │  NASA Battery Dataset │
  │   Sensors (V, I, T)   │         │  (B0005, B0006, etc.) │
  └───────────┬───────────┘         └───────────┬───────────┘
              │                                 │
              └────────────────┬────────────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │ Data Pipeline         │
                   │ (Cleaning & Features) │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │ Machine Learning      │
                   │ (Random Forest/XGB)   │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │ Flask REST API        │
                   │ (http://localhost:5000)│
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │ Live Web Dashboard    │
                   │ (Charts, Status, Logs)│
                   └───────────────────────┘
```
