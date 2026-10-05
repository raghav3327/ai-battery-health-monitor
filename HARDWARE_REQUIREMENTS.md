# 🔌 Hardware Requirements & Exhibition Test-Rig Setup Guide
### State-Level Exhibition & Demonstration Benchmark

This document outlines the hardware components, wiring diagram, ESP32 pinout configuration, and autonomous fail-safe safety circuit required for the **AI-Based EV Battery State-of-Health (SoH), Remaining Useful Life (RUL) & Thermal Runaway Safety Monitor**.

---

## 📋 1. Bill of Materials (BOM) & Component Costing

| Category | Component Name | Qty | Specifications | Est. Cost (INR) |
| :--- | :--- | :---: | :--- | :---: |
| **Microcontroller** | ESP32 Development Board | 1 | NodeMCU / ESP-WROOM-32 (Wi-Fi + BLE, 240MHz) | ₹450 |
| **Voltage & Current Sensor** | INA219 Bi-directional Sensor | 1 | I2C interface, measures up to 26V and 3.2A | ₹180 |
| **Temperature Sensor** | DS18B20 Digital Sensor | 1 | Waterproof Probe / Stainless steel sheath (-55°C to +125°C) | ₹160 |
| **Safety Interlock** | 5V 10A Single Relay Module | 1 | Active-LOW optocoupled relay for load isolation | ₹80 |
| **Acoustic Alarm** | 5V Active Piezo Buzzer | 1 | Continuous tone buzzer for thermal alert | ₹30 |
| **Battery Cell** | 18650 Li-ion Battery | 1 | 3.7V Nominal, 2200–2600 mAh capacity | ₹180 |
| **Battery Holder** | Single 18650 Battery Clip | 1 | ABS plastic enclosure with wire leads | ₹40 |
| **Charger Module** | TP4056 USB Lithium Charger | 1 | 5V 1A Micro-USB charging module with protection | ₹50 |
| **Discharge Load** | 10W Ceramic Wirewound Resistor | 1 | 5Ω – 10Ω load resistor (or 5V DC cooling fan) | ₹40 |
| **Passive Component** | 4.7kΩ Pull-Up Resistor | 1 | Pull-up resistor for DS18B20 One-Wire data line | ₹5 |
| **Prototyping** | Breadboard & Jumper Wires | 1 Set | Male-to-Male, Male-to-Female jumper cables | ₹120 |
| **Display (Optional)** | 0.96" I2C OLED Display | 1 | SSD1306 128x64 Blue/Yellow display | ₹220 |
| **Total Prototype Cost**| | | | **~₹1,555 ($18)** |

---

## ⚡ 2. Complete Wiring Diagram & Pin Connections

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
       (4.7k pullup to 3.3)│                        │
                           │                        │
       [ 5V RELAY IN ] ────┤ GPIO 25 (Digital OUT)  │
       [ BUZZER (+) ] ─────┤ GPIO 19 (PWM / OUT)    │
       [ OLED SDA/SCL ] ───┤ GPIO 21 / GPIO 22      │
                           └────────────────────────┘
```

### Safety Interlock Circuit:
```text
  [Battery (+)] ────► [INA219 VIN+]
                      [INA219 VIN-] ────► [Relay COM]
                                          [Relay NO] ────► [Discharge Load / Fan] ────► [Battery (-)]
```
* Under normal operating conditions ($T < 45^\circ\text{C}$), the relay contact is **CLOSED**, powering the load.
* If thermal runaway precursor or critical temperature ($T \ge 45^\circ\text{C}$) is detected, the ESP32 drives `GPIO 25 = HIGH`, **tripping the relay open in under 100 milliseconds** and disconnecting the battery immediately.

---

## 🛠️ 3. ESP32 Pinout Summary Table

| Sensor / Module Pin | Component Wire | ESP32 Pin | Function / Logic |
| :--- | :--- | :--- | :--- |
| **INA219** VCC | Red | `3.3V` / `VIN` | Power Supply |
| **INA219** GND | Black | `GND` | Ground Reference |
| **INA219** SDA | Blue / Green | `GPIO 21` | I2C Data Line |
| **INA219** SCL | Yellow | `GPIO 22` | I2C Clock Line |
| **DS18B20** VCC | Red | `3.3V` | OneWire Power |
| **DS18B20** GND | Black | `GND` | OneWire Ground |
| **DS18B20** DATA| Yellow | `GPIO 4` | OneWire Signal (4.7kΩ pull-up to 3.3V) |
| **5V Relay** IN | Control wire | `GPIO 25` | Output: LOW = Engaged, HIGH = Emergency Cutoff |
| **Piezo Buzzer** | Positive (+) | `GPIO 19` | Output: HIGH = Alarm Tone |

---

## 🏆 4. Preparing the Physical Demo Rig for Exhibition

To maximize points from the evaluation panel at the exhibition:

1. **Mount on a Base Plate:**
   - Fasten the ESP32, relay, battery holder, and sensors neatly onto a $20\text{ cm} \times 20\text{ cm}$ transparent acrylic sheet or wooden block. Avoid messy, loose wires.
2. **Thermal Stress Test Prop:**
   - Keep a small warm water bottle, reusable hand warmer gel pack, or a low-wattage hair dryer at the stall.
   - Gently applying heat to the DS18B20 temperature probe demonstrates the **real-time thermal runaway warning and the instantaneous relay cutoff click** to the jury.
3. **Backup Hotspot Configuration:**
   - Configure the ESP32 firmware with your phone's mobile hotspot SSID and password so you do not struggle with venue Wi-Fi during the live evaluation.
