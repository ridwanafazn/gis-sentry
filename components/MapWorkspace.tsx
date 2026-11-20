"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  FileDown,
  FileText,
  Info,
  Layers as LayersIcon,
  MapPin,
  MapPinned,
  Store,
} from "lucide-react";
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

function formatMetaDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

type MobileTab = "kandidat" | "detail" | "tanya";
type SheetSnap = "peek" | "half" | "full";

const TABS: { id: MobileTab; label: string }[] = [
  { id: "kandidat", label: "Kandidat" },
  { id: "detail", label: "Detail" },
  { id: "tanya", label: "Tanya" },
];

type Props = {
  initialMeta?: Meta | null;
  initialSites?: Site[];
};

export default function MapWorkspace({
  initialMeta = null,
  initialSites = [],
}: Props) {
  const [meta, setMeta] = useState<Meta | null>(initialMeta);
  const [sites, setSites] = useState<Site[]>(initialSites);
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS);
  const [selected, setSelected] = useState<Site | null>(
    initialSites[0] ?? null,
  );
  const [focus, setFocus] = useState<{
    lng: number;
    lat: number;
    h3?: string;
  } | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [chain, setChain] = useState<"Alfamart" | "Indomaret">("Alfamart");
  const [mobileTab, setMobileTab] = useState<MobileTab>("kandidat");
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("peek");
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [dataReload, setDataReload] = useState(0);
  const [simReload, setSimReload] = useState(0);
  const [mapInset, setMapInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function updateMapInset() {
      if (!window.matchMedia("(max-width: 1120px)").matches) {
        setMapInset(0);
        return;
      }

      const sheet = document.querySelector<HTMLElement>(".sidebar");
      setMapInset(sheet ? Math.round(sheet.getBoundingClientRect().height) : 0);
    }

    updateMapInset();
    const timer = window.setTimeout(updateMapInset, 240);
    window.addEventListener("resize", updateMapInset);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateMapInset);
    };
  }, [sheetSnap, mobileTab]);

  useEffect(() => {
    if (initialSites.length > 0 && dataReload === 0) return;

    let alive = true;
    setSitesError(null);
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
      .catch((error: unknown) => {
        if (!alive) return;
        console.error("Gagal memuat data kandidat", error);
        setSitesError(
          "Data kandidat tidak dapat dimuat. Periksa koneksi lalu coba lagi.",
        );
      });
    return () => {
      alive = false;
    };
  }, [dataReload, initialSites.length]);

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
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<Simulation>;
      })
      .then((data) => {
        if (alive) setSim(data);
      })
      .catch((error: Error) => {
        if (!alive) return;
        console.error("Gagal menghitung simulasi", error);
        setSim(null);
        setSimError(
          error.message === "Failed to fetch"
            ? "Simulasi tidak dapat dihubungi. Periksa koneksi lalu coba lagi."
            : error.message,
        );
      })
      .finally(() => {
        if (alive) setSimLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selected?.h3, chain, simReload]);

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

  function resetSheetScroll() {
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 1120px)").matches
    ) {
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById("sheet-scroll")?.scrollTo({ top: 0 });
    });
  }

  function selectFromList(site: Site) {
    setSelected(site);
    setFocus({ lng: site.lng, lat: site.lat, h3: site.h3 });

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1120px)").matches
    ) {
      setMobileTab("detail");
      setSheetSnap("half");
      resetSheetScroll();
      requestAnimationFrame(() => {
        document.getElementById("tab-detail")?.focus();
      });
      return;
    }

    requestAnimationFrame(() => {
      const detail = document.getElementById("detail-section");
      detail?.scrollIntoView({ block: "start" });
      detail?.focus({ preventScroll: true });
    });
  }

  function toggleLayer(key: keyof Layers) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function switchTab(tab: MobileTab) {
    setMobileTab(tab);
    setSheetSnap((prev) => (prev === "peek" ? "half" : prev));
    resetSheetScroll();
  }

  function cycleSheet() {
    setSheetSnap((prev) =>
      prev === "peek" ? "half" : prev === "half" ? "full" : "half",
    );
  }

  function handleGripKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSheetSnap((prev) => (prev === "peek" ? "half" : "full"));
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSheetSnap((prev) => (prev === "full" ? "half" : "peek"));
    }
  }

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;

    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;

    event.preventDefault();
    const nextTab = TABS[next].id;
    switchTab(nextTab);
    requestAnimationFrame(() => {
      document.getElementById(`tab-${nextTab}`)?.focus();
    });
  }

  return (
    <div className="shell" data-tab={mobileTab} data-snap={sheetSnap}>
      <h1 className="sr-only">GIS Sentry, site intelligence Subang</h1>

      <header className="mobile-bar">
        <div className="mobile-bar-brand">
          <span className="mobile-bar-mark" aria-hidden="true">
            <MapPinned size={17} strokeWidth={1.75} />
          </span>
          <div>
            <div className="mobile-bar-title">GIS Sentry</div>
            <div className="mobile-bar-sub">
              {counts
                ? `${counts.stores} gerai · ${counts.h3Cells.toLocaleString("id-ID")} sel`
                : "Subang"}
            </div>
          </div>
        </div>
        <div className="mobile-bar-actions">
          <a
            className="mobile-bar-icon"
            href="/about"
            aria-label="Tentang aplikasi"
          >
            <Info size={16} strokeWidth={1.75} />
          </a>
          <a className="mobile-bar-link" href="/model">
            Model
            <ArrowUpRight size={12} strokeWidth={1.75} />
          </a>
          <button
            type="button"
            className="mobile-bar-score"
            disabled={!selected}
            onClick={() => {
              setMobileTab("detail");
              setSheetSnap("half");
            }}
          >
            <span>{selected ? Math.round(selected.score) : "—"}</span>
            <small>/100</small>
            <span className="sr-only">Buka detail lokasi</span>
          </button>
        </div>
      </header>

      <aside className="sidebar" aria-label="Panel kandidat dan detail">
        <div className="sheet-head">
          <button
            type="button"
            className="sheet-grip"
            aria-expanded={sheetSnap !== "peek"}
            aria-controls="panel-kandidat panel-detail panel-tanya"
            onClick={cycleSheet}
            onKeyDown={handleGripKeyDown}
          >
            <span className="sheet-grip-bar" aria-hidden="true" />
            <span className="sheet-grip-copy">
              <span className="sheet-grip-title">
                {selected ? `H3 ${selected.h3.slice(-6)}` : "Pilih lokasi"}
              </span>
              <span className="sheet-grip-sub">
                {selected
                  ? `${selected.anchors_1_5km} anchor · ${Math.round(selected.score)}/100`
                  : "Kandidat, detail, dan tanya"}
              </span>
            </span>
            {sheetSnap === "peek" ? (
              <ChevronUp size={17} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <ChevronDown size={17} strokeWidth={1.75} aria-hidden="true" />
            )}
            <span className="sr-only">
              {sheetSnap === "full"
                ? "Ciutkan panel lokasi"
                : "Perluas panel lokasi"}
            </span>
          </button>

          <div className="sheet-tabs" role="tablist" aria-label="Panel lokasi">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={mobileTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={mobileTab === tab.id ? 0 : -1}
                className={`sheet-tab ${mobileTab === tab.id ? "active" : ""}`}
                onClick={() => switchTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {tab.label}
                {tab.id === "kandidat" && sites.length > 0 ? (
                  <span className="sheet-tab-count">{sites.length}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <MapPinned size={19} strokeWidth={1.75} />
            </div>
            <div>
              <div className="brand-title">GIS Sentry</div>
              <div className="brand-sub">
                Retail site intelligence · Subang · radius{" "}
                {meta?.radiusKm ?? 10} km
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
            <span>
              LightGBM vs weighted-v1
              <ArrowUpRight size={13} strokeWidth={1.75} />
            </span>
          </a>
          <a className="about-app-link" href="/about">
            Tentang aplikasi
            <ArrowUpRight size={12} strokeWidth={1.75} />
          </a>
        </div>

        <div className="sidebar-scroll" id="sheet-scroll">
          <div
            className="sheet-panel"
            id="panel-kandidat"
            role="tabpanel"
            aria-labelledby="tab-kandidat"
          >
            <section className="section">
              <div className="section-head">
                <h2 className="section-title">Layer</h2>
                <div className="section-hint">klik untuk toggle</div>
              </div>
              <div className="layer-row">
                <button
                  type="button"
                  className={`layer-toggle ${layers.scores ? "active" : ""}`}
                  aria-pressed={layers.scores}
                  onClick={() => toggleLayer("scores")}
                >
                  <LayersIcon size={14} strokeWidth={1.75} />
                  Skor H3
                </button>
                <button
                  type="button"
                  className={`layer-toggle ${layers.stores ? "active" : ""}`}
                  aria-pressed={layers.stores}
                  onClick={() => toggleLayer("stores")}
                >
                  <Store size={14} strokeWidth={1.75} />
                  Minimarket
                </button>
                <button
                  type="button"
                  className={`layer-toggle ${layers.anchors ? "active" : ""}`}
                  aria-pressed={layers.anchors}
                  onClick={() => toggleLayer("anchors")}
                >
                  <MapPin size={14} strokeWidth={1.75} />
                  Anchor
                </button>
              </div>
            </section>

            <section className="section">
              <div className="section-head">
                <h2 className="section-title">Kandidat lokasi</h2>
                <div className="section-hint">tanpa gerai &lt; 1 km</div>
              </div>
              <div className="candidates">
                {sitesError ? (
                  <div className="state state--error" role="alert">
                    <strong>Kandidat gagal dimuat</strong>
                    <span>{sitesError}</span>
                    <button
                      type="button"
                      className="state-action"
                      onClick={() => {
                        setSitesError(null);
                        setDataReload((value) => value + 1);
                      }}
                    >
                      Muat ulang
                    </button>
                  </div>
                ) : sites.length === 0 ? (
                  <div className="state" role="status" aria-live="polite">
                    <strong>Memuat kandidat…</strong>
                    <span>Menyiapkan shortlist dari skor AOI.</span>
                  </div>
                ) : (
                  sites.map((site) => (
                    <button
                      type="button"
                      key={site.h3}
                      className={`candidate ${selected?.h3 === site.h3 ? "active" : ""}`}
                      aria-pressed={selected?.h3 === site.h3}
                      onClick={() => selectFromList(site)}
                    >
                      <span className="candidate-rank">{site.rank}</span>
                      <span className="candidate-main">
                        <span className="candidate-name">
                          {site.anchors_1_5km} anchor · {site.dist_center_km} km
                          dari pusat
                        </span>
                        <span className="candidate-sub">
                          {site.h3.slice(-7)} · gerai terdekat{" "}
                          {site.nearest_store_km ?? "—"} km
                        </span>
                      </span>
                      <span className={`score-pill ${scoreClass(site.score)}`}>
                        {site.score.toFixed(1)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>

          <div
            className="sheet-panel"
            id="panel-detail"
            role="tabpanel"
            aria-labelledby="tab-detail"
          >
            <section className="section" id="detail-section" tabIndex={-1}>
              <div className="section-head">
                <h2 className="section-title">Detail sel</h2>
                <div className="section-hint">dekomposisi skor</div>
              </div>

              {!selected ? (
                <div className="state" role="status">
                  <strong>Belum ada lokasi dipilih</strong>
                  <span>
                    Pilih kandidat dari tab Kandidat atau klik hexagon di peta
                    untuk melihat dekomposisi skor.
                  </span>
                </div>
              ) : (
                <div className="detail">
                  <div className="score-hero">
                    <div>
                      <div className="score-big">
                        {selected.score.toFixed(1)}
                        <span style={{ fontSize: 14, color: "var(--muted-2)" }}>
                          /100
                        </span>
                      </div>
                      <div className="score-caption">
                        H3 {selected.h3} · {selected.lat}, {selected.lng}
                      </div>
                    </div>
                    <span
                      className={`score-pill ${scoreClass(selected.score)}`}
                    >
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
                      {
                        label: "Risiko",
                        value: selected.risk,
                        warn: selected.risk > 50,
                      },
                    ].map((bar) => (
                      <div className="bar-row" key={bar.label}>
                        <span className="bar-label">{bar.label}</span>
                        <span className="bar-track">
                          <span
                            className={`bar-fill ${bar.warn ? "warn" : ""}`}
                            style={{
                              width: `${Math.max(0, Math.min(100, bar.value))}%`,
                            }}
                          />
                        </span>
                        <span className="bar-value">
                          {Math.round(bar.value)}
                        </span>
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
                      <div className="stat-value">
                        {selected.dist_center_km} km
                      </div>
                      <div className="stat-label">Dari pusat kota</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">
                        {selected.population_1_5km?.toLocaleString("id-ID") ??
                          "—"}
                      </div>
                      <div className="stat-label">Populasi ≤ 1,5 km</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">
                        {selected.nearest_road_km ?? "—"} km
                      </div>
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
                          aria-pressed={chain === brand}
                          onClick={() => setChain(brand)}
                        >
                          {brand}
                        </button>
                      ))}
                      <span className="section-hint">jaringan sendiri</span>
                    </div>

                    {simLoading ? (
                      <div className="sim-status" role="status">
                        Menghitung overlap…
                      </div>
                    ) : sim ? (
                      <>
                        <div className="sim-grid">
                          <div className="sim-card">
                            <div className="sim-value">
                              {sim.grossScore.toFixed(1)}
                            </div>
                            <div className="sim-label">Gross</div>
                          </div>
                          <div className="sim-card">
                            <div className="sim-value">
                              {sim.netScore.toFixed(1)}
                            </div>
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
                                <span>
                                  {Math.round(store.overlap * 100)}% overlap
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="sim-status">
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
                      <div
                        className="state state--error state--compact"
                        role="alert"
                      >
                        <strong>Simulasi gagal</strong>
                        <span>{simError ?? "Simulasi belum tersedia."}</span>
                        <button
                          type="button"
                          className="state-action"
                          onClick={() => setSimReload((value) => value + 1)}
                        >
                          Coba lagi
                        </button>
                      </div>
                    )}
                  </div>

                  <a
                    className="memo-button"
                    href={`/api/memo?h3=${encodeURIComponent(selected.h3)}&chain=${encodeURIComponent(chain)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileDown size={14} strokeWidth={1.75} />
                    Unduh decision memo (PDF)
                  </a>
                  <a
                    className="memo-link"
                    href={`/memo/${selected.h3}?chain=${encodeURIComponent(chain)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={13} strokeWidth={1.75} />
                    Versi cetak / halaman memo
                  </a>

                  <div className="note">
                    Model <strong>{meta?.model ?? "weighted-v1"}</strong> —
                    demand 45% (populasi WorldPop + anchor), kompetisi 25%,
                    akses 20%, risiko 10% (masih placeholder). Skor adalah
                    persentil relatif AOI, bukan prediksi profit.
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <div
          className="sheet-panel sheet-panel--tanya"
          id="panel-tanya"
          role="tabpanel"
          aria-labelledby="tab-tanya"
        >
          <Copilot />
        </div>
      </aside>

      <main className="map-wrap">
        <MapCanvas
          layers={layers}
          selected={selected}
          focus={focus}
          bottomInset={mapInset}
          onSelect={setSelected}
        />

        <div className="map-badge">
          <span>Skor lokasi</span>
          <strong>{meta?.model ?? "weighted-v1"}</strong>
          <span suppressHydrationWarning>
            · OSM + WorldPop {meta ? formatMetaDate(meta.generatedAt) : ""}
          </span>
        </div>

        <div className="legend">
          <div className="legend-title">Persentil skor AOI</div>
          <div className="legend-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="legend-labels">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
          <div className="legend-markers" aria-label="Penanda peta">
            <span className="legend-marker">
              <i className="legend-dot indomaret" aria-hidden="true" />
              Indomaret
            </span>
            <span className="legend-marker">
              <i className="legend-dot alfamart" aria-hidden="true" />
              Alfamart
            </span>
            <span className="legend-marker">
              <i className="legend-dot alfamidi" aria-hidden="true" />
              Alfamidi
            </span>
            <span className="legend-marker">
              <i className="legend-dot other" aria-hidden="true" />
              Lainnya
            </span>
            <span className="legend-marker">
              <i className="legend-dot anchor" aria-hidden="true" />
              Anchor
            </span>
          </div>
          <div className="note" style={{ marginTop: 7 }}>
            © OpenStreetMap contributors (ODbL)
          </div>
        </div>
      </main>
    </div>
  );
}
