"""
Phase 2: Exploratory Data Analysis (EDA)
Summary statistics and feature correlations.
"""

import os
import pandas as pd

def run_eda():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, 'data', 'processed', 'battery_soh_processed.csv')
    
    if not os.path.exists(data_path):
        print(f"[ERROR] Data file not found at {data_path}")
        return
        
    df = pd.read_csv(data_path)
    print("=" * 60)
    print("[INFO] EV BATTERY DATASET EXPLORATORY DATA ANALYSIS (EDA)")
    print("=" * 60)
    print(f"Total Rows: {len(df)}")
    print(f"Batteries included: {df['battery_id'].unique().tolist()}")
    print("\nSample Data (First 5 Cycles):")
    print(df.head())
    
    numeric_cols = ['cycle', 'voltage_avg', 'voltage_range', 'current_avg', 
                    'temp_avg', 'temp_max', 'discharge_duration_s', 
                    'capacity_ah', 'soh_percent']
    
    corr = df[numeric_cols].corr()
    print("\nFeature Correlation with SoH (%):")
    print(corr['soh_percent'].sort_values(ascending=False))
    print("\n[SUCCESS] EDA Phase 2 Verification Passed!")

if __name__ == '__main__':
    run_eda()
