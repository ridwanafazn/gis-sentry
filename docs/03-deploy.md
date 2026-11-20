# Deploy Vercel + Neon

**Status:** persiapan selesai di lokal. **Live deploy belum dieksekusi** karena `api.vercel.com` tidak bisa diakses dari environment ini (network timeout). Panduan di bawah siap dijalankan dari mesin dengan akses Vercel/Neon.

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
| `NEXT_PUBLIC_BASEMAP_STYLE` | `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` |

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
- [ ] `/memo/<h3>` dan `/model` terbuka
- [ ] Copilot menjawab (key valid)
- [ ] Atribusi OSM/Overture/CARTO tampil
