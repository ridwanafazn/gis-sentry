import { notFound } from "next/navigation";
import { getMemoData } from "@/lib/memo";
import MemoActions from "./MemoActions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Decision Memo — GIS Sentry",
  description: "Memo kelayakan lokasi retail berbasis data spasial.",
};

type Props = {
  params: Promise<{ h3: string }>;
  searchParams: Promise<{ chain?: string }>;
};

const fmt = (value: number) =>
  new Intl.NumberFormat("id-ID").format(Math.round(value));

const km = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(2)} km`;

export default async function MemoPage({ params, searchParams }: Props) {
  const { h3 } = await params;
  const { chain: chainRaw } = await searchParams;
  const chain = chainRaw === "Indomaret" ? "Indomaret" : "Alfamart";

  let memo = null;
  try {
    memo = await getMemoData(h3, chain);
  } catch {
    memo = null;
  }

  if (!memo) notFound();

  const { site, gross, net, cannibalization, affected, recommendation } = memo;

  const level =
    site.score >= 75 && net >= 60
      ? "prioritas"
      : site.score >= 50 && net >= 40
        ? "pertimbangkan"
        : "tunda";

  const levelLabel =
    level === "prioritas"
      ? "PRIORITAS"
      : level === "pertimbangkan"
        ? "PERTIMBANGKAN"
        : "TUNDA";

  const date = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
  }).format(new Date());

  return (
    <main className="memo-page">
      <article className="memo-sheet">
        <div className="memo-top">
          <div>
            <div className="memo-kicker">GIS SENTRY · DECISION MEMO</div>
            <h1 className="memo-title">Evaluasi Lokasi</h1>
            <div className="memo-meta">
              H3 {site.h3} · {site.lat.toFixed(5)}, {site.lng.toFixed(5)} ·{" "}
              {date}
            </div>
          </div>
          <MemoActions h3={site.h3} chain={chain} />
        </div>

        <div className={`memo-badge ${level}`}>{levelLabel}</div>
        <p className="memo-lead">{recommendation}</p>

        <section className="memo-section">
          <h2>1 · Skor &amp; faktor</h2>
          <div className="memo-score-row">
            <div className="memo-score">
              {site.score.toFixed(1)}
              <span>/100</span>
            </div>
            <div className="memo-factors">
              <div className="memo-factor">
                <div className="memo-factor-label">Demand</div>
                <div className="memo-factor-value">{Math.round(site.demand)}</div>
              </div>
              <div className="memo-factor">
                <div className="memo-factor-label">Kompetisi</div>
                <div className="memo-factor-value">
                  {Math.round(site.competition)}
                </div>
              </div>
              <div className="memo-factor">
                <div className="memo-factor-label">Akses</div>
                <div className="memo-factor-value">{Math.round(site.access)}</div>
              </div>
              <div className="memo-factor">
                <div className="memo-factor-label">Risiko</div>
                <div className="memo-factor-value">{Math.round(site.risk)}</div>
              </div>
            </div>
          </div>
          <p className="memo-note">
            Skor adalah persentil relatif di AOI, bukan probabilitas profit.
            Kompetisi tinggi berarti banyak gerai pesaing di sekitar lokasi.
          </p>
        </section>

        <section className="memo-section">
          <h2>2 · Catchment &amp; akses</h2>
          <div className="memo-grid">
            <div className="memo-item">
              <div className="memo-item-value">{fmt(site.population_1_5km)}</div>
              <div className="memo-item-label">Populasi ≤ 1,5 km</div>
            </div>
            <div className="memo-item">
              <div className="memo-item-value">{site.anchors_1_5km}</div>
              <div className="memo-item-label">Anchor ≤ 1,5 km</div>
            </div>
            <div className="memo-item">
              <div className="memo-item-value">{site.stores_1km}</div>
              <div className="memo-item-label">Gerai ≤ 1 km</div>
            </div>
            <div className="memo-item">
              <div className="memo-item-value">
                {km(site.nearest_store_km)}
              </div>
              <div className="memo-item-label">Gerai terdekat</div>
            </div>
            <div className="memo-item">
              <div className="memo-item-value">
                {km(site.nearest_road_km)}
              </div>
              <div className="memo-item-label">Jalan arteri terdekat</div>
            </div>
            <div className="memo-item">
              <div className="memo-item-value">
                {site.dist_center_km.toFixed(2)} km
              </div>
              <div className="memo-item-label">Dari pusat kota</div>
            </div>
          </div>
        </section>

        <section className="memo-section">
          <h2>3 · Kanibalisasi jaringan {chain}</h2>
          <table className="memo-table">
            <thead>
              <tr>
                <th>Jaringan</th>
                <th>Gross</th>
                <th>Net</th>
                <th>Kanibalisasi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{chain}</td>
                <td>{gross.toFixed(1)}</td>
                <td>{net.toFixed(1)}</td>
                <td>{Math.round(cannibalization * 100)}%</td>
              </tr>
            </tbody>
          </table>

          {affected.length > 0 ? (
            <ul className="memo-store-list">
              {affected.slice(0, 4).map((store, index) => (
                <li key={`${store.brand}-${store.distanceM}-${index}`}>
                  <strong>{store.brand}</strong>
                  {store.name ? ` · ${store.name}` : ""} · {store.distanceM} m ·{" "}
                  {Math.round(store.overlap * 100)}% overlap
                </li>
              ))}
            </ul>
          ) : (
            <p className="memo-note">
              Tidak ada gerai {chain} dalam radius 3 km. Net = gross.
            </p>
          )}

          <p className="memo-note">
            Buffer radial 3 km, belum isochrone. Hanya gerai brand yang sama
            yang dihitung sebagai kanibalisasi. Nilainya ordinal, bukan rupiah.
          </p>
        </section>

        <section className="memo-section">
          <h2>4 · Risiko &amp; batasan</h2>
          <div className="memo-callout">
            Risiko banjir (InaRISK) dan zonasi/RDTR belum terhubung; skor risiko
            masih placeholder 0. Validasi constraint tetap wajib sebelum
            keputusan final. Model yang dipakai adalah <strong>weighted-v1</strong>;
            LightGBM sudah dievaluasi tetapi tidak dipakai karena kalah pada uji
            transfer Subang.
          </div>
        </section>

        <section className="memo-section">
          <h2>5 · Rekomendasi</h2>
          <p className="memo-lead" style={{ marginTop: 0 }}>
            {recommendation} Gunakan memo ini sebagai bahan diskusi, bukan
            keputusan otomatis. Sebelum tanda tangan sewa, lakukan survey
            lapangan, cek zonasi, dan negosiasi dengan pemilik lahan.
          </p>
        </section>

        <section className="memo-section">
          <h2>6 · Sumber data</h2>
          <ul className="memo-sources">
            <li>OpenStreetMap (ODbL) — gerai, anchor, jalan.</li>
            <li>WorldPop 2020 constrained 100 m — populasi.</li>
            <li>Overture Places (CDLA-Permissive 2.0) — label evaluasi model.</li>
            <li>PostGIS — skor, tile, dan simulasi kanibalisasi.</li>
          </ul>
        </section>

        <footer className="memo-footer">
          Dokumen dihasilkan otomatis oleh GIS Sentry · {date} · Skor bersifat
          relatif dan bukan prediksi profit. Data dapat berubah tanpa
          pemberitahuan.
        </footer>
      </article>
    </main>
  );
}
