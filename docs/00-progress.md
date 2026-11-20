# Progress & Phase Checklist

**Project:** GIS Sentry — Retail Site Intelligence (Subang)
**Status:** Phase 0–4 selesai secara lokal; **live deploy menunggu kredensial/network**.
**Model produksi:** weighted-v1.
**Terakhir diperbarui:** 20 November 2026

---

## Ringkasan angka

| Item | Nilai |
|---|---|
| AOI demo | radius 10 km Kota Subang |
| Minimarket AOI (OSM) | 24 |
| Anchor POI AOI | 57 |
| Sel H3 AOI | 2.982 |
| Populasi AOI (WorldPop) | 273.170 jiwa |
| Jalan arteri/kolektor AOI | 233 way |
| Dataset ML (bbox) | 69.928 sel · 681 positif · 1.390 minimarket Overture |
| Subang holdout | 20.657 sel · 91 positif |
| Model produksi | weighted-v1 (ML dievaluasi, tidak dipakai) |

---

## Tabel progres

| Fase | Status | Deliverable | Bukti |
|---|---|---|---|
| **0 · Foundation** | ✅ Selesai | Peta MapLibre, OSM ingest, grid H3, PostGIS, copilot skeleton | 24 minimarket AOI, 2.982 sel H3, `gissentry-db` healthy |
| **1 · Weighted model + MVT** | ✅ Selesai | WorldPop 100m, jalan OSM, weighted-v1, MVT PostGIS | 273.170 jiwa AOI, 233 way jalan, tile MVT 200 |
| **2 · Cannibalization** | ✅ Selesai (v0) | Simulasi gross vs net per brand | `/api/simulate`, Alfamart vs Indomaret |
| **3 · ML evaluation** | ✅ Selesai (dievaluasi) | LightGBM + spatial block CV + Subang holdout | 69.928 sel, 681 positif, laporan `/model` |
| **4a · Decision memo** | ✅ Selesai | PDF API + halaman memo cetak per lokasi | `/api/memo`, `/memo/[h3]` |
| **4b · RAG dokumen** | ✅ Selesai | Retriever BM25 + tool `search_docs` + API uji | `lib/rag.ts`, `/api/knowledge` |
| **4c · Deploy prep** | ✅ Selesai | `vercel.json`, health check, panduan Neon/Vercel | `/api/health`, `docs/03-deploy.md` |
| **4d · Live deploy** | ❌ Belum | Deploy Vercel + Neon | butuh kredensial & network |

**Progresi: 7/8 fase utama selesai (87,5%).** Satu fase tersisa: live deploy.

---

## Checklist detail

### Phase 0 — Foundation
- [x] Data audit OSM (AOI + skala kabupaten)
- [x] PostGIS + schema + seed
- [x] H3 grid res 9
- [x] Peta MapLibre + layer gerai/anchor
- [x] Copilot skeleton OpenCode Go
- [x] Build & Docker Compose

### Phase 1 — Weighted model + MVT
- [x] WorldPop 2020 constrained 100m per H3
- [x] Jalan arteri/kolektor OSM
- [x] Weighted-v1 (demand 45, kompetisi 25, akses 20, risiko 10)
- [x] MVT `ST_AsMVT` sebagai sumber heatmap
- [x] Panel detail populasi + jarak jalan
- [x] Seed final + verifikasi tile

### Phase 2 — Cannibalization
- [x] Simulasi per brand (Alfamart/Indomaret)
- [x] Gross vs net + daftar gerai terdampak
- [x] Distance decay kuadratik + radius 3 km
- [x] Catatan ordinal, bukan rupiah

### Phase 3 — ML evaluation
- [x] Dataset 69.928 sel + 681 label Overture
- [x] Leakage guard (gerai sel target dikecualikan)
- [x] PU-style sample weights
- [x] GroupKFold 5 blok spasial
- [x] Subang transfer test (91 positif)
- [x] Model report `/model`
- [x] Keputusan: ML tidak dipakai; weighted-v1 dipertahankan

### Phase 4 — Productization
- [x] Decision memo PDF (`/api/memo`) + halaman cetak (`/memo/[h3]`)
- [x] RAG dokumen BM25 + tool `search_docs` di copilot
- [x] API uji `/api/knowledge?q=...`
- [x] Health check `/api/health`
- [x] `vercel.json` + panduan `docs/03-deploy.md`
- [x] Verifikasi `npm run build`
- [ ] ❌ Live deploy Vercel + Neon (menunggu akses)
- [ ] ❌ Isi API key OpenCode Go di production

---

## Verifikasi cepat

```bash
npm run build
curl http://localhost:3000/api/health
curl -I http://localhost:3000/api/tiles/11/1636/1061
curl -I "http://localhost:3000/api/memo?h3=898c16aa36bffff&chain=Alfamart"
curl "http://localhost:3000/api/knowledge?q=batasan%20skor"
```

Halaman:

- `/` — peta + skor + simulasi + copilot
- `/model` — laporan LightGBM vs weighted-v1
- `/memo/<h3>?chain=Alfamart` — memo cetak
- `/api/memo?...` — PDF

---

## Open items

| Item | Status | Prioritas | Catatan |
|---|---|---|---|
| Live deploy Vercel + Neon | ❌ | Tinggi | Vercel CLI tidak bisa reach `api.vercel.com` dari environment ini |
| API key OpenCode Go di production | ❌ | Tinggi | Key lokal sudah terkonfigurasi (`/api/health` → `aiConfigured: true`); production belum |
| Kalibrasi BPS per kecamatan | ❌ | Sedang | Tidak mengubah ranking; hanya skala absolut |
| InaRISK + RDTR | ❌ | Sedang | Risiko masih placeholder 0 |
| 300+ label Subang | ❌ | Sedang | Agar ML layak diuji ulang |
| Building footprint / daya beli | ❌ | Rendah | Fitur tambahan untuk model |

---

## Dokumen terkait

- `docs/01-product-brief.md` — problem statement, persona, data, skor
- `docs/02-model-evaluation.md` — evaluasi LightGBM vs weighted-v1
- `docs/03-deploy.md` — panduan deploy Vercel + Neon
- `README.md` — quick start & arsitektur
- `/model` — model report interaktif
