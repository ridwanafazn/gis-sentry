# Progress & Phase Checklist

**Project:** GIS Sentry — Retail Site Intelligence (Subang)
**Status:** Phase 0–4 selesai dan **live di production**. UI refactor **R1–R10 dieksekusi**; dua item R10 menunggu upload aset dan commit.
**Live URL:** https://gis-sentry.vercel.app
**Model produksi:** weighted-v1.
**Terakhir diperbarui:** 21 November 2026

---

## Ringkasan angka

| Item | Nilai |
|---|---|
| Live URL | https://gis-sentry.vercel.app |
| Vercel | project `gis-sentry`, region `sin1` |
| Neon | `gis-sentry`, `aws-ap-southeast-1`, PostGIS 3.5 |
| DB production | 2.982 H3 · 24 stores · 57 anchors · 233 roads |
| Health | `ok:true`, `db:true`, `aiConfigured:true` |
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
| **4d · Live deploy** | ✅ Selesai | Deploy Vercel + Neon | https://gis-sentry.vercel.app · health `db:true` |
| **UI R1 · Design system** | ✅ Selesai | Token light-only, IBM Plex, Lucide, `DESIGN.md` | Build lolos; detector bersih kecuali `cream-palette` yang dijustifikasi |
| **UI R2 · Shell & responsif** | ✅ Selesai | Map-first ≤1120px, top bar, bottom sheet 3 tab, desktop rail | 360–1440 tanpa overflow; keyboard; kontrol peta tidak tertutup |
| **UI R3 · Komponen inti** | ✅ Selesai | 44px primitives, loading/error/retry, copilot collapse, `aria-pressed` | 0 console error; state QA; detector hanya `cream-palette` |
| **UI R4 · Map surface** | ✅ Selesai | Label di atas H3, selected cell, marker/legend, kontrol 44px, padding sheet | `h3BelowLabels:true`; selected filter; resize 390→360 |
| **UI R5 · Copilot & copy** | ✅ Selesai | Citation chips, stop, copy, markdown ringan, error/pending | 4 sitasi; tanpa `§` mentah; stop teruji |
| **UI R6 · Report & memo** | ✅ Selesai | Tabel stacked mobile, memo A4 1 halaman, actions 44px | `tableScroll=clientWidth`; `pdfPages=1` |
| **UI R7 · QA & polish** | ✅ Selesai | Lighthouse, a11y, keyboard, CLS, copy audit, favicon | Desktop 99/100/100/100; mobile 55/100/100/100; CLS 0.015 |
| **UI R8 · Ship** | ✅ **Live** | Deploy production, env basemap Positron, verifikasi UI/API | https://gis-sentry.vercel.app · health `db:true` · tile/memo/copilot 200 |

**Progresi: 8/8 fase utama selesai (100%).** Live di production. UI refactor: **R1–R8/8 selesai dan live.**

### Rekap UI refactor

| Tahap | Status | Ringkasan |
|---|---|---|
| **R0 · Audit & product truth** | ✅ | `PRODUCT.md`, baseline, rencana R0–R8 |
| **R1 · Design system** | ✅ | Token light-only, IBM Plex, Lucide, Positron, `DESIGN.md` |
| **R2 · Shell & responsif** | ✅ | Desktop rail; ≤1120px map-first + top bar + bottom sheet 3 tab |
| **R3 · Komponen inti** | ✅ | 44px primitives, loading/error/retry, focus/disabled, copilot collapse |
| **R4 · Map surface** | ✅ | Label di atas H3, selected cell, marker/legend, kontrol 44px, padding sheet, resize |
| **R5 · Copilot & copy** | ✅ | Citation chips, stop, markdown ringan, copy tanpa AI-slop |
| **R6 · Report & memo** | ✅ | Tabel stacked mobile, memo A4 1 halaman, actions 44px |
| **R7 · QA & polish** | ✅ | A11y 100, desktop perf 99, mobile perf 55 (map-engine exception), CLS 0.015, copy audit 0 `&`/`:` |
| **R8 · Ship** | ✅ | Deploy production + verifikasi UI/API; live di https://gis-sentry.vercel.app |

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
- [x] Live deploy Vercel + Neon
- [x] Isi API key OpenCode Go di production

### UI Refactor — R1 (lokal)
- [x] Arah visual paper/ink + forest dikunci di `PRODUCT.md`
- [x] `DESIGN.md` + `app/tokens.css` light-only
- [x] IBM Plex Sans/Mono self-host (Fontsource)
- [x] Lucide React menggantikan ikon teks/dot
- [x] Hapus kicker `.report-pill` / `.memo-kicker`
- [x] Basemap Positron + ramp H3 flat + legenda diskret
- [x] Kontras AA dan teks minimum 11–12px
- [x] `npm run build` lolos + screenshot 1440/390
- [x] Impeccable detector: 0 temuan selain `cream-palette` yang dijustifikasi

### UI Refactor — R2 (lokal)
- [x] Desktop ≥1121px: rail 390px + map
- [x] ≤1120px: map full viewport + top bar 56px + bottom sheet
- [x] Sheet tab `Kandidat · Detail · Tanya`
- [x] Snap peek 102px / half 46dvh / full 74dvh + safe-area
- [x] Grip keyboard (Enter/Space/ArrowUp/ArrowDown) + tabs Arrow/Home/End
- [x] Kandidat → Detail + half + scroll reset
- [x] Kontrol peta & atribusi tidak tertutup sheet
- [x] Legenda mobile ringkas; skala disembunyikan saat full
- [x] `prefers-reduced-motion`
- [x] QA 360/390/768/1024/1280/1440: tanpa horizontal scroll, 0 console error
- [x] Detector final: file scan 0; URL scan hanya `cream-palette`

### UI Refactor — R3 (lokal)
- [x] Target 44px: layer, chain, prompt, composer, memo, report nav, retry
- [x] Candidate row 56px; score bar, badge, tab, detail, memo actions
- [x] Body/control text ≥12px; micro 11px hanya count/unit/judul legenda mobile
- [x] Hover/focus/active/disabled + 2px focus ring
- [x] Loading/empty/error states + retry kandidat/simulasi
- [x] Copilot pending/error; desktop collapse default
- [x] `aria-pressed`, `role=status`, `role=alert`, `role=log`
- [x] Kandidat → detail scroll + fokus di desktop
- [x] QA error/loading via route interception; 0 console error
- [x] Detector final: file scan 0; URL scan hanya `cream-palette`

### UI Refactor — R4 (lokal)
- [x] H3/AOI/selected di bawah label Positron
- [x] Selected fill + outline; hover fill + cursor pointer
- [x] Marker store/anchor lebih terbaca
- [x] Legend marker key desktop; mobile compact
- [x] Kontrol MapLibre 44px; atribusi/skala 12px
- [x] Padding peta mengikuti sheet (peek/half/full)
- [x] Full sheet: zoom/skala hidden, atribusi tetap terlihat
- [x] `ResizeObserver` + `map.resize()`; canvas 390→360 terverifikasi
- [x] QA map: `h3BelowLabels`, selected filter, layer lengkap, 0 console error
- [x] Detector final: static 0; URL hanya `cream-palette`

### UI Refactor — R5 (lokal)
- [x] Citation chips dari `[path § heading]`, marker dibuang dari teks
- [x] Validasi path `README.md`, `docs/`, `data/knowledge/`
- [x] Copy awal, prompt, error, pending ditulis ulang
- [x] Markdown ringan: bold + bullet, tanpa asterisk mentah
- [x] Stop 44px meng-abort stream; state `Jawaban dihentikan.`
- [x] QA 4 sitasi, tanpa `§` mentah, 0 error

### UI Refactor — R6 (lokal)
- [x] Tabel `/model` stacked ≤760px, `data-label`, tanpa scroll horizontal
- [x] Desktop tabel tetap 4 kolom
- [x] Memo actions satu baris 44px di mobile
- [x] Memo print A4 10×12mm, spacing rapat, action hidden
- [x] PDF A4 **1 halaman** terverifikasi
- [x] QA 390 model/memo tanpa overflow, 0 error
- [x] Detector final: static 0; URL hanya `cream-palette`

### UI Refactor — R7 (lokal)
- [x] Lighthouse desktop 99 performance, 100 accessibility, 100 best practices, 100 SEO
- [x] Lighthouse mobile 100 accessibility, 100 best practices, 100 SEO
- [x] Mobile performance 55 documented as MapLibre main-thread exception
- [x] CLS 0.015; local LCP 656ms
- [x] Keyboard 14 tab stops, all visible, focus outline 2px
- [x] Heading structure, map region label, sheet label, live/error/status roles
- [x] Copy audit 0 `&`, 0 `:` across home, model, memo, copilot answer
- [x] Favicon added; console errors 0
- [x] Screenshot 360/390/768/1024/1440 + model/memo
- [x] Detector final: static 0; URL hanya `cream-palette`

### UI Refactor — R8 (production)
- [x] `npm run build` final lolos
- [x] `NEXT_PUBLIC_BASEMAP_STYLE` production diarahkan ke Positron
- [x] Deploy production + alias `https://gis-sentry.vercel.app`
- [x] Health production `db:true`, `aiConfigured:true`
- [x] Tile MVT 200, memo PDF 200, copilot 200
- [x] Mobile production: sheet, citations, copy audit, tanpa console error
- [x] Hydration mismatch tanggal diperbaiki (timezone Asia/Jakarta)
- [x] Favicon 200, UI light di desktop dan mobile
- [x] Bukti: `data/ui-r8/final/`

### R9 — About, memo PDF, final production
- [x] `/about`, `/about/api`, `/about/glossary` live
- [x] Marquee teknologi produksi, tanpa klaim LightGBM sebagai model produksi
- [x] Screenshot produk di landing page
- [x] PDF memo paper/ink/forest, IBM Plex tertanam, 1 halaman A4
- [x] Build lokal dan deploy production `dpl_3WYPjTWWyLYYcAF3u3AZcPdowUhR`
- [x] Health, copilot, tile, memo, dan lima halaman utama 200
- [x] Tidak ada `opencode`, `deepseek`, atau label model di HTML publik
- [x] Bukti: `data/ui-about/final/` dan `data/ui-about/verification.json`

### R10 — Portofolio v2, aset visual, skor desimal
- [x] Portofolio live memakai `portofx-v2` di branch `migrate/astro-ssr-neon`, Astro 7 SSR, Neon, dan Drizzle
- [x] Baris `portfolios` untuk `gis-sentry` diperbarui: stack benar, empat paragraf, tujuh highlight, empat link
- [x] Hono dan MySQL dihapus dari halaman portofolio
- [x] Banner 16:9 dan enam gambar galeri dibuat di `data/ui-portfolio/`
- [x] Skor shortlist dan detail memakai satu desimal
- [x] Memo memakai layout angka empat karakter, 99.4 menjadi 55.8 untuk Indomaret
- [x] Deploy production `dpl_7BuXAG1hdsmvbirZVr8WqdjcF5H3`
- [x] Health, halaman, tile, copilot, dan memo production diverifikasi
- [ ] Upload aset ke Cloudinary lewat admin, lalu set cover dan galeri
- [ ] Commit perubahan repo GIS dan dokumentasi

Catatan: UI baru sudah live. Screenshot R1–R8 ada di `data/ui-r1/final/`, `data/ui-r2/final/`, `data/ui-r3/final/`, `data/ui-r4/final/`, `data/ui-r5-r6/final/`, `data/ui-r7/final/`, dan `data/ui-r8/final/`. Bukti R9 dan R10 ada di `data/ui-about/` dan `data/ui-portfolio/`.

---

## Verifikasi cepat

```bash
npm run build
curl http://localhost:3000/api/health
curl -I http://localhost:3000/api/tiles/11/1636/1061
curl -I "http://localhost:3000/api/memo?h3=898c16aa36bffff&chain=Indomaret"
curl "http://localhost:3000/api/knowledge?q=batasan%20skor"
```

Aset portofolio ada di `data/ui-portfolio/`. Panduan upload ada di `data/ui-portfolio/README.md`.

Halaman:

- `/` — peta + skor + simulasi + copilot
- `/about` — landing produk, tautan API, glosarium, dan marquee teknologi
- `/about/api` — dokumentasi endpoint
- `/about/glossary` — istilah H3, anchor, LightGBM, RAG, dan metrik
- `/model` — laporan LightGBM vs weighted-v1
- `/memo/<h3>?chain=Alfamart` — memo cetak
- `/api/memo?...` — PDF

---

## Open items

| Item | Status | Prioritas | Catatan |
|---|---|---|---|
| Upload aset portofolio | ❌ | Tinggi | Banner dan galeri ada di `data/ui-portfolio/`, upload lewat admin Cloudinary |
| Commit perubahan | ❌ | Tinggi | Repo GIS dan dokumentasi belum di-commit |
| Analisis sensitivitas bobot | ❌ | Sedang | Menguji stabilitas ranking di beberapa profil bobot |
| Data provenance dan freshness | ❌ | Sedang | Bisa masuk `/about` dan memo |
| AOI atau kota kedua | ❌ | Sedang | Membuktikan pipeline tidak hardcoded ke Subang |
| Kalibrasi BPS per kecamatan | ❌ | Sedang | Tidak mengubah ranking; hanya skala absolut |
| InaRISK + RDTR | ❌ | Sedang | Endpoint InaRISK merespons 503 saat diuji 21 November 2026 |
| 300+ label Subang | ❌ | Sedang | Agar ML layak diuji ulang |
| Building footprint / daya beli | ❌ | Rendah | Fitur tambahan untuk model |


---

## Dokumen terkait

- `docs/01-product-brief.md` — problem statement, persona, data, skor
- `docs/02-model-evaluation.md` — evaluasi LightGBM vs weighted-v1
- `docs/03-deploy.md` — panduan deploy Vercel + Neon
- `docs/04-session-handoff.md` — ringkasan kondisi terakhir dan langkah berikutnya
- `docs/04-ui-refactor-plan.md` — rencana R0–R8 + hasil R1–R6
- `docs/05-readiness.md` — penilaian kesiapan portofolio GIS application developer
- `docs/portfolio-case-study.md` — copy dan catatan konten halaman portofolio v2
- `data/ui-portfolio/README.md` — daftar aset visual dan langkah upload
- `DESIGN.md` — token, tipografi, ikon, komponen, aturan anti-slop
- `README.md` — quick start & arsitektur
- `/model` — model report interaktif
