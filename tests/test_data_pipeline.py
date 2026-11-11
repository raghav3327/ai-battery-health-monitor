"""Tests for the NASA-based battery dataset generation and preprocessing pipeline."""

import pandas as pd

from data import prepare_dataset


def test_generate_nasa_battery_data_schema_and_bounds():
    df = prepare_dataset.generate_nasa_battery_data()

    expected_columns = {
        "battery_id",
        "cycle",
        "voltage_avg",
        "voltage_max",
        "voltage_min",
        "current_avg",
        "current_max",
        "temp_avg",
        "temp_max",
        "discharge_duration_s",
        "charge_duration_s",
        "capacity_ah",
        "soh_percent",
    }
    assert expected_columns.issubset(df.columns)
    assert set(df["battery_id"].unique()) == {"B0005", "B0006", "B0007", "B0018"}
    assert len(df) > 1000
    assert (df["cycle"] >= 1).all()
    assert (df["capacity_ah"] >= 0.8).all()
    assert (df["soh_percent"] > 0.0).all()
    assert (df["voltage_max"] > df["voltage_min"]).all()


def test_generate_nasa_battery_data_is_deterministic():
    df_first = prepare_dataset.generate_nasa_battery_data()
    df_second = prepare_dataset.generate_nasa_battery_data()
    pd.testing.assert_frame_equal(df_first, df_second)


def test_prepare_dataset_main_writes_expected_csvs(tmp_path, monkeypatch):
    fake_script = tmp_path / "data" / "prepare_dataset.py"
    fake_script.parent.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(prepare_dataset, "__file__", str(fake_script))

    prepare_dataset.main()

    raw_csv = tmp_path / "data" / "raw" / "nasa_battery_raw.csv"
    proc_csv = tmp_path / "data" / "processed" / "battery_soh_processed.csv"
    assert raw_csv.exists()
    assert proc_csv.exists()

    df_proc = pd.read_csv(proc_csv)
    assert {"voltage_range", "temp_range", "energy_wh", "condition"}.issubset(df_proc.columns)
    assert set(df_proc["condition"].unique()).issubset({"GOOD", "WARNING", "CRITICAL"})
    assert (df_proc["energy_wh"] > 0).all()
