# Deploy Vercel + Neon

**Status:** ✅ **Live** di https://gis-sentry.vercel.app dengan UI R10 (light, map-first, copilot citations, about pages, memo PDF, skor desimal).

Panduan ini tetap dipakai untuk reproduksi, redeploy, atau memindahkan project ke akun lain.

Arsitektur produksi:

```
Browser
  └─ Vercel (Next.js, region sin1)
       ├─ /api/tiles  → Neon PostGIS (ST_AsMVT)
       ├─ /api/simulate
       ├─ /api/copilot → OpenCode Go
       └─ /memo, /model
Neon PostGIS (Singapore / aws-ap-southeast-1)
```

---

## Status aktual production

| Item | Nilai |
|---|---|
| Production URL | https://gis-sentry.vercel.app |
| Vercel project | `gis-sentry` · region `sin1` |
| Deployment ID | `dpl_7BuXAG1hdsmvbirZVr8WqdjcF5H3` |
| Neon project | `gis-sentry` · `aws-ap-southeast-1` · PostGIS 3.5 |
| Neon database | `gissentry` |
| DB production | 2.982 H3 · 24 stores · 57 anchors · 233 roads |
| Env | `DATABASE_URL`, `OPENCODE_GO_API_KEY`, base URL, model, basemap |
| Health | `ok:true`, `db:true`, `aiConfigured:true` |
| MVT tile | `200 application/vnd.mapbox-vector-tile`, cache HIT |
| Memo PDF | `200 application/pdf`, 1 halaman, IBM Plex tertanam, 99.4 menjadi 55.8 |
| About pages | `/about`, `/about/api`, `/about/glossary` = `200` |
| Aset portofolio | Banner dan enam galeri di `data/ui-portfolio/`, upload lewat admin Cloudinary |
| Model report | `200` |
| Deployment protection | SSO disabled → publik |
| UI | Light paper/ink, Positron, 44px controls, mobile bottom sheet, skor desimal |
| Terakhir deploy | 21 November 2026 |

**Verifikasi production:**

```bash
curl https://gis-sentry.vercel.app/api/health
curl -I https://gis-sentry.vercel.app/api/tiles/11/1636/1061
curl -I "https://gis-sentry.vercel.app/api/memo?h3=898c16aa36bffff&chain=Indomaret"
curl https://gis-sentry.vercel.app/api/knowledge?q=batasan%20skor
```

Copilot production sudah diuji: menjawab "Apa batasan skor ini?" dengan sitasi RAG, citation chips, dan tanpa ampersand/titik dua gaya copy. UI production juga diuji di 390px dan 1440px; tidak ada console error.

Catatan R8: env `NEXT_PUBLIC_BASEMAP_STYLE` production sempat tertinggal di dark-matter. Nilainya sudah diganti ke Positron dan production diredeploy. Hydration mismatch tanggal juga diperbaiki dengan `timeZone: "Asia/Jakarta"`.

Catatan R9: halaman `/about`, `/about/api`, dan `/about/glossary` ditambahkan, PDF memo memakai IBM Plex dan palet paper/ink/forest, serta tile MVT diberi cache edge lebih panjang. Copilot tetap memakai backend OpenCode Go, tetapi provider tidak ditampilkan di UI.

Catatan R10: skor shortlist dan detail memakai satu desimal, memo memakai layout untuk angka empat karakter, dan halaman portofolio v2 diperbarui. Kandidat teratas sekarang terbaca sebagai prioritas Alfamart 99.4 tetapi pertimbangkan Indomaret 55.8 setelah kanibalisasi 44 persen. Aset visual portofolio ada di `data/ui-portfolio/` dan belum diupload ke Cloudinary.

### Portofolio v2

Situs https://ridwanafazn.my.id memakai repo `portofx` branch `migrate/astro-ssr-neon`, Astro 7 SSR, Neon Postgres, dan Drizzle. Konten proyek ada di tabel `portfolios`, bukan Sanity. Branch `main` masih versi statis Sanity dan tidak dipakai situs live.

Langkah update:

1. Login ke `/admin`.
2. Upload aset dari `data/ui-portfolio/` lewat menu **Assets**.
3. Buka **Portfolio**, pilih **GIS Sentry**.
4. Set cover ke `banner-1600x900.png`, tambahkan enam gambar galeri, isi caption.
5. Publish.

Panduan aset: `data/ui-portfolio/README.md`. Catatan konten: `docs/portfolio-case-study.md`.

> Catatan tooling: Neon diprovision lewat **Neon MCP**; deploy Vercel dieksekusi lewat **Vercel CLI** karena token MCP Vercel belum authorized ke team scope. Hasil akhirnya production live.

---

## 1. Neon PostGIS

1. Buat project di [Neon](https://console.neon.tech), pilih region **Singapore (aws-ap-southeast-1)**.
2. Aktifkan PostGIS:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

3. Copy **pooled connection string** (biasanya mengandung `-pooler` dan `sslmode=require`).
4. Terapkan schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Atau tempel isi `db/schema.sql` di SQL editor Neon.

5. Seed data dari laptop (butuh `DATABASE_URL`):

```powershell
$env:DATABASE_URL="postgresql://...-pooler.../gissentry?sslmode=require"
npm run db:seed
```

6. Verifikasi:

```sql
SELECT count(*) FROM h3_cells;
SELECT count(*) FROM stores;
SELECT count(*) FROM roads;
```

Target: 2.982 sel H3, 24 stores, 233 roads.

> Neon Free cukup untuk dataset ini (<100 MB). Scale-to-zero membuat query pertama agak lambat; connection pooler mengurangi cold start.

---

## 2. Vercel

1. Install CLI dan login:

```bash
npm i -g vercel
vercel login
```

2. Link project dari root repo:

```bash
vercel link
```

3. Set environment variables (Production + Preview):

| Variable | Nilai |
|---|---|
| `DATABASE_URL` | connection string Neon (pooled) |
| `OPENCODE_GO_API_KEY` | key OpenCode Go |
| `OPENCODE_GO_BASE_URL` | `https://opencode.ai/inference/go/v1` |
| `OPENCODE_GO_MODEL` | `deepseek-v4.1-flash` |
| `NEXT_PUBLIC_BASEMAP_STYLE` | `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` |

```bash
vercel env add DATABASE_URL production
vercel env add OPENCODE_GO_API_KEY production
vercel env add OPENCODE_GO_BASE_URL production
vercel env add OPENCODE_GO_MODEL production
vercel env add NEXT_PUBLIC_BASEMAP_STYLE production
```

4. Deploy:

```bash
vercel --prod
```

Project menggunakan `vercel.json` dengan `framework: nextjs` dan region `sin1` (Singapore) untuk latensi Indonesia.

5. Verifikasi:

```bash
curl https://<domain>/api/health
curl -I https://<domain>/api/tiles/11/1636/1061
curl -I "https://<domain>/api/memo?h3=898c16aa36bffff&chain=Alfamart"
```

Health harus `200` dengan `"db": true`. Tile harus `200` dengan `content-type: application/vnd.mapbox-vector-tile`.

---

## 3. Catatan free tier

- **Vercel Hobby**: boleh untuk portfolio/non-komersial. Untuk produk komersial, gunakan Pro.
- **Neon Free**: batas storage/compute bisa berubah; cek console. Dataset ini kecil.
- **OpenCode Go**: key dipakai untuk copilot; jangan commit key. Kalau kuota habis, copilot mengembalikan error yang jelas.
- **Basemap**: CARTO/OpenStreetMap attribution wajib tampil.

---

## 4. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `/api/health` 503 | `DATABASE_URL` salah / Neon belum siap | Cek connection string & schema |
| Tile 500 | `h3_cells` belum ada / PostGIS belum aktif | Jalankan `db/schema.sql` + seed |
| Copilot 503 | `OPENCODE_GO_API_KEY` kosong | Set env di Vercel, redeploy |
| Map kosong | MVT tidak termuat / DB mati | Cek `/api/health` dan tile di Network tab |
| Vercel login/protection | Deployment protection aktif | Gunakan `vercel curl` atau disable protection untuk test |
| `api.vercel.com` timeout | Network environment | Jalankan deploy dari mesin dengan akses Vercel |

---

## 5. Checklist deploy

- [ ] Neon project + PostGIS
- [ ] `db/schema.sql` diterapkan
- [ ] `npm run db:seed` sukses (2.982 H3, 233 roads)
- [ ] Env Vercel lengkap
- [ ] `vercel --prod` sukses
- [ ] `/api/health` 200 & `db:true`
- [ ] MVT tile 200
- [ ] `/about`, `/about/api`, `/about/glossary` 200
- [ ] `/memo/<h3>` dan `/model` terbuka
- [ ] Memo PDF 1 halaman, skor 99.4 dan net 55.8 untuk Indomaret
- [ ] Copilot menjawab (key valid)
- [ ] Atribusi OSM/Overture/CARTO tampil
- [ ] Konten portofolio v2 sudah benar dan aset visual diupload
