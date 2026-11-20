# Session Handoff — GIS Sentry

**Tanggal:** 21 November 2026
**Live:** https://gis-sentry.vercel.app
**Repo:** https://github.com/ridwanafazn/gis-sentry
**Deployment terakhir:** `dpl_7BuXAG1hdsmvbirZVr8WqdjcF5H3`
**Status:** Phase 0–4 dan R1–R10 dieksekusi. Production live. Dua item R10 menunggu upload aset ke Cloudinary dan commit.

---

## Satu baris

GIS Sentry adalah WebGIS retail site intelligence untuk Subang: skor lokasi H3 **weighted-v1**, simulasi kanibalisasi per brand, decision memo PDF, RAG dokumen, dan copilot bersitasi.

---

## Yang berubah di sesi terakhir

### Produk

- `/about`, `/about/api`, dan `/about/glossary` live.
- Marquee teknologi memakai stack yang benar-benar dipakai. LightGBM tidak diklaim sebagai model produksi.
- PDF memo memakai palet paper, ink, forest, font IBM Plex tertanam, dan satu halaman A4.
- Skor di shortlist dan detail sekarang satu desimal, sehingga delapan kandidat tidak lagi tampil sebagai 99 semua.
- Memo memakai angka empat karakter dengan layout yang sudah diperbaiki.
- Tile MVT memakai cache edge lebih panjang.

### Portofolio v2

- Situs live memakai branch `migrate/astro-ssr-neon`, Astro 7 SSR, Neon Postgres, dan Drizzle.
- Konten proyek ada di tabel `portfolios`, bukan Sanity.
- Baris `gis-sentry` sudah diperbarui:
  - Stack benar: Next.js 16, TypeScript, PostGIS, Neon, MapLibre GL, H3, Vercel AI SDK, BM25 RAG, pdf-lib, Zod, Vercel.
  - Empat paragraf ringkasan.
  - Tujuh highlight, termasuk perbedaan Alfamart dan Indomaret.
  - Empat link: Live Demo, API Docs, Model Report, Repository.
  - Tidak ada lagi Hono atau MySQL.
- Halaman live: https://ridwanafazn.my.id/projects/gis-sentry

### Aset visual

Semua ada di `data/ui-portfolio/`.

- `banner-1600x900.png` untuk cover.
- `gallery-01-map-1600x1000.png`
- `gallery-02-simulation-1600x1000.png`
- `gallery-03-copilot-1600x1000.png`
- `gallery-04-memo-1600x1000.png`
- `gallery-05-model-1600x1000.png`
- `gallery-06-architecture-1600x1000.png`
- `README.md` berisi caption, alt text, dan langkah upload.

Banner memakai komposisi map-dominant supaya tetap terbaca sebagai thumbnail kecil. Simulasi memakai Indomaret karena kandidat teratas punya kanibalisasi 44 persen.

---

## Status production

| Item | Nilai |
|---|---|
| Health | `200`, `db:true`, `aiConfigured:true` |
| Halaman | `/`, `/about`, `/about/api`, `/about/glossary`, `/model` = `200` |
| Tile MVT | `200`, tile kosong `204`, edge cache `HIT` |
| Copilot | `200`, streaming dengan citation chips |
| Memo | `200`, satu halaman, 99.4 menjadi 55.8 untuk Indomaret |
| DB | 2.982 H3, 24 minimarket, 57 anchor, 233 jalan |
| Basemap | CARTO Positron |

Bukti: `data/ui-about/verification.json`, `data/ui-about/final/`, dan `data/ui-portfolio/`.

---

## Keputusan penting

- **Produksi memakai weighted-v1, bukan ML.**
  - Regional CV: ML menang, Precision@10 0,180 versus 0,120.
  - Holdout Subang: baseline menang, Precision@10 0,500 versus 0,100.
  - Hanya 91 sel positif Subang, jadi ML belum layak dipakai.
- Skor adalah persentil relatif AOI, bukan probabilitas profit.
- Kanibalisasi bersifat ordinal, bukan rupiah.
- Sumber label ML adalah Overture Places. Peta display memakai OSM.
- Copilot tetap memakai OpenCode Go, tetapi provider tidak ditampilkan di UI.
- **Portofolio v2 memakai Neon, bukan Sanity.** Branch `main` di repo `portofx` masih versi statis Sanity dan tidak dipakai situs live.
- Kandidat teratas `898c16aa36bffff` adalah prioritas Alfamart 99.4, tetapi menjadi pertimbangkan Indomaret 55.8 setelah kanibalisasi 44 persen. Ini adalah demo story terkuat.

---

## Yang belum

| Item | Status | Catatan |
|---|---|---|
| Upload aset ke Cloudinary | Belum | Upload lewat `/admin`, lalu set cover dan galeri. Panduan di `data/ui-portfolio/README.md`. |
| Commit perubahan | Belum | Repo GIS masih punya perubahan belum di-commit. Perubahan konten portofolio ada di Neon, bukan di Git. |
| Analisis sensitivitas bobot | Belum | Kandidat berikutnya untuk membuat rekomendasi lebih kuat. |
| Data provenance dan freshness | Belum | Bisa ditambahkan ke `/about` dan memo. |
| AOI atau kota kedua | Belum | Bukti generalisasi pipeline. |
| InaRISK | Diblokir | Endpoint flood hazard BNPB merespons `503 Wait timeout` saat diuji 21 November 2026. |
| Kalibrasi BPS | Belum | Populasi masih WorldPop 2020. |
| Auth dan rate limit | Belum | API demo masih terbuka. |
| Test dan CI | Belum | Baru build dan verifikasi manual. |

---

## Entry points

| Path | Fungsi |
|---|---|
| `/` | Peta, skor, simulasi, copilot |
| `/about` | Landing produk, API, glosarium, marquee |
| `/about/api` | Dokumentasi endpoint |
| `/about/glossary` | Istilah H3, anchor, LightGBM, RAG |
| `/model` | LightGBM versus weighted-v1 |
| `/memo/[h3]?chain=Indomaret` | Memo web A4 |
| `/api/memo?...` | PDF |
| `/api/tiles/[z]/[x]/[y]` | MVT |
| `/api/simulate` | Kanibalisasi |
| `/api/knowledge?q=...` | RAG search |
| `/api/copilot` | Copilot tool calling |
| `/api/health` | Health check |

---

## Verifikasi cepat

```bash
npm run build
curl https://gis-sentry.vercel.app/api/health
curl -I https://gis-sentry.vercel.app/api/tiles/11/1636/1061
curl -I "https://gis-sentry.vercel.app/api/memo?h3=898c16aa36bffff&chain=Indomaret"
curl "https://gis-sentry.vercel.app/api/knowledge?q=kanibalisasi"
```

Halaman:

- https://gis-sentry.vercel.app/
- https://gis-sentry.vercel.app/about
- https://gis-sentry.vercel.app/model
- https://gis-sentry.vercel.app/memo/898c16aa36bffff?chain=Indomaret
- https://ridwanafazn.my.id/projects/gis-sentry

---

## Langkah terakhir portofolio

1. Login ke https://ridwanafazn.my.id/admin.
2. Buka **Assets**, upload tujuh file dari `data/ui-portfolio/`.
3. Buka **Portfolio**, pilih **GIS Sentry**.
4. Set cover ke `banner-1600x900.png`.
5. Tambahkan enam gambar galeri sesuai urutan di `data/ui-portfolio/README.md`.
6. Isi caption dan alt text, lalu publish.

Kalau tidak ada akses admin, minta pemilik memberikan akses atau upload manual. Jangan mengedit Sanity karena situs live memakai Neon.

---

## Dokumen

- `docs/00-progress.md` — checklist semua fase.
- `docs/01-product-brief.md` — problem statement, persona, data, skor.
- `docs/02-model-evaluation.md` — evaluasi ML.
- `docs/03-deploy.md` — panduan deploy.
- `docs/04-session-handoff.md` — ringkasan ini.
- `docs/05-readiness.md` — penilaian kesiapan portofolio.
- `docs/portfolio-case-study.md` — konten dan catatan portofolio v2.
- `data/ui-portfolio/README.md` — aset visual dan langkah upload.
- `README.md` — quick start dan arsitektur.
