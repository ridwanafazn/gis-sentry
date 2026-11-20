# Aset visual GIS Sentry

Semua gambar diambil dari production https://gis-sentry.vercel.app pada 21 November 2026, dengan viewport 1600x1000, device scale 2, light mode, dan basemap Positron.

## Banner utama

**File:** `banner-1600x900.png`
**Rasio:** 16:9, 1600x900
**Pakai untuk:** cover project dan thumbnail daftar proyek.

**Alt text:**
> Peta H3 Subang dengan kartu skor 99.4, label prioritas Alfamart, dan net Indomaret 55.8.

**Catatan:** banner dibuat map-dominant supaya tetap terbaca saat menjadi thumbnail kecil. Kartu kiri menampilkan skor, tiga faktor, dan perbandingan net Alfamart versus Indomaret.

## Galeri

Urutan ini mengikuti alur keputusan, bukan urutan file.

### 1. Peta dan shortlist
**File:** `gallery-01-map-1600x1000.png`
**Caption:** Peta AOI 10 km Subang dengan 2.982 sel H3 dan shortlist delapan kandidat.
**Alt:** Peta skor H3 Subang, panel layer, dan daftar kandidat dengan skor 99.4 sampai 98.7.

### 2. Simulasi kanibalisasi
**File:** `gallery-02-simulation-1600x1000.png`
**Caption:** Simulasi Indomaret, gross 99.4 menjadi net 55.8 atau 44 persen terkikis.
**Alt:** Panel detail kandidat dengan simulasi kanibalisasi Indomaret dan satu gerai tumpang tindih.

### 3. Copilot dengan sitasi
**File:** `gallery-03-copilot-1600x1000.png`
**Caption:** Copilot menjawab batas skor dengan tiga sumber dokumen.
**Alt:** Panel copilot yang menjawab pertanyaan batas skor dan menampilkan chip sumber.

### 4. Decision memo
**File:** `gallery-04-memo-1600x1000.png`
**Caption:** Decision memo satu halaman A4 dengan rekomendasi dan langkah berikutnya.
**Alt:** Halaman memo A4 dengan skor 99.4, simulasi Indomaret net 55.8, dan rekomendasi pertimbangkan.

### 5. Model report
**File:** `gallery-05-model-1600x1000.png`
**Caption:** Holdout Subang, Precision@10 0.50 versus 0.10, LightGBM ditolak.
**Alt:** Tabel holdout Subang yang membandingkan LightGBM dan weighted-v1, plus feature importance.

### 6. Arsitektur
**File:** `gallery-06-architecture-1600x1000.png`
**Caption:** Alur data dari OSM, WorldPop, dan Overture ke PostGIS, peta, memo, dan copilot.
**Alt:** Diagram empat lapisan GIS Sentry dari sumber data sampai keputusan.

## Cara upload ke portofolio v2

1. Login ke https://ridwanafazn.my.id/admin.
2. Buka **Assets**, upload `banner-1600x900.png` dan enam file galeri.
3. Buka **Portfolio**, pilih proyek **GIS Sentry**.
4. Set cover ke `banner-1600x900.png`.
5. Tambahkan enam gambar galeri sesuai urutan di atas, lalu isi caption.
6. Simpan dan publish.

Gambar asli berukuran 1600 px dan sekitar 1 MB per file. Cloudinary akan mengoptimalkan format dan ukuran saat disajikan.

## Catatan

- Screenshot memakai skor desimal setelah perbaikan UI, jadi shortlist menampilkan 99.4, 99.0, 98.9, dan seterusnya.
- Simulasi memakai Indomaret karena kandidat teratas punya kanibalisasi 44 persen. Alfamart tetap 99.4 karena tidak ada gerai Alfamart dalam radius 3 km.
- Refresh aset ini kalau UI, data, atau komposisi skor berubah.
- File mentah ada di `data/ui-portfolio/raw/` dan tidak perlu diupload.
