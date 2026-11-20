# Kesiapan Portofolio — GIS Application Developer

**Status:** live di https://gis-sentry.vercel.app dan halaman portofolio v2 sudah diperbarui
**Deployment:** `dpl_7BuXAG1hdsmvbirZVr8WqdjcF5H3`
**Dibuat:** 20 November 2026
**Diperbarui:** 21 November 2026

---

## 1. Putusan singkat

Proyek ini **cukup kuat sebagai senjata utama** untuk melamar posisi *GIS application developer*, *geospatial product engineer*, atau *full-stack developer with GIS* di level junior sampai menengah.

Yang membuatnya menonjol bukan jumlah fitur, tetapi bukti bahwa kamu bisa menutup rantai kerja dari data spasial mentah sampai keputusan yang bisa dibaca orang non-teknis. Itu jarang ada di portofolio GIS yang biasanya berhenti di peta atau notebook.

Belum cukup untuk diposisikan sebagai *senior geospatial platform engineer* atau *data scientist*, karena data masih satu kota, belum ada auth dan operasi produksi, dan belum ada automated test suite.

---

## 2. Bukti yang sudah ada

| Kemampuan | Bukti konkret |
|---|---|
| Data engineering spasial | OSM, WorldPop 2020, Overture Places, 2.982 sel H3 res 9, 24 minimarket, 57 anchor, 233 jalan |
| Backend spasial | PostGIS `ST_AsMVT`, `ST_TileEnvelope`, `ST_Transform`, `ST_DWithin`, geography distance |
| Tile serving | MVT dari PostGIS, layer H3, cache edge, 200 untuk tile berisi dan 204 untuk tile kosong |
| Evaluasi model | 69.928 sel regional, 681 positif, spatial block CV 5 fold, leakage guard, holdout 20.657 sel Subang |
| Keputusan model | LightGBM menang di CV regional tetapi kalah di Subang, Precision@10 0,10 vs 0,50; produksi tetap weighted-v1 |
| Produk | Peta, shortlist 8 kandidat, simulasi kanibalisasi, memo, copilot dengan sitasi, API docs, glosarium |
| Portofolio | Halaman v2 memakai stack yang benar, tujuh highlight, empat link, dan metrik holdout |
| Aset visual | Banner 16:9 dan enam gambar galeri di `data/ui-portfolio/`, siap upload |
| Dokumen | PDF A4 satu halaman, IBM Plex tertanam, dekomposisi skor, langkah berikutnya, batasan |
| AI | Copilot streaming dengan tool `top_sites`, `site_detail`, `search_docs`, BM25 RAG, citation chips |
| QA | Build lolos, health `db:true` dan `aiConfigured:true`, Lighthouse desktop 99, CLS 0,015, keyboard dan copy audit |
| Delivery | Vercel region `sin1`, Neon PostGIS Singapore, alias produksi, health check, verifikasi endpoint |

---

## 3. Kenapa ini kuat

### 3.1 Rantai kerja utuh, bukan demo peta

Banyak portofolio GIS berhenti di “saya menampilkan layer”. Proyek ini menunjukkan rantai lengkap:

> data mentah → grid H3 → skor → tile MVT → peta → shortlist → simulasi → memo → copilot → API.

Artinya kamu bisa bekerja di beberapa lapisan sekaligus, bukan hanya memakai QGIS atau ArcGIS.

### 3.2 Kejelasan spasial yang bisa dipertahankan

Kamu memakai H3, bukan grid kotak, dan bisa menjelaskan alasannya. Kamu memakai `ST_AsMVT` dan `ST_TileEnvelope`, bukan mengirim GeoJSON besar. Kamu menghitung jarak dengan geography, bukan derajat. Detail seperti ini yang membedakan “tahu peta” dari “tahu sistem spasial”.

### 3.3 Disiplin model yang jarang

Ini bagian terkuat untuk wawancara. Kamu tidak memaksa LightGBM masuk produksi karena terlihat keren. Kamu menguji transfer ke Subang, menemukan Precision@10 jatuh dari 0,50 ke 0,10, lalu mempertahankan baseline yang lebih stabil dan bisa dijelaskan.

Sikap itu menunjukkan bahwa kamu bisa menolak hasil yang menyesatkan. Banyak kandidat justru terjebak memamerkan model yang tidak generalisasi.

### 3.4 Produk yang bisa dipakai orang non-GIS

Memo satu halaman, rekomendasi, langkah berikutnya, dan batasan membuat proyek ini terasa seperti alat kerja, bukan tugas kuliah. Halaman `/about`, `/about/api`, dan `/about/glossary` menunjukkan kamu bisa menulis untuk dua audiens sekaligus: manajer ekspansi dan engineer.

### 3.5 Rasa produksi

Health check, cache tile, error 204, deployment protection, dan verifikasi setelah deploy menunjukkan kamu tidak berhenti di `npm run dev`. Ini nilai tambah untuk peran yang menuntut aplikasi benar-benar bisa dibuka.

---

## 4. Yang masih menahan

| Keterbatasan | Dampak | Prioritas |
|---|---|---|
| Hanya satu kota dan AOI 10 km | Belum membuktikan generalisasi ke kota lain | Tinggi |
| Risiko banjir dan zonasi masih placeholder 0 | Keputusan belum bisa dipakai untuk akuisisi nyata | Tinggi |
| Populasi WorldPop 2020 belum dikalibrasi BPS | Skala absolut lemah, ranking masih relatif | Sedang |
| Kanibalisasi memakai buffer radial, belum isochrone | Overlap bisa salah di kota dengan hambatan geografis | Sedang |
| Tidak ada auth, rate limit, atau kuota | API demo terbuka untuk disalahgunakan | Sedang |
| Belum ada automated test dan CI | Regresi hanya tertangkap lewat build manual | Tinggi |
| Mobile Lighthouse 55 untuk performa | MapLibre berat di ponsel kelas bawah | Sedang |
| Satu provider LLM tanpa fallback | Copilot 503 kalau kuota atau key habis | Rendah |
| Screenshot produk di `/about` statis | Bisa basi saat UI berubah | Rendah |
| Aset visual belum diupload ke Cloudinary | Halaman portofolio masih tanpa cover dan galeri | Sedang |
| Perubahan belum di-commit | Riwayat kerja tidak terlihat di GitHub | Tinggi |

Catatan penting: keterbatasan ini **bukan cacat tersembunyi**. Halaman `/about` dan memo sudah menyebutkan sebagian besarnya. Itu justru meningkatkan kredibilitas.

---

## 5. Cara mempresentasikan di wawancara

Gunakan urutan ini, maksimal tiga menit:

1. **Mulai dari keputusan, bukan stack.** “Saya membuat alat untuk memilih lokasi minimarket di Subang. Outputnya shortlist dan memo, bukan sekadar peta.”
2. **Klik kandidat teratas.** Tunjukkan skor 99 dan dekomposisi demand, kompetisi, akses, risiko. Jelaskan bahwa skor adalah persentil AOI, bukan probabilitas profit.
3. **Ubah jaringan ke Indomaret.** Tunjukkan gross vs net dan gerai yang tumpang tindih. Jelaskan buffer radial dan batasnya.
4. **Buka PDF.** Tunjukkan satu halaman, font tertanam, dan bagian “Langkah berikutnya”.
5. **Tanya copilot.** Minta satu rekomendasi, lalu tunjukkan citation chips. Jelaskan bahwa jawaban dibatasi tool dan dokumen.
6. **Tutup dengan model report.** Ceritakan LightGBM kalah transfer ke Subang dan kenapa weighted-v1 dipertahankan.
7. **Sebutkan batasan sebelum ditanya.** Ini memberi kesan engineer yang jujur, bukan sales.

Kalimat pembuka yang disarankan:

> “Ini sistem pendukung keputusan lokasi, bukan prediksi profit. Saya bisa menunjukkan data, skor, simulasi, memo, dan batasannya dalam satu alur.”

---

## 6. Prioritas penguatan berikutnya

Sebelum publikasi, upload aset dari `data/ui-portfolio/` lewat admin Cloudinary, lalu set cover dan galeri di halaman proyek. Setelah itu:

1. **Commit dan rapikan riwayat Git.** Portofolio dinilai dari commit, bukan hanya folder lokal.
2. **Tambah satu AOI atau kota kedua.** Cukup satu kota lagi untuk membuktikan pipeline tidak hardcoded ke Subang.
3. **Hubungkan InaRISK dan RDTR.** Ini akan mengubah skor risiko dari placeholder menjadi fitur nyata.
4. **Kalibrasi BPS per kecamatan.** Menjadikan populasi bisa dipertanggungjawabkan.
5. **Ganti buffer radial dengan isochrone.** Pakai pgRouting atau OSRM untuk waktu tempuh.
6. **Tambahkan auth, rate limit, dan kuota.** Lindungi endpoint publik dan tunjukkan pemahaman operasi.
7. **Tambahkan test dan CI.** Unit test untuk skor dan validasi, integration test untuk tile dan memo, satu smoke test Playwright.
8. **Pasang observability.** Catat latency tile, error rate, dan biaya query Neon.
9. **Turunkan biaya mobile.** Pertimbangkan tile simplification atau layer default yang lebih ringan di ponsel.

---

## 7. Scorecard

| Kriteria | Skor | Alasan |
|---|---:|---|
| Spatial data engineering | 5/5 | OSM, WorldPop, H3, PostGIS, pipeline nyata |
| Geospatial backend | 5/5 | MVT, tile envelope, geography distance, cache |
| Model evaluation | 4,5/5 | Spatial CV, leakage guard, holdout, keputusan berani |
| Product and UX | 4,5/5 | Peta, shortlist, memo, copilot, about, glosarium |
| AI integration | 4/5 | Tool calling, RAG, sitasi, streaming, batas jelas |
| Production operations | 3/5 | Live dan sehat, tetapi belum ada auth, test, monitoring |
| Testing and CI | 1,5/5 | Hanya build dan verifikasi manual |
| Data breadth | 3/5 | Satu kota, satu AOI, risiko masih placeholder |

**Rata-rata:** sekitar **4,1 dari 5** untuk level junior sampai menengah.

---

## 8. Putusan akhir

Pakai proyek ini sebagai **karya utama**, bukan pelengkap CV. Yang dijual bukan daftar teknologi, tetapi kemampuan mengubah data spasial menjadi keputusan yang bisa dipercaya dan bisa dipertanggungjawabkan.

Kalau kamu menambahkan satu kota lagi, test dasar, dan riwayat commit yang rapi, proyek ini akan naik dari “portofolio kuat” menjadi “bukti kerja yang sulit dibantah”. Halaman portofolio yang sudah akurat dan aset visual yang siap upload membuat titik awalnya jauh lebih kuat.
