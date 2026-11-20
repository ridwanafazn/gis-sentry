# GIS Sentry — Retail Site Intelligence (Subang)

Spatial decision support untuk ekspansi minimarket di Kabupaten Subang: skor lokasi per grid H3, dekomposisi faktor, kandidat lokasi, dan AI copilot yang menjawab dari data — bukan mengarang.

> **Status:** Fase 0–4 selesai secara lokal — peta MVT PostGIS, WorldPop 100m, skor **weighted-v1**, simulasi kanibalisasi, copilot OpenCode Go, evaluasi LightGBM, **decision memo PDF**, **RAG dokumen**, dan **health check**.
> ML **tidak dipakai di produksi** karena kalah saat transfer ke Subang; laporan di `/model`. Live deploy Vercel + Neon menunggu kredensial/network (lihat `docs/03-deploy.md`).

---

## Yang sudah jalan

- Peta MapLibre dengan basemap gelap, AOI 10 km Kota Subang.
- 24 minimarket + 57 anchor POI asli dari OpenStreetMap (AOI 10 km).
- Populasi **WorldPop 2020 constrained 100m** per sel H3 (273.170 jiwa di AOI).
- 233 way jalan arteri/kolektor OSM untuk skor aksesibilitas.
- 2.982 sel H3 resolusi 9 dengan **weighted-v1** + 8 kandidat lokasi.
- Heatmap H3 dilayani sebagai **MVT dari PostGIS** (`ST_AsMVT`), bukan GeoJSON statis.
- Panel detail: demand, kompetisi, akses, risiko, populasi catchment, jarak jalan/gerai.
- Simulasi kanibalisasi per brand (Alfamart/Indomaret): gross vs net, daftar gerai yang tumpang tindih.
- Endpoint MVT `GET /api/tiles/[z]/[x]/[y]` (PostGIS `ST_AsMVT`).
- Endpoint simulasi `GET /api/simulate?h3=...&chain=Alfamart` (PostGIS `ST_DWithin` + distance decay).
- Copilot OpenCode Go dengan tool `top_sites` dan `site_detail`.
- **Model report `/model`**: LightGBM vs weighted-v1, spatial block CV, Subang transfer test, feature importance.
- **Decision memo `/memo/[h3]`** + PDF `GET /api/memo?h3=...`: memo A4, gross vs net, rekomendasi.
- **RAG dokumen**: `data/knowledge/` + `/api/knowledge?q=...` + tool `search_docs` di copilot (BM25 + sitasi).
- **Health check `/api/health`** untuk verifikasi deploy.
- Skema PostGIS + seed script + Docker Compose.

---

## Quick start

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Heatmap H3 memakai MVT dari PostGIS; tanpa database layer heatmap kosong, tetapi UI, memo, dan model report tetap terbuka.

### Aktifkan PostGIS + tile endpoint

1. Start Docker Desktop, lalu:

```bash
docker compose up -d
```

2. Isi `.env.local` (sudah ada default lokal):

```env
DATABASE_URL=postgresql://gis:gis@localhost:5432/gissentry
```

3. Seed data:

```bash
npm run db:seed
```

4. Restart `npm run dev`, lalu tes tile:

```bash
curl -I http://localhost:3000/api/tiles/12/3276/2035
```

> Schema otomatis dijalankan saat volume Postgres pertama kali dibuat. Kalau `db/schema.sql` berubah, jalankan ulang manual atau hapus volume.

### Aktifkan AI copilot (OpenCode Go)

1. Buat API key di https://opencode.ai/console (Go subscription).
2. Isi `.env.local`:

```env
OPENCODE_GO_API_KEY=sk-opencode-...
OPENCODE_GO_BASE_URL=https://opencode.ai/inference/go/v1
OPENCODE_GO_MODEL=deepseek-v4.1-flash
```

3. Restart dev server.

Endpoint yang dipakai: `https://opencode.ai/inference/go/v1` (OpenAI-compatible). Model default: `deepseek-v4.1-flash`.

Kalau key belum diisi, copilot menampilkan pesan error yang jelas — bukan crash.

---

## Pipeline data

```bash
npm run data:osm   # OSM: minimarket, anchor, jalan arteri (AOI + kabupaten)
npm run data:pop   # WorldPop 2020 100m → populasi per sel H3
npm run data:score # weighted-v1: demand, kompetisi, akses, kandidat
npm run db:seed    # masukkan stores, anchors, roads, h3_cells ke PostGIS
```

> `data:pop` mengunduh GeoTIFF WorldPop Indonesia (~103 MB) ke `data/population/` (gitignored), lalu hanya membaca window AOI. Kalau file sudah ada, script memakai raster lokal.

### Pipeline Phase 3 (evaluasi ML)

```bash
pip install -r requirements.txt
overturemaps download --bbox=107.25,-6.95,108.0,-6.15 -f geojson --type=place -o data/overture/subang-places.geojson
npm run data:osm          # anchors + roads skala bbox
npm run data:pop:regency  # populasi WorldPop per H3 untuk bbox
npm run ml:dataset        # 69.928 sel + 681 label positif Overture
npm run ml:train          # LightGBM + spatial CV + Subang holdout
```

Hasil evaluasi: `data/ml/metrics.json`, `docs/02-model-evaluation.md`, dan halaman `/model`.
File besar (`data/overture/*.geojson`, `features.csv`, `predictions.csv`) gitignored.

File yang dihasilkan:

| File | Isi |
|---|---|
| `public/data/stores.geojson` | minimarket AOI (Alfamart/Indomaret/Alfamidi/lain) |
| `public/data/anchors.geojson` | pasar, kampus, RS, sekolah, stasiun |
| `public/data/h3-final.geojson` | 2.982 sel H3 + skor weighted-v1 |
| `public/data/top-sites.json` | 8 kandidat teratas |
| `public/data/meta.json` | metadata, sumber, bobot, jumlah data |
| `data/population/h3-population.json` | agregasi populasi WorldPop per H3 |

Data OSM diambil dari Overpass API dengan `User-Agent` project dan query unik (menghindari `duplicate_query`).

---

## Arsitektur

```
Browser
  └─ Next.js 16 (App Router) + MapLibre GL
       ├─ /api/tiles/[z]/[x]/[y]  → PostGIS ST_AsMVT
       ├─ /api/simulate           → PostGIS ST_DWithin + distance decay
       └─ /api/copilot            → OpenCode Go + tool calling
PostGIS
  ├─ stores, anchors
  ├─ h3_cells
  └─ (fase berikutnya) roads, flood zones, zoning
Python (fase berikutnya)
  └─ ingest OSM/WorldPop/BPS → LightGBM ranker → h3_scores
```

Stack: Next.js 16, TypeScript, MapLibre GL, PostGIS, `pg`, AI SDK 7, OpenCode Go, Tailwind-free custom CSS.

---

## Deploy

Target: **Vercel Hobby + Neon Free (PostGIS, region Singapore)**. Panduan lengkap ada di [`docs/03-deploy.md`](docs/03-deploy.md).

Ringkas:

```bash
# Neon: jalankan db/schema.sql, lalu seed
vercel link
vercel env add DATABASE_URL production
vercel env add OPENCODE_GO_API_KEY production
vercel --prod
```

Verifikasi: `GET /api/health` harus `{ "ok": true, "db": true, "aiConfigured": true }`. Cek jumlah data lewat `psql`:

```powershell
psql $env:DATABASE_URL -c "SELECT count(*) FROM h3_cells; SELECT count(*) FROM roads;"
```

> Live deploy belum dijalankan dari environment ini karena Vercel CLI tidak bisa menjangkau `api.vercel.com` dan belum ada kredensial produksi.

---

## Phase 4 — Productization

- **Decision memo** — PDF satu halaman dengan skor, dekomposisi faktor, kanibalisasi, rekomendasi, dan caveat. Endpoint: `/api/memo?h3=...&chain=Alfamart`. Versi cetak: `/memo/<h3>?chain=Alfamart`.
- **RAG dokumen** — BM25 atas `public/data/rag/index.json` (metodologi, batasan, checklist lapangan, konteks Subang, evaluasi model, deploy). Copilot memanggil tool `search_docs` dan mengutip `[source § heading]`. Uji: `/api/knowledge?q=batasan%20skor`.
- **Health check** — `/api/health` melaporkan status DB dan apakah API key AI terkonfigurasi.
- **Deploy** — `vercel.json` + panduan lengkap di `docs/03-deploy.md` (Neon PostGIS, env Vercel, seed, verifikasi). Live deploy belum dieksekusi karena `api.vercel.com` tidak bisa diakses dari environment ini.

Checklist progres lengkap: `docs/00-progress.md`.

---

## Data & lisensi

- © OpenStreetMap contributors, **ODbL** — atribusi wajib.
- **Overture Places** — CDLA-Permissive 2.0; dipakai untuk label training Phase 3.
- Basemap default: CARTO Dark Matter (atribusi otomatis di peta).
- Data BPS/WorldPop/InaRISK akan ditambahkan di fase berikutnya.
- Jangan scrape Google Maps/Places untuk produk.

---

## Roadmap

| Fase | Isi |
|---|---|
| **0 (selesai)** | Peta, OSM ingest, H3 demo, PostGIS, copilot |
| **1 (selesai)** | WorldPop + jalan OSM + weighted-v1 + MVT sebagai sumber peta |
| **2 (v0 selesai)** | Simulasi kanibalisasi per brand (gross vs net) |
| **3 (selesai — dievaluasi)** | LightGBM + spatial block CV + Subang holdout; ML kalah transfer → baseline dipertahankan |
| **4 (lokal selesai)** | Memo PDF + halaman cetak, RAG BM25, health check, deploy prep; live deploy Vercel/Neon menunggu akses |

---

## Model weighted-v1

- **Demand 45%** — 70% populasi WorldPop (distance decay 0,9 km) + 30% anchor POI (decay 1,2 km).
- **Kompetisi 25%** — gerai dalam 1,5 km (decay 0,7 km); semakin padat, semakin rendah skor.
- **Akses 20%** — jarak ke jalan arteri/kolektor + jalan lokal.
- **Risiko 10%** — masih placeholder 0; InaRISK/zonasi masuk fase berikutnya.
- **Skor akhir** — percentile rank di dalam AOI (0–100), bukan probabilitas profit.
- **Populasi** — WorldPop 2020 constrained 100m (UN-adjusted). Kalibrasi ke BPS per kecamatan belum dilakukan; karena skor relatif, kalibrasi tidak mengubah ranking.

### Hasil Phase 3 (LightGBM)

| Uji | LightGBM | Weighted-v1 |
|---|---|---|
| Regional CV · Precision@10 | **0,180** | 0,120 |
| Regional CV · NDCG@50 | **0,220** | 0,150 |
| Subang transfer · Precision@10 | 0,100 | **0,500** |
| Subang transfer · NDCG@50 | 0,132 | **0,273** |

ML menang di CV regional, tetapi **kalah saat ditransfer ke Subang** (hanya 91 sel positif lokal). Keputusan: produksi tetap **weighted-v1**; ML pipeline disimpan untuk diuji ulang setelah label Subang cukup.

### Catatan metodologi

- Label positif: gerai Alfamart/Indomaret existing (skala kabupaten).
- Label negatif hanya 13 — jangan pakai random negatives; gunakan hard negatives (sel urban tanpa gerai) + positive-unlabeled ranking.
- Evaluasi wajib **spatial block CV** per kecamatan, bukan random split.
- 10 km AOI hanya untuk demo; metrik dihitung di skala kabupaten.
- Skor adalah **persentil relatif di AOI**, bukan probabilitas profit.

Dokumen produk lengkap: [`docs/01-product-brief.md`](docs/01-product-brief.md).
