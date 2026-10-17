"""
Phase 2: Data Preparation & Preprocessing Pipeline
Generates raw and preprocessed feature datasets for EV Battery State-of-Health (SoH) prediction.
Modeled after standard NASA Li-ion Battery Datasets (B0005, B0006, B0007, B0018).
"""

import os
import numpy as np
import pandas as pd

def generate_nasa_battery_data():
    np.random.seed(42)
    batteries = ['B0005', 'B0006', 'B0007', 'B0018']
    rated_capacity = 2.0  # Rated nominal capacity in Ah
    
    all_cycles = []
    
    for b_id in batteries:
        initial_cap = rated_capacity * np.random.uniform(0.95, 1.02)
        n_cycles = 250 + np.random.randint(0, 50)
        current_cap = initial_cap
        
        for cycle in range(1, n_cycles + 1):
            degradation_step = (0.0018 + 0.000005 * cycle) + np.random.normal(0, 0.0012)
            if cycle % 30 == 0:
                degradation_step -= np.random.uniform(0.002, 0.005)
                
            current_cap = max(0.8, current_cap - degradation_step)
            soh = (current_cap / rated_capacity) * 100.0
            
            v_avg = round(3.85 - (0.0004 * cycle) + np.random.normal(0, 0.015), 4)
            v_max = round(4.20 - (0.0001 * cycle) + np.random.normal(0, 0.005), 4)
            v_min = round(3.00 - (0.0008 * cycle) + np.random.normal(0, 0.02), 4)
            
            i_avg = round(2.00 + np.random.normal(0, 0.05), 4)
            i_max = round(2.15 + np.random.normal(0, 0.03), 4)
            
            t_avg = round(25.0 + (0.025 * cycle) + np.random.normal(0, 0.8), 2)
            t_max = round(28.0 + (0.035 * cycle) + np.random.normal(0, 1.0), 2)
            
            discharge_time_sec = round((current_cap / i_avg) * 3600 + np.random.normal(0, 30), 1)
            charge_time_sec = round(3600 + (0.5 * cycle) + np.random.normal(0, 40), 1)
            
            all_cycles.append({
                'battery_id': b_id,
                'cycle': cycle,
                'voltage_avg': v_avg,
                'voltage_max': v_max,
                'voltage_min': v_min,
                'current_avg': i_avg,
                'current_max': i_max,
                'temp_avg': t_avg,
                'temp_max': t_max,
                'discharge_duration_s': discharge_time_sec,
                'charge_duration_s': charge_time_sec,
                'capacity_ah': round(current_cap, 4),
                'soh_percent': round(soh, 2)
            })
            
    df = pd.DataFrame(all_cycles)
    return df

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(base_dir, 'raw')
    processed_dir = os.path.join(base_dir, 'processed')
    
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(processed_dir, exist_ok=True)
    
    print("[INFO] Generating NASA-based Battery Degradation Dataset...")
    df = generate_nasa_battery_data()
    
    raw_file = os.path.join(raw_dir, 'nasa_battery_raw.csv')
    df.to_csv(raw_file, index=False)
    print(f"[SUCCESS] Raw dataset saved to: {raw_file} ({len(df)} total cycle records)")
    
    df_proc = df.copy()
    df_proc['voltage_range'] = df_proc['voltage_max'] - df_proc['voltage_min']
    df_proc['temp_range'] = df_proc['temp_max'] - df_proc['temp_avg']
    df_proc['energy_wh'] = df_proc['voltage_avg'] * df_proc['capacity_ah']
    
    conditions = []
    for soh in df_proc['soh_percent']:
        if soh >= 80.0:
            conditions.append('GOOD')
        elif soh >= 60.0:
            conditions.append('WARNING')
        else:
            conditions.append('CRITICAL')
            
    df_proc['condition'] = conditions
    
    proc_file = os.path.join(processed_dir, 'battery_soh_processed.csv')
    df_proc.to_csv(proc_file, index=False)
    print(f"[SUCCESS] Processed ML-ready dataset saved to: {proc_file}")

if __name__ == '__main__':
    main()
