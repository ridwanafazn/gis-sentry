from __future__ import annotations

from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold

BASE = Path(__file__).resolve().parents[1]
DATA = BASE / "data" / "ml"

FEATURES = [
    "population_decay",
    "population_1_5km",
    "anchor_decay",
    "anchor_1_5km",
    "competitor_decay",
    "competitor_1_5km",
    "nearest_competitor_km",
    "arterial_km",
    "local_km",
    "access_raw",
    "demand",
    "competition",
    "access",
    "baseline_score",
]

PARAMS = {
    "objective": "binary",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_child_samples": 20,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "reg_lambda": 1.0,
    "random_state": 42,
    "n_jobs": -1,
    "verbosity": -1,
}


def precision_at_k(y: np.ndarray, s: np.ndarray, k: int) -> float:
    k = min(k, len(s))
    return float(np.sum(y[np.argsort(-s)[:k]]) / k)


def ndcg_at_k(y: np.ndarray, s: np.ndarray, k: int) -> float:
    k = min(k, len(s))
    rel = y[np.argsort(-s)[:k]]
    dcg = np.sum(rel / np.log2(np.arange(2, len(rel) + 2)))
    ideal = np.sort(y)[::-1][:k]
    idcg = np.sum(ideal / np.log2(np.arange(2, len(ideal) + 2)))
    return float(dcg / idcg) if idcg > 0 else 0.0


def evaluate(y: np.ndarray, s: np.ndarray, mask: np.ndarray) -> dict:
    yc, sc = y[mask], s[mask]
    out = {f"P@{k}": precision_at_k(yc, sc, k) for k in [10, 25, 50, 100]}
    out.update({f"NDCG@{k}": ndcg_at_k(yc, sc, k) for k in [10, 25, 50, 100]})
    out["AUC"] = float(roc_auc_score(yc, sc)) if len(np.unique(yc)) > 1 else None
    return out


def weights(y: np.ndarray, pop: np.ndarray) -> np.ndarray:
    w = np.where(pop >= np.median(pop), 0.8, 0.15)
    return np.where(y == 1, 1.0, w)


df = pd.read_csv(DATA / "features.csv").fillna(0.0)
y = df["label"].to_numpy()
pop = df["population_1_5km"].to_numpy()
subang = df["is_subang"].to_numpy() == 1
urban = pop >= np.median(pop)
subang_urban = subang & urban


def aggregate(folds: list[dict]) -> None:
    keys = ["P@10", "P@25", "P@50", "P@100", "NDCG@50", "AUC"]
    print(" | ".join(f"{k}={np.mean([f[k] for f in folds if f[k] is not None]):.3f}" for k in keys))


# 1) Subang-only spatial CV
print("\n[1] Subang-only, GroupKFold(5)")
sdf = df[subang].reset_index(drop=True)
sy = sdf["label"].to_numpy()
spop = sdf["population_1_5km"].to_numpy()
sg = sdf["block"].to_numpy()
s_urban = spop >= np.median(spop)
folds = []
for tr, va in GroupKFold(n_splits=5).split(sdf, sy, sg):
    train = sdf.iloc[tr]
    valid = sdf.iloc[va]
    m = lgb.LGBMClassifier(n_estimators=300, **PARAMS)
    m.fit(train[FEATURES], train["label"], sample_weight=weights(train["label"].to_numpy(), train["population_1_5km"].to_numpy()))
    p = m.predict_proba(valid[FEATURES])[:, 1]
    folds.append(evaluate(valid["label"].to_numpy(), p, s_urban[va]))
aggregate(folds)
base_folds = []
for _, va in GroupKFold(n_splits=5).split(sdf, sy, sg):
    base_folds.append(evaluate(sdf.iloc[va]["label"].to_numpy(), sdf.iloc[va]["baseline_score"].to_numpy(), s_urban[va]))
print("baseline Subang CV:")
aggregate(base_folds)

# 2) Regional transfer variants
non = df[~subang].reset_index(drop=True)
for label, feats in [
    ("regional (no baseline feature)", [f for f in FEATURES if f != "baseline_score"]),
    ("regional + baseline feature", FEATURES),
]:
    m = lgb.LGBMClassifier(n_estimators=500, **PARAMS)
    m.fit(non[feats], non["label"], sample_weight=weights(non["label"].to_numpy(), non["population_1_5km"].to_numpy()))
    p = m.predict_proba(df.loc[subang, feats])[:, 1]
    print(f"\n[2] {label} -> Subang transfer")
    print(evaluate(y[subang], p, subang_urban[subang]))
    # Hybrid with baseline
    for alpha in [0.25, 0.5, 0.75]:
        pb = df.loc[subang, "baseline_score"].to_numpy()
        # rank-normalize both to 0..1
        pr = pd.Series(p).rank(pct=True).to_numpy()
        br = pd.Series(pb).rank(pct=True).to_numpy()
        hy = alpha * pr + (1 - alpha) * br
        print(f"hybrid alpha={alpha}:", evaluate(y[subang], hy, subang_urban[subang]))
