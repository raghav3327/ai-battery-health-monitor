"""Unit and artifact tests for the custom NumPy ML regressors and training pipeline."""

import json
import math
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

from models import train_models


def test_regression_metrics():
    y_true = np.array([2.0, 4.0, 6.0])
    y_perfect = np.array([2.0, 4.0, 6.0])
    assert train_models.mae(y_true, y_perfect) == 0.0
    assert train_models.rmse(y_true, y_perfect) == 0.0
    assert train_models.r2_score(y_true, y_perfect) == 1.0

    y_pred = np.array([1.0, 4.0, 7.0])
    assert train_models.mae(y_true, y_pred) == pytest.approx(2.0 / 3.0)
    assert train_models.rmse(y_true, y_pred) == pytest.approx(math.sqrt(2.0 / 3.0))


def test_pure_linear_regression_learns_exact_linear_plane():
    rng = np.random.default_rng(7)
    X = rng.uniform(-5, 5, size=(60, 2))
    y = 2.5 * X[:, 0] - 1.5 * X[:, 1] + 10.0

    model = train_models.PureLinearRegression()
    model.fit(X, y)
    preds = model.predict(X)

    assert model.intercept == pytest.approx(10.0, abs=1e-6)
    assert np.allclose(preds, y, atol=1e-6)


def test_pure_decision_tree_regressor_learns_step_function():
    X = np.linspace(0, 10, 40).reshape(-1, 1)
    y = np.where(X[:, 0] < 5.0, 10.0, 90.0)

    tree = train_models.PureDecisionTreeRegressor(max_depth=3, min_samples_split=2)
    tree.fit(X, y)
    preds = tree.predict(np.array([[2.0], [8.0]]))

    assert preds[0] == pytest.approx(10.0, abs=1e-6)
    assert preds[1] == pytest.approx(90.0, abs=1e-6)


def test_pure_random_forest_regressor_fits_nonlinear_trend():
    np.random.seed(42)
    X = np.linspace(0, 10, 80).reshape(-1, 1)
    y = 100.0 - 0.5 * (X[:, 0] ** 2)

    forest = train_models.PureRandomForestRegressor(n_estimators=10, max_depth=5)
    forest.fit(X, y)
    preds = forest.predict(X)

    assert len(forest.trees) == 10
    assert preds.shape == (80,)
    assert train_models.r2_score(y, preds) > 0.90


def test_saved_model_artifacts_load_and_predict():
    models_dir = Path(__file__).resolve().parent.parent / "models"
    payload = joblib.load(models_dir / "rf_model.pkl")
    scaler = joblib.load(models_dir / "scaler.pkl")
    feature_names = joblib.load(models_dir / "feature_names.pkl")
    metrics = json.loads((models_dir / "model_metrics.json").read_text(encoding="utf-8"))

    assert len(feature_names) == 11
    assert {"Linear_Regression", "Random_Forest"}.issubset(metrics.keys())

    rf = payload["model_obj"]
    sample = np.array([[120, 3.82, 4.02, 3.42, 0.60, 2.0, 28.5, 32.0, 3.5, 3168.0, 3600.0]])
    scaled = (sample - np.array(scaler["min"])) / np.array(scaler["range"])
    pred = float(rf.predict(scaled)[0])

    assert np.isfinite(pred)
    assert 10.0 <= pred <= 105.0


def test_train_and_evaluate_pipeline_isolated(tmp_path, monkeypatch):
    proc_dir = tmp_path / "data" / "processed"
    models_dir = tmp_path / "models"
    proc_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(123)
    n_rows = 40
    cycles = np.arange(1, n_rows + 1)
    df = pd.DataFrame(
        {
            "cycle": cycles,
            "voltage_avg": 3.9 - 0.001 * cycles,
            "voltage_max": 4.2 - 0.0005 * cycles,
            "voltage_min": 3.1 - 0.001 * cycles,
            "voltage_range": np.full(n_rows, 1.1),
            "current_avg": 2.0 + rng.normal(0, 0.05, n_rows),
            "temp_avg": 25.0 + 0.05 * cycles,
            "temp_max": 28.0 + 0.07 * cycles,
            "temp_range": 3.0 + 0.02 * cycles,
            "discharge_duration_s": 3600.0 - 10.0 * cycles,
            "charge_duration_s": 3600.0 + 2.0 * cycles,
            "soh_percent": 100.0 - 0.25 * cycles,
        }
    )
    df.to_csv(proc_dir / "battery_soh_processed.csv", index=False)

    fake_script = models_dir / "train_models.py"
    monkeypatch.setattr(train_models, "__file__", str(fake_script))

    train_models.train_and_evaluate()

    assert (models_dir / "rf_model.pkl").exists()
    assert (models_dir / "scaler.pkl").exists()
    assert (models_dir / "feature_names.pkl").exists()
    metrics_file = models_dir / "model_metrics.json"
    assert metrics_file.exists()

    metrics = json.loads(metrics_file.read_text(encoding="utf-8"))
    assert metrics["Random_Forest"]["R2"] > 0.7
