"""
Phase 3: Machine Learning Model Training & Evaluation Pipeline
Uses NumPy-based Linear Regression & Random Forest Ensemble Regressor
to overcome Application Control DLL blocks while maintaining high accuracy.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

class PureLinearRegression:
    def __init__(self):
        self.weights = None
        self.intercept = None

    def fit(self, X, y):
        # Add column of ones for intercept
        X_b = np.c_[np.ones((X.shape[0], 1)), X]
        # Least squares formula: (X^T * X)^(-1) * X^T * y
        theta = np.linalg.pinv(X_b.T @ X_b) @ X_b.T @ y
        self.intercept = theta[0]
        self.weights = theta[1:]

    def predict(self, X):
        return X @ self.weights + self.intercept

class PureDecisionTreeRegressor:
    def __init__(self, max_depth=6, min_samples_split=5):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.tree = None

    def _best_split(self, X, y):
        best_mse = float('inf')
        best_idx, best_thresh = None, None
        n_samples, n_features = X.shape

        for feat_idx in range(n_features):
            thresholds = np.unique(X[:, feat_idx])
            if len(thresholds) > 20:
                thresholds = np.percentile(thresholds, np.linspace(10, 90, 10))

            for thresh in thresholds:
                left_mask = X[:, feat_idx] <= thresh
                right_mask = ~left_mask

                if np.sum(left_mask) < self.min_samples_split or np.sum(right_mask) < self.min_samples_split:
                    continue

                mse = np.var(y[left_mask]) * np.sum(left_mask) + np.var(y[right_mask]) * np.sum(right_mask)
                if mse < best_mse:
                    best_mse = mse
                    best_idx = feat_idx
                    best_thresh = thresh

        return best_idx, best_thresh

    def _build_tree(self, X, y, depth=0):
        if depth >= self.max_depth or len(y) < self.min_samples_split:
            return np.mean(y)

        feat_idx, thresh = self._best_split(X, y)
        if feat_idx is None:
            return np.mean(y)

        left_mask = X[:, feat_idx] <= thresh
        right_mask = ~left_mask

        left_node = self._build_tree(X[left_mask], y[left_mask], depth + 1)
        right_node = self._build_tree(X[right_mask], y[right_mask], depth + 1)

        return {'feat_idx': feat_idx, 'thresh': thresh, 'left': left_node, 'right': right_node}

    def fit(self, X, y):
        self.tree = self._build_tree(X, y)

    def _predict_sample(self, sample, node):
        if not isinstance(node, dict):
            return node
        if sample[node['feat_idx']] <= node['thresh']:
            return self._predict_sample(sample, node['left'])
        return self._predict_sample(sample, node['right'])

    def predict(self, X):
        return np.array([self._predict_sample(sample, self.tree) for sample in X])

class PureRandomForestRegressor:
    def __init__(self, n_estimators=15, max_depth=6):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.trees = []

    def fit(self, X, y):
        self.trees = []
        n_samples = X.shape[0]
        for _ in range(self.n_estimators):
            # Bootstrap sampling
            indices = np.random.choice(n_samples, size=n_samples, replace=True)
            X_boot, y_boot = X[indices], y[indices]
            tree = PureDecisionTreeRegressor(max_depth=self.max_depth)
            tree.fit(X_boot, y_boot)
            self.trees.append(tree)

    def predict(self, X):
        preds = np.array([tree.predict(X) for tree in self.trees])
        return np.mean(preds, axis=0)

def mae(y_true, y_pred):
    return float(np.mean(np.abs(y_true - y_pred)))

def rmse(y_true, y_pred):
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

def r2_score(y_true, y_pred):
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    return float(1.0 - (ss_res / ss_tot))

def train_and_evaluate():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, 'data', 'processed', 'battery_soh_processed.csv')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    if not os.path.exists(data_path):
        print("[ERROR] Processed data not found. Please run data/prepare_dataset.py first.")
        return
        
    df = pd.read_csv(data_path)
    
    feature_cols = [
        'cycle', 'voltage_avg', 'voltage_max', 'voltage_min', 'voltage_range',
        'current_avg', 'temp_avg', 'temp_max', 'temp_range',
        'discharge_duration_s', 'charge_duration_s'
    ]
    target_col = 'soh_percent'
    
    X = df[feature_cols].values
    y = df[target_col].values
    
    # Train / Test split (80/20)
    np.random.seed(42)
    shuffled_indices = np.random.permutation(len(X))
    test_set_size = int(len(X) * 0.2)
    test_indices = shuffled_indices[:test_set_size]
    train_indices = shuffled_indices[test_set_size:]
    
    X_train, y_train = X[train_indices], y[train_indices]
    X_test, y_test = X[test_indices], y[test_indices]
    
    # Feature Scaler (MinMaxScaler using NumPy)
    x_min = X_train.min(axis=0)
    x_max = X_train.max(axis=0)
    x_range = np.where(x_max - x_min == 0, 1.0, x_max - x_min)
    
    scaler_data = {'min': x_min.tolist(), 'range': x_range.tolist(), 'features': feature_cols}
    joblib.dump(scaler_data, os.path.join(models_dir, 'scaler.pkl'))
    joblib.dump(feature_cols, os.path.join(models_dir, 'feature_names.pkl'))
    
    X_train_scaled = (X_train - x_min) / x_range
    X_test_scaled = (X_test - x_min) / x_range
    
    results = {}
    
    # 1. Linear Regression
    lr = PureLinearRegression()
    lr.fit(X_train_scaled, y_train)
    lr_preds = lr.predict(X_test_scaled)
    results['Linear_Regression'] = {
        'MAE': round(mae(y_test, lr_preds), 4),
        'RMSE': round(rmse(y_test, lr_preds), 4),
        'R2': round(r2_score(y_test, lr_preds), 4)
    }
    
    # 2. Random Forest Regressor
    rf = PureRandomForestRegressor(n_estimators=10, max_depth=5)
    rf.fit(X_train_scaled, y_train)
    rf_preds = rf.predict(X_test_scaled)
    results['Random_Forest'] = {
        'MAE': round(mae(y_test, rf_preds), 4),
        'RMSE': round(rmse(y_test, rf_preds), 4),
        'R2': round(r2_score(y_test, rf_preds), 4)
    }
    
    # Save RF model object + dictionary model representation for maximum compatibility
    model_payload = {
        'type': 'pure_random_forest',
        'n_estimators': rf.n_estimators,
        'max_depth': rf.max_depth,
        'model_obj': rf
    }
    joblib.dump(model_payload, os.path.join(models_dir, 'rf_model.pkl'))
    
    # 3. Save Metrics JSON
    metrics_path = os.path.join(models_dir, 'model_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(results, f, indent=4)
        
    print("=" * 60)
    print("[SUCCESS] PHASE 3 MODEL TRAINING COMPLETE")
    print("=" * 60)
    print(json.dumps(results, indent=4))
    print(f"\n[INFO] Trained models saved to: {models_dir}")

if __name__ == '__main__':
    train_and_evaluate()
