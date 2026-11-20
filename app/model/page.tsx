import Link from "next/link";
import metrics from "@/public/data/ml/metrics.json";
import dataset from "@/public/data/ml/dataset-summary.json";

export const metadata = {
  title: "Model Report — GIS Sentry",
  description:
    "Evaluasi LightGBM ranker vs weighted-v1 dengan spatial block CV dan Subang holdout.",
};

type Stat = { mean: number; std: number };

const mlCv = metrics.ml.cv as Record<string, Stat>;
const baseCv = metrics.baseline.cv as Record<string, Stat>;
const mlTransfer = metrics.ml.subang_transfer as Record<string, number | null>;
const baseTransfer = metrics.baseline.subang_transfer as Record<string, number | null>;

const CV_ROWS = [
  { key: "precision@10", label: "Precision@10" },
  { key: "precision@25", label: "Precision@25" },
  { key: "precision@50", label: "Precision@50" },
  { key: "precision@100", label: "Precision@100" },
  { key: "ndcg@50", label: "NDCG@50" },
  { key: "roc_auc", label: "ROC-AUC" },
];

const TRANSFER_ROWS = [
  { key: "precision@10", label: "Precision@10" },
  { key: "precision@25", label: "Precision@25" },
  { key: "precision@50", label: "Precision@50" },
  { key: "precision@100", label: "Precision@100" },
  { key: "ndcg@50", label: "NDCG@50" },
  { key: "roc_auc", label: "ROC-AUC" },
];

function fmt(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(3);
}

function fmtStat(stat: Stat | undefined) {
  if (!stat) return "—";
  return `${stat.mean.toFixed(3)} ± ${stat.std.toFixed(3)}`;
}

export default function ModelReport() {
  const features = metrics.featureImportanceGain.slice(0, 8);
  const maxGain = Math.max(...features.map((item) => item.gain));

  return (
    <main className="report-page">
      <nav className="report-nav">
        <Link href="/">← Kembali ke peta</Link>
        <span>GIS Sentry · Model Report</span>
      </nav>

      <header className="report-header">
        <div className="report-pill">Phase 3 · LightGBM ranker</div>
        <h1>ML vs weighted-v1</h1>
        <p className="report-lead">
          Uji apakah LightGBM bisa mengalahkan baseline weighted-v1 untuk memilih
          lokasi minimarket. Evaluasi memakai spatial block CV dan holdout
          Kabupaten Subang. Hasilnya: ML menang di CV regional, tetapi kalah saat
          ditransfer ke Subang. Produksi tetap memakai weighted-v1.
        </p>
      </header>

      <section className="report-grid">
        <div className="report-card">
          <div className="report-value">
            {dataset.cells.toLocaleString("id-ID")}
          </div>
          <div className="report-label">Sel H3 (bbox training)</div>
        </div>
        <div className="report-card">
          <div className="report-value">
            {dataset.positives.toLocaleString("id-ID")}
          </div>
          <div className="report-label">Sel positif (minimarket chain)</div>
        </div>
        <div className="report-card">
          <div className="report-value">
            {dataset.subangPositives.toLocaleString("id-ID")}
          </div>
          <div className="report-label">
            Positif Subang / {dataset.subangCells.toLocaleString("id-ID")} sel
          </div>
        </div>
        <div className="report-card">
          <div className="report-value">
            {dataset.blocks.toLocaleString("id-ID")}
          </div>
          <div className="report-label">Blok spasial · 5-fold CV</div>
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-head">
          <h2>Regional CV</h2>
          <span>GroupKFold(5) · blok 0,05° · kandidat urban</span>
        </div>
        <p className="report-note">
          Train/test di seluruh bbox Greater Subang, dipisah per blok spasial.
          Kandidat = sel dengan populasi catchment ≥ median.
        </p>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Metrik</th>
                <th>LightGBM</th>
                <th>Weighted-v1</th>
                <th>Selisih</th>
              </tr>
            </thead>
            <tbody>
              {CV_ROWS.map((row) => {
                const ml = mlCv[`ml_${row.key}`];
                const base = baseCv[`baseline_${row.key}`];
                const diff =
                  ml && base ? (ml.mean - base.mean).toFixed(3) : "—";
                return (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td className="mono">{fmtStat(ml)}</td>
                    <td className="mono">{fmtStat(base)}</td>
                    <td className={ml && base && ml.mean > base.mean ? "delta-up" : "delta-flat"}>
                      {diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-head">
          <h2>Subang transfer test</h2>
          <span>Train di luar Subang · uji di {dataset.subangCells.toLocaleString("id-ID")} sel Subang</span>
        </div>
        <p className="report-note">
          Ini uji yang paling relevan untuk produk: apakah model dari wilayah lain
          bisa memilih lokasi di Subang? Hanya {dataset.subangPositives} sel
          positif di Subang, jadi metriknya berisiko tinggi.
        </p>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Metrik</th>
                <th>LightGBM</th>
                <th>Weighted-v1</th>
                <th>Pemenang</th>
              </tr>
            </thead>
            <tbody>
              {TRANSFER_ROWS.map((row) => {
                const ml = mlTransfer[row.key];
                const base = baseTransfer[row.key];
                const winner =
                  ml == null || base == null
                    ? "—"
                    : ml > base
                      ? "ML"
                      : base > ml
                        ? "v1"
                        : "seri";
                return (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td className="mono">{fmt(ml)}</td>
                    <td className="mono">{fmt(base)}</td>
                    <td className={winner === "v1" ? "winner-v1" : winner === "ML" ? "winner-ml" : ""}>
                      {winner}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="report-callout warn">
          <strong>Keputusan:</strong> ML tidak dipakai sebagai skor produksi.
          Precision@10 ML 0,100 vs baseline 0,500 di Subang. Baseline lebih
          stabil karena tidak membutuhkan training label lokal. ML pipeline
          disimpan untuk diuji ulang setelah cakupan label Subang bertambah.
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-head">
          <h2>Feature importance</h2>
          <span>gain · model final</span>
        </div>
        <div className="importance">
          {features.map((item) => (
            <div className="importance-row" key={item.feature}>
              <div className="importance-name">{item.feature}</div>
              <div className="importance-track">
                <div
                  className="importance-fill"
                  style={{ width: `${(item.gain / maxGain) * 100}%` }}
                />
              </div>
              <div className="importance-value">
                {Math.round(item.gain).toLocaleString("id-ID")}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-head">
          <h2>Metodologi</h2>
          <span>ringkas</span>
        </div>
        <ul className="report-list">
          <li>
            <strong>Label:</strong> {dataset.stores.toLocaleString("id-ID")} minimarket
            Overture (Alfamart/Indomaret/Alfamidi) di bbox; {dataset.positives} sel H3
            positif.
          </li>
          <li>
            <strong>PU-style weights:</strong> positif 1,0; negatif urban 0,8;
            negatif rural 0,15. Sel tanpa gerai bukan negative sejati.
          </li>
          <li>
            <strong>Leakage guard:</strong> gerai di sel target tidak dihitung
            sebagai fitur kompetitor.
          </li>
          <li>
            <strong>Spatial CV:</strong> GroupKFold 5 fold berdasarkan blok
            0,05°; bukan random split.
          </li>
          <li>
            <strong>Evaluasi:</strong> Precision@K dan NDCG@K pada kandidat urban
            (populasi catchment ≥ median).
          </li>
          <li>
            <strong>Holdout:</strong> Subang dipisahkan dari training untuk menguji
            transfer, bukan hanya interpolasi.
          </li>
        </ul>
      </section>

      <footer className="report-footer">
        <span>
          Dataset: {metrics.dataset.rows.toLocaleString("id-ID")} sel ·{" "}
          {metrics.dataset.positives.toLocaleString("id-ID")} positif ·{" "}
          {metrics.dataset.cv}
        </span>
        <a href="/data/ml/metrics.json" target="_blank" rel="noreferrer">
          metrics.json ↗
        </a>
      </footer>
    </main>
  );
}
