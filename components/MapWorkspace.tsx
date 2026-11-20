"use client";

import { useEffect, useMemo, useState } from "react";
import Copilot from "./Copilot";
import MapCanvas from "./MapCanvas";
import type { Layers, Meta, Site } from "@/lib/types";

type SimStore = {
  id: string;
  name: string;
  brand: string;
  distanceM: number;
  overlap: number;
};

type Simulation = {
  h3: string;
  chain: string;
  radiusM: number;
  grossScore: number;
  netScore: number;
  cannibalization: number;
  stores: SimStore[];
};

function scoreClass(score: number) {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

const DEFAULT_LAYERS: Layers = { scores: true, stores: true, anchors: true };

export default function MapWorkspace() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS);
  const [selected, setSelected] = useState<Site | null>(null);
  const [focus, setFocus] = useState<{ lng: number; lat: number; h3?: string } | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [chain, setChain] = useState<"Alfamart" | "Indomaret">("Alfamart");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/data/meta.json").then((r) => r.json()),
      fetch("/data/top-sites.json").then((r) => r.json()),
    ])
      .then(([metaJson, sitesJson]) => {
        if (!alive) return;
        setMeta(metaJson);
        setSites(sitesJson);
        if (sitesJson.length > 0) setSelected(sitesJson[0]);
      })
      .catch(() => {
        /* biarkan empty state tampil */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selected?.h3) {
      setSim(null);
      return;
    }

    let alive = true;
    setSimLoading(true);
    setSimError(null);

    fetch(
      `/api/simulate?h3=${encodeURIComponent(selected.h3)}&chain=${encodeURIComponent(chain)}`,
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<Simulation>;
      })
      .then((data) => {
        if (alive) setSim(data);
      })
      .catch((error: Error) => {
        if (alive) {
          setSim(null);
          setSimError(error.message);
        }
      })
      .finally(() => {
        if (alive) setSimLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selected?.h3, chain]);

  const counts = meta?.counts;

  const stats = useMemo(
    () => [
      { value: counts ? counts.stores.toString() : "—", label: "Minimarket" },
      { value: counts ? counts.anchors.toString() : "—", label: "Anchor POI" },
      {
        value: counts ? counts.h3Cells.toLocaleString("id-ID") : "—",
        label: "Sel H3",
      },
    ],
    [counts],
  );

  function selectFromList(site: Site) {
    setSelected(site);
    setFocus({ lng: site.lng, lat: site.lat, h3: site.h3 });
  }

  function toggleLayer(key: keyof Layers) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">GS</div>
            <div>
              <div className="brand-title">GIS Sentry</div>
              <div className="brand-sub">
                Retail site intelligence · Subang · radius {meta?.radiusKm ?? 10} km
              </div>
            </div>
          </div>

          <div className="meta-grid">
            {stats.map((item) => (
              <div className="meta-card" key={item.label}>
                <div className="meta-value">{item.value}</div>
                <div className="meta-label">{item.label}</div>
              </div>
            ))}
          </div>

          <a className="model-link" href="/model">
            <span>Model report</span>
            <span>LightGBM vs weighted-v1 →</span>
          </a>
        </div>

        <div className="sidebar-scroll">
          <section className="section">
            <div className="section-head">
              <div className="section-title">Layer</div>
              <div className="section-hint">klik untuk toggle</div>
            </div>
            <div className="layer-row">
              <button
                type="button"
                className={`layer-toggle ${layers.scores ? "active" : ""}`}
                onClick={() => toggleLayer("scores")}
              >
                <span className="layer-dot" />
                Skor H3
              </button>
              <button
                type="button"
                className={`layer-toggle ${layers.stores ? "active" : ""}`}
                onClick={() => toggleLayer("stores")}
              >
                <span className="layer-dot" />
                Minimarket
              </button>
              <button
                type="button"
                className={`layer-toggle ${layers.anchors ? "active" : ""}`}
                onClick={() => toggleLayer("anchors")}
              >
                <span className="layer-dot" />
                Anchor
              </button>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <div className="section-title">Kandidat lokasi</div>
              <div className="section-hint">tanpa gerai &lt; 1 km</div>
            </div>
            <div className="candidates">
              {sites.length === 0 ? (
                <div className="empty">Memuat kandidat…</div>
              ) : (
                sites.map((site) => (
                  <button
                    type="button"
                    key={site.h3}
                    className={`candidate ${selected?.h3 === site.h3 ? "active" : ""}`}
                    onClick={() => selectFromList(site)}
                  >
                    <span className="candidate-rank">{site.rank}</span>
                    <span className="candidate-main">
                      <span className="candidate-name">
                        {site.anchors_1_5km} anchor · {site.dist_center_km} km dari pusat
                      </span>
                      <span className="candidate-sub">
                        {site.h3.slice(-7)} · gerai terdekat {site.nearest_store_km ?? "—"} km
                      </span>
                    </span>
                    <span className={`score-pill ${scoreClass(site.score)}`}>
                      {Math.round(site.score)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <div className="section-title">Detail sel</div>
              <div className="section-hint">dekomposisi skor</div>
            </div>

            {!selected ? (
              <div className="empty">
                Klik salah satu kandidat atau klik hexagon di peta untuk melihat
                dekomposisi skor.
              </div>
            ) : (
              <div className="detail">
                <div className="score-hero">
                  <div>
                    <div className="score-big">
                      {Math.round(selected.score)}
                      <span style={{ fontSize: 14, color: "var(--muted-2)" }}>/100</span>
                    </div>
                    <div className="score-caption">
                      H3 {selected.h3} · {selected.lat}, {selected.lng}
                    </div>
                  </div>
                  <span className={`score-pill ${scoreClass(selected.score)}`}>
                    {scoreClass(selected.score) === "high"
                      ? "kuat"
                      : scoreClass(selected.score) === "mid"
                        ? "sedang"
                        : "lemah"}
                  </span>
                </div>

                <div className="bars">
                  {[
                    { label: "Demand", value: selected.demand, warn: false },
                    {
                      label: "Kompetisi",
                      value: selected.competition,
                      warn: selected.competition > 60,
                    },
                    { label: "Akses", value: selected.access, warn: false },
                    { label: "Risiko", value: selected.risk, warn: selected.risk > 50 },
                  ].map((bar) => (
                    <div className="bar-row" key={bar.label}>
                      <span className="bar-label">{bar.label}</span>
                      <span className="bar-track">
                        <span
                          className={`bar-fill ${bar.warn ? "warn" : ""}`}
                          style={{ width: `${Math.max(0, Math.min(100, bar.value))}%` }}
                        />
                      </span>
                      <span className="bar-value">{Math.round(bar.value)}</span>
                    </div>
                  ))}
                </div>

                <div className="stat-grid">
                  <div className="stat">
                    <div className="stat-value">{selected.anchors_1_5km}</div>
                    <div className="stat-label">Anchor ≤ 1,5 km</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{selected.stores_1km}</div>
                    <div className="stat-label">Gerai ≤ 1 km</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">
                      {selected.nearest_store_km ?? "—"} km
                    </div>
                    <div className="stat-label">Gerai terdekat</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{selected.dist_center_km} km</div>
                    <div className="stat-label">Dari pusat kota</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">
                      {selected.population_1_5km?.toLocaleString("id-ID") ?? "—"}
                    </div>
                    <div className="stat-label">Populasi ≤ 1,5 km</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{selected.nearest_road_km ?? "—"} km</div>
                    <div className="stat-label">Jalan arteri terdekat</div>
                  </div>
                </div>

                <div className="sim">
                  <div className="sim-head">
                    <span>Simulasi kanibalisasi</span>
                    <span className="section-hint">
                      radius {sim ? sim.radiusM / 1000 : 3} km
                    </span>
                  </div>

                  <div className="chain-row">
                    {(["Alfamart", "Indomaret"] as const).map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        className={`chain-toggle ${chain === brand ? "active" : ""}`}
                        onClick={() => setChain(brand)}
                      >
                        {brand}
                      </button>
                    ))}
                    <span className="section-hint">jaringan sendiri</span>
                  </div>

                  {simLoading ? (
                    <div className="sim-error">Menghitung overlap…</div>
                  ) : sim ? (
                    <>
                      <div className="sim-grid">
                        <div className="sim-card">
                          <div className="sim-value">{Math.round(sim.grossScore)}</div>
                          <div className="sim-label">Gross</div>
                        </div>
                        <div className="sim-card">
                          <div className="sim-value">{Math.round(sim.netScore)}</div>
                          <div className="sim-label">Net</div>
                        </div>
                        <div className="sim-card">
                          <div className="sim-value">
                            {Math.round(sim.cannibalization * 100)}%
                          </div>
                          <div className="sim-label">Terkikis</div>
                        </div>
                      </div>

                      {sim.stores.length > 0 ? (
                        <div className="sim-list">
                          {sim.stores.slice(0, 3).map((store) => (
                            <div className="sim-item" key={store.id}>
                              <span>
                                <b>{store.brand}</b> · {store.distanceM} m
                              </span>
                              <span>{Math.round(store.overlap * 100)}% overlap</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="sim-error">
                          Tidak ada gerai dalam 3 km. Net = gross.
                        </div>
                      )}

                      <div className="note" style={{ marginTop: 8 }}>
                        Hanya gerai brand yang sama yang dihitung sebagai
                        kanibalisasi. Buffer radial 3 km (belum isochrone);
                        kanibalisasi bersifat ordinal, bukan rupiah.
                      </div>
                    </>
                  ) : (
                    <div className="sim-error">
                      {simError ?? "Simulasi belum tersedia."}
                    </div>
                  )}
                </div>

                <a
                  className="memo-button"
                  href={`/api/memo?h3=${encodeURIComponent(selected.h3)}&chain=${encodeURIComponent(chain)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Unduh decision memo (PDF)
                </a>
                <a
                  className="memo-link"
                  href={`/memo/${selected.h3}?chain=${encodeURIComponent(chain)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Versi cetak / halaman memo →
                </a>

                <div className="note">
                  Model <strong>{meta?.model ?? "weighted-v1"}</strong> — demand 45%
                  (populasi WorldPop + anchor), kompetisi 25%, akses 20%, risiko
                  10% (masih placeholder). Skor adalah persentil relatif AOI,
                  bukan prediksi profit.
                </div>

                <a
                  className="memo-link"
                  href={`/memo/${selected.h3}?chain=${chain}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Lihat memo web</span>
                  <span>Print →</span>
                </a>
              </div>
            )}
          </section>
        </div>

        <Copilot />
      </aside>

      <main className="map-wrap">
        <MapCanvas
          layers={layers}
          selected={selected}
          focus={focus}
          onSelect={setSelected}
        />

        <div className="map-badge">
          <span>Skor lokasi</span>
          <strong>{meta?.model ?? "demo-heuristic-v0"}</strong>
          <span>
            · OSM + WorldPop{" "}
            {meta ? new Date(meta.generatedAt).toLocaleDateString("id-ID") : ""}
          </span>
        </div>

        <div className="legend">
          <div className="legend-title">Skor kelayakan (persentil AOI)</div>
          <div className="legend-bar" />
          <div className="legend-labels">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
          <div className="note" style={{ marginTop: 7 }}>
            Data: © OpenStreetMap contributors (ODbL)
          </div>
        </div>
      </main>
    </div>
  );
}
