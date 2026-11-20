# Case Study Portofolio — GIS Sentry

**Status:** halaman https://ridwanafazn.my.id/projects/gis-sentry sudah diperbarui di Neon pada 20 November 2026 dan dirapikan pada 21 November 2026. Tujuh highlight sudah live. Aset visual sudah dibuat dan menunggu upload Cloudinary.

Halaman live memakai `portofx-v2` (branch `migrate/astro-ssr-neon`), Astro 7 SSR, Neon Postgres, dan Drizzle. Konten tidak lagi disimpan di Sanity.

---

## Sebelum dan sesudah

| Sebelum | Sesudah |
|---|---|
| Stack `Hono · Nextjs · MySQL` | Next.js 16, TypeScript, PostGIS, Neon, MapLibre GL, H3, Vercel AI SDK, BM25 RAG, pdf-lib, Zod, Vercel |
| Ringkasan satu paragraf | Empat paragraf dengan skala data, metode skor, evaluasi model, dan output |
| Tanpa link | Live demo, API docs, model report, repository |
| Tanpa highlight | Enam highlight berbasis bukti |
| Tanpa metrik | 2.982 sel H3, 24 minimarket, 57 anchor, 233 jalan, Precision@10 0,50 vs 0,10 |

---

## Copy yang sekarang live

### Deskripsi singkat

> Alat pendukung keputusan lokasi retail di Subang. Menghitung skor H3, simulasi kanibalisasi, memo PDF, dan copilot yang menyitir sumber.

### Deskripsi panjang

> GIS Sentry adalah sistem pendukung keputusan untuk ekspansi minimarket di Kabupaten Subang. Data OpenStreetMap, WorldPop 2020, dan Overture Places diolah menjadi grid H3 resolusi 9, lalu disimpan di PostGIS. Aplikasi menampilkan 2.982 sel H3, 24 minimarket, 57 anchor POI, dan 233 ruas jalan dalam radius 10 km.
>
> Skor weighted-v1 menggabungkan demand 45 persen, kompetisi 25 persen, akses 20 persen, dan risiko 10 persen. Skor adalah persentil relatif AOI, bukan probabilitas profit. Pengguna dapat memilih kandidat, melihat dekomposisi faktor, dan menjalankan simulasi kanibalisasi per jaringan dengan buffer radial 3 km.
>
> Model LightGBM diuji dengan spatial block cross-validation dan holdout Subang. Model menang di CV regional, tetapi kalah saat transfer ke Subang pada Precision@10 (0,10 vs 0,50) dan NDCG@50 (0,132 vs 0,273). Produksi tetap memakai weighted-v1 karena lebih stabil dan bisa dijelaskan.
>
> Output akhirnya adalah decision memo satu halaman A4 dengan font IBM Plex tertanam, rekomendasi, langkah berikutnya, dan batasan. Copilot menjawab lewat tool top_sites, site_detail, dan search_docs, lalu menampilkan sitasi dokumen.

### Tech stack

- Next.js 16
- TypeScript
- PostGIS
- Neon
- MapLibre GL
- H3
- Vercel AI SDK
- BM25 RAG
- pdf-lib
- Zod
- Vercel

### Highlights

- Pipeline spasial dari OSM dan WorldPop ke 2.982 sel H3 di PostGIS
- Tile MVT langsung dari PostGIS dengan ST_AsMVT, bukan GeoJSON statis
- Evaluasi LightGBM dengan spatial block CV dan holdout Subang, lalu ditolak karena gagal transfer
- Memo PDF satu halaman dengan IBM Plex tertanam dan palet paper, ink, forest
- Copilot dengan tool calling, BM25 RAG, dan citation chips
- Produksi di Vercel dengan health check, cache tile, dan UI responsif 390 sampai 1440 px
- Situs yang sama menjadi prioritas Alfamart 99.4 tetapi pertimbangkan Indomaret 55.8 setelah kanibalisasi 44 persen

### Link

| Label | URL | Icon |
|---|---|---|
| Live Demo | https://gis-sentry.vercel.app | `open_in_new` |
| API Docs | https://gis-sentry.vercel.app/about/api | `description` |
| Model Report | https://gis-sentry.vercel.app/model | `analytics` |
| Repository | https://github.com/ridwanafazn/gis-sentry | `code` |

---

## Sumber data di v2

Konten tersimpan di tabel `portfolios` pada Neon project `portofx-v2`.

| Kolom | Nilai |
|---|---|
| `slug` | `gis-sentry` |
| `description` | Ringkasan singkat di atas |
| `long_description` | Empat paragraf di atas |
| `tech_stack` | Array 11 item |
| `highlights` | Array 7 item |
| `links` | JSONB 4 link |
| `status` | `published` |
| `is_top_project` | `false` |
| `order` | `0` |
| `seo` | Title dan description halaman |

Verifikasi:

```sql
select slug, title, tech_stack, highlights, links, status, is_top_project
from portfolios
where slug = 'gis-sentry';
```

---

## Aset visual

Banner dan enam gambar galeri sudah dibuat dari production. Detail caption, alt text, dan langkah upload ada di `data/ui-portfolio/README.md`.

| File | Peran |
|---|---|
| `banner-1600x900.png` | Cover 16:9 dan thumbnail daftar proyek |
| `gallery-01-map-1600x1000.png` | Peta AOI dan shortlist |
| `gallery-02-simulation-1600x1000.png` | Simulasi Indomaret, 99.4 menjadi 55.8 |
| `gallery-03-copilot-1600x1000.png` | Copilot dengan tiga sumber |
| `gallery-04-memo-1600x1000.png` | Decision memo A4 |
| `gallery-05-model-1600x1000.png` | Holdout Subang dan feature importance |
| `gallery-06-architecture-1600x1000.png` | Diagram alur data |

Upload lewat **Admin > Assets**, lalu set cover dan galeri di **Portfolio > GIS Sentry**. Jangan mengedit lewat Sanity.

---

## Yang masih kurang

1. **Cover dan galeri.** Halaman belum punya gambar karena `cover_image_id` dan `gallery` membutuhkan asset Cloudinary. Aset visual sudah disiapkan di `data/ui-portfolio/` dan tinggal diupload lewat admin panel.
2. **Metrik dan arsitektur.** Template `[id].astro` hanya merender paragraf, highlights, dan link. Untuk tabel metrik atau diagram arsitektur, perlu field baru dan komponen baru.
3. **Kurasi proyek unggulan.** GIS Sentry sengaja tidak dijadikan `is_top_project` agar grid featured tetap tiga kartu. Kalau ingin tampil di home, ganti salah satu proyek unggulan atau ubah grid menjadi empat kartu.

---

## Catatan repo

- `main` di repo `portofx` masih versi statis Sanity.
- Versi live memakai branch `migrate/astro-ssr-neon`.
- Jangan mengedit konten lewat Sanity untuk proyek ini. Perubahan tidak akan muncul di situs live.
