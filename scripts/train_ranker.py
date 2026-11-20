from __future__ import annotations

import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, roc_auc_score
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
]

K_LIST = [10, 25, 50, 100]

PARAMS = {
    "objective": "binary",
    "metric": "auc",
    "boosting_type": "gbdt",
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


def precision_at_k(y_true: np.ndarray, scores: np.ndarray, k: int) -> float:
    k = min(k, len(scores))
    order = np.argsort(-scores)[:k]
    return float(np.sum(y_true[order]) / k)


def ndcg_at_k(y_true: np.ndarray, scores: np.ndarray, k: int) -> float:
    k = min(k, len(scores))
    order = np.argsort(-scores)[:k]
    rel = y_true[order]
    discounts = np.log2(np.arange(2, len(rel) + 2))
    dcg = np.sum(rel / discounts)
    ideal = np.sort(y_true)[::-1][:k]
    idcg = np.sum(ideal / np.log2(np.arange(2, len(ideal) + 2)))
    return float(dcg / idcg) if idcg > 0 else 0.0


def sample_weights(y: np.ndarray, population: np.ndarray) -> np.ndarray:
    threshold = np.median(population)
    weights = np.where(population >= threshold, 0.8, 0.15)
    weights = np.where(y == 1, 1.0, weights)
    return weights


def evaluate(y: np.ndarray, scores: np.ndarray, candidate_mask: np.ndarray) -> dict:
    y_c = y[candidate_mask]
    s_c = scores[candidate_mask]
    out = {}
    for k in K_LIST:
        out[f"precision@{k}"] = precision_at_k(y_c, s_c, k)
        out[f"ndcg@{k}"] = ndcg_at_k(y_c, s_c, k)
    if len(np.unique(y_c)) > 1:
        out["roc_auc"] = float(roc_auc_score(y_c, s_c))
        out["average_precision"] = float(average_precision_score(y_c, s_c))
    else:
        out["roc_auc"] = None
        out["average_precision"] = None
    out["candidates"] = int(candidate_mask.sum())
    out["positives"] = int(y_c.sum())
    return out


def mean_std(values: list[float]) -> dict:
    clean = [v for v in values if v is not None]
    if not clean:
        return {"mean": None, "std": None}
    return {"mean": float(np.mean(clean)), "std": float(np.std(clean))}


def summarize_folds(folds: list[dict], prefix: str) -> dict:
    keys = [
        "precision@10",
        "precision@25",
        "precision@50",
        "precision@100",
        "ndcg@10",
        "ndcg@25",
        "ndcg@50",
        "ndcg@100",
        "roc_auc",
        "average_precision",
    ]
    return {
        f"{prefix}_{key}": mean_std([fold.get(key) for fold in folds])
        for key in keys
    }


def main() -> None:
    df = pd.read_csv(DATA / "features.csv")
    df = df.fillna(0.0)

    y = df["label"].to_numpy()
    groups = df["block"].to_numpy()
    population = df["population_1_5km"].to_numpy()
    is_subang = df["is_subang"].to_numpy() == 1

    # Kandidat = sel urban (di atas median populasi catchment).
    urban = population >= np.median(population)
    subang_urban = is_subang & urban

    print(
        f"rows={len(df):,} positives={int(y.sum()):,} "
        f"subang={int(is_subang.sum()):,} subang_pos={int(y[is_subang].sum()):,}"
    )

    gkf = GroupKFold(n_splits=5)
    ml_folds, baseline_folds = [], []

    for fold, (train_idx, valid_idx) in enumerate(gkf.split(df, y, groups), start=1):
        train = df.iloc[train_idx]
        valid = df.iloc[valid_idx]

        model = lgb.LGBMClassifier(n_estimators=600, **PARAMS)
        model.fit(
            train[FEATURES],
            train["label"],
            sample_weight=sample_weights(
                train["label"].to_numpy(), train["population_1_5km"].to_numpy()
            ),
            eval_set=[(valid[FEATURES], valid["label"])],
            eval_metric="auc",
            callbacks=[lgb.early_stopping(50, verbose=False)],
        )

        prob = model.predict_proba(valid[FEATURES])[:, 1]
        ml = evaluate(
            valid["label"].to_numpy(), prob, urban[valid_idx]
        )
        base = evaluate(
            valid["label"].to_numpy(),
            valid["baseline_score"].to_numpy(),
            urban[valid_idx],
        )
        ml_folds.append(ml)
        baseline_folds.append(base)
        print(
            f"fold {fold}: P@10 ml={ml['precision@10']:.3f} base={base['precision@10']:.3f} "
            f"NDCG@50 ml={ml['ndcg@50']:.3f} base={base['ndcg@50']:.3f}"
        )

    # Transfer test: train di luar Subang, uji di Subang.
    train_mask = ~is_subang
    valid_mask = is_subang
    transfer_model = lgb.LGBMClassifier(n_estimators=500, **PARAMS)
    train_df = df[train_mask]
    transfer_model.fit(
        train_df[FEATURES],
        train_df["label"],
        sample_weight=sample_weights(
            train_df["label"].to_numpy(), train_df["population_1_5km"].to_numpy()
        ),
    )
    transfer_prob = transfer_model.predict_proba(df.loc[valid_mask, FEATURES])[:, 1]
    transfer = evaluate(
        df.loc[valid_mask, "label"].to_numpy(),
        transfer_prob,
        subang_urban[valid_mask],
    )
    transfer_base = evaluate(
        df.loc[valid_mask, "label"].to_numpy(),
        df.loc[valid_mask, "baseline_score"].to_numpy(),
        subang_urban[valid_mask],
    )
    print(
        f"Subang transfer: P@10 ml={transfer['precision@10']:.3f} base={transfer_base['precision@10']:.3f} "
        f"P@50 ml={transfer['precision@50']:.3f} base={transfer_base['precision@50']:.3f}"
    )

    # Model final: semua data, untuk prediksi.
    final_model = lgb.LGBMClassifier(n_estimators=500, **PARAMS)
    final_model.fit(
        df[FEATURES],
        y,
        sample_weight=sample_weights(y, population),
    )
    prob_all = final_model.predict_proba(df[FEATURES])[:, 1]

    predictions = pd.DataFrame(
        {
            "h3": df["h3"],
            "lat": df["lat"],
            "lng": df["lng"],
            "is_subang": df["is_subang"],
            "label": df["label"],
            "ml_prob": prob_all,
            "baseline_score": df["baseline_score"],
        }
    )
    predictions.to_csv(DATA / "predictions.csv", index=False)

    importance = sorted(
        zip(FEATURES, final_model.booster_.feature_importance(importance_type="gain")),
        key=lambda item: item[1],
        reverse=True,
    )

    metrics = {
        "generatedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "dataset": {
            "rows": int(len(df)),
            "positives": int(y.sum()),
            "positiveRate": float(y.mean()),
            "subangCells": int(is_subang.sum()),
            "subangPositives": int(y[is_subang].sum()),
            "features": FEATURES,
            "cv": "GroupKFold(5) by 0.05-degree spatial block",
        },
        "baseline": {
            "description": "weighted-v1 (demand 45%, competition 25%, access 20%, risk 10%)",
            "cv": summarize_folds(baseline_folds, "baseline"),
            "subang_transfer": transfer_base,
        },
        "ml": {
            "description": "LightGBM binary ranker; PU-style sample weights; own-cell stores excluded",
            "cv": summarize_folds(ml_folds, "ml"),
            "subang_transfer": transfer,
        },
        "featureImportanceGain": [
            {"feature": feature, "gain": float(gain)} for feature, gain in importance
        ],
        "caveats": [
            "Label = sel H3 berisi minimarket chain Overture (Alfamart/Indomaret/Alfamidi).",
            "Sel tanpa gerai bukan negative sejati; bobot negatif rendah (PU-style).",
            "Precision@K dihitung pada sel urban (populasi catchment >= median).",
            "Subang transfer = train di luar Subang, uji di Subang; sampel positif Subang kecil.",
        ],
    }

    (DATA / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )

    public_ml = BASE / "public" / "data" / "ml"
    public_ml.mkdir(parents=True, exist_ok=True)
    (public_ml / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    (public_ml / "dataset-summary.json").write_text(
        (DATA / "dataset-summary.json").read_text(encoding="utf-8"),
        encoding="utf-8",
    )

    print("\n=== CV (mean ± std, urban candidates) ===")
    for key in ["precision@10", "precision@50", "precision@100", "ndcg@50", "roc_auc"]:
        ml = metrics["ml"]["cv"][f"ml_{key}"]
        base = metrics["baseline"]["cv"][f"baseline_{key}"]
        print(
            f"{key:14s} ML {ml['mean']:.3f}±{ml['std']:.3f}   "
            f"baseline {base['mean']:.3f}±{base['std']:.3f}"
        )

    print("\n=== Subang transfer ===")
    for key in ["precision@10", "precision@25", "precision@50", "ndcg@50"]:
        print(
            f"{key:14s} ML {transfer[key]:.3f}   baseline {transfer_base[key]:.3f}"
        )


if __name__ == "__main__":
    main()
