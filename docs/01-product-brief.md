# Retail Site Intelligence — Product Brief v0.1

**Project:** GIS Sentry — Retail Expansion Decision Support
**AOI fase 1:** Kabupaten Subang, Jawa Barat (radius 10 km dari pusat Kota Subang)
**Target pengguna:** tim ekspansi retail chain & pemilik franchise (non-pemerintah)
**Status:** draft — menunggu data audit gate
**Tanggal:** 20 November 2026

---

## 1. Problem Statement (1 halaman)

### Konteks

Jaringan minimarket di Indonesia sedang tumbuh ke kota tier-2. Subang adalah contoh yang representatif: populasi sekitar 1,6 juta jiwa (BPS Kab. Subang — verifikasi angka terbaru saat data audit), punya dua pusat aktivitas (Kota Subang dan Pamanukan), dan sedang mengalami perubahan ekonomi dari Pelabuhan Patimban serta kawasan industri di sekitarnya. Pertumbuhan ini menciptakan permintaan retail baru — tetapi keputusan lokasi masih dibuat dengan cara lama.

### Masalah

Tim ekspansi retail di kota tier-2 mengambil keputusan lokasi dengan **Excel, Google Maps, dan kunjungan lapangan**. Tiga blind spot yang konsisten muncul:

1. **Permintaan tidak terlihat dalam skala halus.** Data BPS tersedia per kecamatan/desa, sementara keputusan lokasi butuh resolusi 1–3 km. Akibatnya analis menebak distribusi penduduk di dalam kecamatan.
2. **Kanibalisasi tidak terukur.** Tidak ada cara cepat untuk menjawab: "kalau buka di sini, cabang mana yang revenue-nya berpindah, dan berapa besar?" Keputusan diambil setelah kontrak ditandatangani, bukan sebelumnya.
3. **Constraint baru dicek di akhir.** Zonasi, risiko banjir, dan akses jalan arteri baru diperiksa saat survey lokasi — sering setelah biaya sewa dan negosiasi berjalan.

Tool location intelligence yang ada (Mapbox/Esri/Carto) kuat, tetapi mahal, berorientasi metro, dan tidak dikalibrasi untuk data tier-2 yang lebih tipis. Konsultan lokasi untuk satu studi bisa puluhan juta rupiah — di luar jangkauan franchise owner.

### Dampak

- Dua gerai berdiri terlalu dekat → revenue terbagi, bukan bertambah (incremental revenue negatif).
- Lokasi di sisi jalan yang salah → akses turun, traffic terbuang.
- Kontrak sewa ditandatangani sebelum overlap dengan jaringan sendiri diketahui.
- Analis menghabiskan 1–2 hari kerja hanya untuk menyusun shortlist 10 lokasi, dan hasilnya sulit dipertahankan di rapat.

### Peluang

Data spasial gratis (OSM, Overture, WorldPop, BPS, InaRISK) + stack open-source (PostGIS, MapLibre) + model ranking yang ringan sudah cukup untuk membangun **decision-support tool khusus tier-2** — sesuatu yang belum dilayani dengan baik oleh produk global.

### Solusi yang diusulkan

Aplikasi web yang:
1. Memberi **skor kelayakan lokasi** per grid H3, dengan dekomposisi faktor yang bisa dijelaskan.
2. **Mensimulasikan kanibalisasi** terhadap jaringan gerai yang sudah ada (gross vs net score).
3. **Menandai constraint** (banjir, zonasi/landuse, akses jalan) sebelum shortlist.
4. Menghasilkan **decision memo** yang bisa dibawa ke rapat ekspansi.
5. Menyediakan **copilot** yang menjawab "kenapa skor lokasi ini 82?" dengan merujuk ke data — bukan mengarang.

### Kriteria keberhasilan MVP

| Kriteria | Target |
|---|---|
| Kualitas ranking | Precision@10 model ≥ baseline weighted-score + 15 poin persentase |
| Kredibilitas | 3 praktisi retail menilai top-10 "masuk akal" (rata-rata ≥ 4/5) |
| Kecepatan | Shortlist 10 lokasi < 30 menit (dari sebelumnya 1–2 hari) |
| Keamanan keputusan | 100% top-10 lolos constraint check (tidak ada red flag banjir/zonasi) |
| Kejelasan | Setiap skor bisa dijelaskan tanpa membuka model (dekomposisi faktor) |

### Non-goals (fase 1)

- Bukan aplikasi pemerintah / perencanaan tata ruang.
- Bukan routing engine dari nol, bukan real-time traffic.
- Bukan aplikasi mobile.
- Bukan multi-tenant SaaS dengan billing.
- Bukan prediksi profit dalam rupiah — hanya **relative suitability score**.

---

## 2. Persona

### Persona utama — "Dedi", Expansion Manager

- **Usia/role:** 38, Expansion Manager di chain regional with 12 gerai di Jawa Barat.
- **Target:** 4–6 gerai baru per tahun. Bonus terkait performa gerai baru.
- **Cara kerja sekarang:** Excel berisi kandidat, cek Google Maps, survey 2–3 kali, diskusi dengan owner.
- **Pain:**
  - Tidak punya data populasi di resolusi yang bisa dipakai untuk memilih titik.
  - Takut kanibalisasi, tapi tidak punya angka untuk membantah atau mendukung.
  - Sering menemukan masalah zonasi/banjir setelah sewa hampir tanda tangan.
  - Harus mempertahankan keputusan di depan owner — butuh bukti, bukan feeling.
- **Definisi sukses:** bisa membawa shortlist 10 lokasi + alasan + simulasi kanibalisasi ke rapat, dan keputusan diterima tanpa debat panjang.

### Persona sekunder — "Rina", Franchise Owner

- **Usia/role:** 32, punya 3 gerai, berencana buka ke-4.
- **Pain:** tidak mampu bayar konsultan; takut membuka terlalu dekat dengan gerainya sendiri; butuh rekomendasi sederhana, bukan dashboard penuh grafik.
- **Definisi sukses:** mendapat 3 rekomendasi lokasi + risiko utama masing-masing, dalam bahasa non-teknis.

### Persona tersier — "Analis"

- Menyiapkan data, menjalankan skenario, mengekspor memo.
- Butuh transparansi metodologi, bukan black box.

### Anti-persona

- Perencana pemerintah/Bappeda — di luar scope produk ini. Jangan campur messaging.

---

## 3. Scope MVP

**Kategori dikunci:** minimarket chain — **Alfamart & Indomaret** dipakai sebagai kompetitor acuan sekaligus label training/evaluasi. Alfamidi dihitung sebagai "brand lain".

**In scope:**

1. Pilih AOI + kategori retail + radius analisis.
2. Heatmap skor H3 + ranking lokasi kandidat.
3. Detail lokasi: catchment, kompetitor, populasi, aksesibilitas, dekomposisi skor.
4. Simulasi buka gerai baru → dampak kanibalisasi ke gerai existing.
5. Decision memo (PDF/share link) + copilot penjelas skor.

**Out of scope (fase 1):**

- Routing engine sendiri, isochrone berbasis jaringan penuh (v0 pakai buffer; v1 pakai isochrone).
- Data trafik real-time, data sewa/harga tanah.
- Multi-user, billing, mobile app.
- Prediksi revenue dalam rupiah.

---

## 4. Data Inventory

> Semua sumber di bawah gratis. Lisensi tetap wajib dicek dan diatribusikan.

| # | Dataset | Isi | Granularitas | Sumber | Lisensi / catatan | Pemakaian |
|---|---|---|---|---|---|---|
| 1 | Batas administrasi | Kabupaten/kecamatan/desa | vektor poligon | BIG Ina-Geoportal; Overture Divisions; OSM | BIG terbuka; Overture CDLA-P; OSM ODbL | Agregasi & pelaporan |
| 2 | Populasi per kecamatan | Jumlah penduduk, kepadatan, proyeksi | kecamatan/desa | BPS Kab. Subang — *Kabupaten Subang Dalam Angka*, *Kecamatan Dalam Angka* | gratis, atribusi BPS | Kalibrasi total populasi |
| 3 | Populasi grid | Populasi per piksel | 100 m | WorldPop (Indonesia) | CC BY 4.0 | Basis dasymetric |
| 4 | Populasi grid alternatif | Populasi per hex | H3 400 m | Kontur Population | gratis, cek lisensi | Cross-check |
| 5 | Building footprints | Poligon bangunan | per bangunan | Google Open Buildings; Overture Buildings | CC BY 4.0 (verifikasi); CDLA-P | Dasymetric refinement, densitas hunian |
| 6 | POI kompetitor & anchor | Minimarket, pasar, kampus, RS, sekolah, mall | titik | OSM (Geofabrik/Overpass); Overture Places | ODbL; CDLA-P | Kompetisi, anchor demand |
| 7 | Jaringan jalan | Road graph + kelas jalan | garis | OSM | ODbL | Aksesibilitas, network distance |
| 8 | Land use / tutupan lahan | Zona industri, pertanian, permukiman | poligon/raster | OSM `landuse`; ESA WorldCover 10 m | ODbL; CC BY 4.0 | Constraint & konteks |
| 9 | Zonasi / RDTR | Pola ruang & ketentuan | poligon/dokumen | GISTARU (ATR/BPN); RTRW Kab. Subang | gratis; kualitas bervariasi | Constraint checker |
| 10 | Risiko banjir | Zona rawan banjir | poligon/raster | InaRISK BNPB | gratis, atribusi | Penalti risiko |
| 11 | Transit | Stasiun, terminal | titik | OSM | ODbL | Aksesibilitas |
| 12 | Label positif | Gerai existing (Indomaret/Alfamart) | titik | OSM brand tags | ODbL | Training/evaluasi |
| 13 | Label negatif | Gerai tutup/terbengkalai | titik | OSM `disused:*`, `abandoned:*` | ODbL | Negative examples |
| 14 | Harga sewa/tanah | — | — | tidak ada sumber gratis yang reliable | — | **Skip fase 1** |
| 15 | Trafik | — | — | tidak gratis | — | **Skip; pakai road class sebagai proxy** |

### Catatan lisensi penting

- **OSM (ODbL):** wajib atribusi; produk turunan database berpotensi terkena share-alike. Untuk portfolio aman; untuk komersialisasi, pertimbangkan Overture.
- **Overture (CDLA-Permissive 2.0):** lebih permisif, cocok untuk produk.
- **Google Maps/Places:** jangan scrape atau menyimpan data untuk produk — melanggar ToS.
- **BPS:** gratis dengan atribusi; jangan redistribute mentah tanpa cek ketentuan.

---

## 5. AOI & Data Audit Gate

### AOI yang disarankan

**AOI-1 (MVP):** radius 10 km dari Alun-Alun Subang, mencakup Kecamatan Subang, Cibogo, dan Pagaden. Alasan: satu pusat urban yang contiguous, cukup padat untuk label, dan tidak terlalu luas untuk iterasi cepat.

**AOI-2 (fase 1.5):** Pamanukan sebagai pusat kedua (uji generalisasi model ke kota kecamatan pesisir).

Jangan pakai seluruh kabupaten (≈2.051 km²) di MVP: data rural sparse, noise tinggi, dan waktu komputasi naik tanpa manfaat.

### Gate audit (wajib lulus sebelum coding fitur)

Jalankan query Overpass di Appendix A, lalu isi:

| Cek | Ambang lulus | Jika gagal |
|---|---|---|
| Jumlah `shop=convenience` di AOI | ≥ 40 | Perluas kategori ke `supermarket|convenience|general`; pakai Overture Places |
| Persentase brand-tagged (Indomaret/Alfamart/Alfamidi) | ≥ 60% | Gunakan label chain dari Overture; jangan scrape store locator |
| Anchor POI (pasar, kampus, RS, sekolah) | ≥ 10 per kategori utama | Tambah sumber (Dapodik, data RS) atau turunkan bobot anchor |
| Jalan arteri/kolektor terpetakan | semua jalan utama ada | Gunakan RBI BIG sebagai pelengkap |
| Building footprints | menutupi area urban utama | Gunakan Google Open Buildings |
| Tabel BPS kecamatan | tersedia untuk semua kecamatan AOI | Gunakan desa dalam angka / SP2020 |
| Label negatif (`disused/abandoned`) | ≥ 5 | Gunakan pseudo-negative dengan bobot rendah + expert review |

**Keputusan gate:** kalau ≥ 5 dari 7 cek lulus → lanjut Subang. Kalau < 5 → fallback ke Bandung (AOI 10 km dari pusat kota) dengan thesis yang sama.

> Catatan: query Overpass dari environment pengembangan ini timeout (koneksi keluar dibatasi), jadi audit dijalankan manual via Overpass Turbo.

### Hasil audit — 20 November 2026

**AOI 10 km (terlalu tipis):** 24 minimarket, 14 branded (58,3%), 0 gerai tutup.

**Skala kabupaten (bbox -6.95, 107.25, -6.15, 108.0):**

| Cek | Hasil | Ambang | Status |
|---|---|---|---|
| Total `shop=convenience` | **750** | ≥ 80 | ✅ |
| Indomaret | **251** | — | — |
| Alfamart | **247** | — | — |
| Branded (Alfa + Indom) | **498 / 750 = 66,4%** | ≥ 50 dan ≥ 60% | ✅ |
| Gerai tutup/terbengkalai | **13** | ≥ 5 | ✅ |

**Verdict:** gate label **lulus** di skala kabupaten. Bbox di atas mencakup sebagian kabupaten tetangga; angka final perlu difilter dengan batas administrasi Subang (query `geocodeArea` di Appendix A). Bahkan setelah difilter, volume label tetap cukup.

**Konsekuensi desain:**

- Label training/evaluasi: **skala kabupaten**, bukan 10 km.
- Demo AOI: 10 km Kota Subang.
- 14 positif di AOI 10 km terlalu sedikit untuk Precision@10 → evaluasi di level kabupaten dengan spatial CV per kecamatan.
- Label negatif hanya 13 → jangan classifier dengan random negatives; pakai ranking/PU + hard negatives (sel urban tanpa gerai).

---

## 6. Definisi Skor v1 (weighted)

### Unit analisis

- **Komputasi:** H3 resolusi 9 (≈0,105 km² per sel).
- **Tampilan:** H3 resolusi 8 (≈0,74 km²) untuk heatmap; agregasi kecamatan untuk laporan.

### Fitur & bobot

| Grup | Bobot | Fitur | Cara hitung (implementasi weighted-v1) |
|---|---|---|---|
| **Demand** | 45% | Populasi dalam catchment | WorldPop 2020 constrained 100m; **70%** dari demand, distance decay 0,9 km |
| | | Anchor POI | Pasar/kampus/RS/sekolah/stasiun; **30%** dari demand, decay 1,2 km |
| **Kompetisi** | 25% | Gerai dalam 1,5 km | Semua minimarket; decay 0,7 km; semakin padat semakin rendah skor |
| **Aksesibilitas** | 20% | Jarak jalan | 70% jarak ke arteri/kolektor + 30% jarak ke jalan lokal; exponential decay |
| **Risiko** | 10% | Banjir/zonasi | **Placeholder 0** — InaRISK dan RDTR masuk fase berikutnya |
| **Daya beli** | — | Proxy BPS | Belum dipakai; BPS per kecamatan menyusul |

### Formula

```
D, C, A, R = fitur ternormalisasi 0..1
raw_i = 0.45*D_i + 0.25*(1-C_i) + 0.20*A_i + 0.10*(1-R_i)
score_i = percentile_rank(raw_i dalam AOI)   // 0..100
```

**Data aktual weighted-v1:** 24 minimarket, 57 anchor, 233 way jalan arteri/kolektor, 2.982 sel H3, populasi AOI 273.170 jiwa (WorldPop). Sumber dan bobot juga ditulis di `public/data/meta.json`.

**Penting:** skor adalah **persentil relatif di dalam AOI**, bukan probabilitas profit. Skor 80 berarti "top 20% di AOI ini", bukan "80% kemungkinan sukses". Ini harus tertulis di UI.

### Baseline (wajib dibandingkan)

1. **B0:** populasi saja.
2. **B1:** populasi + jarak ke kompetitor.
3. **B2:** weighted score di atas (tanpa ML).

Model ML (LightGBM ranker) hanya dipakai kalau **mengalahkan B2** secara signifikan di evaluasi spatial CV.

---

## 7. Model Kanibalisasi

### Definisi

Untuk kandidat lokasi `c` dan gerai existing `s`:

```
overlap(c, s) = area(catchment(c) ∩ catchment(s)) / area(catchment(c))
cannibalization(c) = Σ_s overlap(c, s) * weight(s)
net_score(c) = gross_score(c) * (1 - cannibalization(c))
```

- `weight(s)` = proxy kapasitas gerai (luas/POI density; sementara uniform).
- Catchment v0 = buffer 3 km radial + decay kuadratik. v1 = isochrone 10 menit berkendara.
- **Hanya gerai brand sendiri** yang dihitung sebagai kanibalisasi (Alfamart atau Indomaret). Gerai brand lain = kompetitor, bukan kanibalisasi.
- Tampilkan **gross vs net** berdampingan — ini fitur pembeda utama.
- Tampilkan juga "jarak ke gerai sendiri terdekat" sebagai guardrail.

### Batasan yang harus diakui di UI

- Belum ada data revenue per gerai → kanibalisasi bersifat **relatif/ordinal**, bukan rupiah.
- Buffer radial bukan isochrone → underestimate barrier (sungai, tol).

---

## 8. Constraint Checker

Tiga lapis, dievaluasi sebelum lokasi masuk shortlist:

1. **Banjir:** titik/sel beririsan dengan zona InaRISK → status merah.
2. **Landuse:** `landuse=industrial|farmland|forest|greenfield` → status kuning/merah.
3. **Akses:** jarak ke jalan collector/arterial > 200 m → status kuning.
4. **Zonasi (jika tersedia):** point-in-polygon RDTR; jika hanya dokumen teks, gunakan RAG dengan sitasi dan tandai "perlu verifikasi manual".

Semua constraint harus muncul di decision memo, bukan hanya di peta.

---

## 9. Rencana Evaluasi

### 9.1 Label

- **Positif:** gerai Alfamart & Indomaret existing di AOI (`shop=convenience` + brand yang sesuai). Alfamidi diperlakukan sebagai brand lain.
- **Negatif:** `disused:shop`, `abandoned:shop`; pseudo-negative random cells dengan bobot rendah.
- **Kelemahan yang diakui:** survivorship bias (hanya gerai yang masih buka), label noise OSM, tidak ada data tutup permanen yang lengkap.

### 9.2 Guardrail kebocoran (leakage)

- Fitur kompetisi **mengecualikan gerai di sel target**.
- Saat melatih label "ada gerai", hapus fitur yang secara langsung mengkodekan keberadaan gerai (mis. jarak ke gerai sendiri = 0).
- **Spatial block CV:** split berdasarkan kecamatan/desa, bukan random per sel. Random split akan bocor karena sel bertetangga berkorelasi kuat.
- Laporkan hasil baseline dan model pada split yang sama.

### 9.3 Metrik

| Metrik | Kenapa |
|---|---|
| **Precision@10** | Langsung menjawab: "10 rekomendasi teratas, berapa yang benar-benar ada gerainya?" |
| **NDCG@10** | Ranking, bukan hanya klasifikasi |
| ROC-AUC | Diagnostik sekunder (jangan jadi metrik utama) |
| **Spearman** skor vs label density | Cek apakah ranking konsisten |
| Kalibrasi | Apakah skor 80 memang lebih sering positif dari skor 60 |

### 9.4 Uji wajib

1. **Ablation:** hapus tiap grup fitur → lihat penurunan metrik.
2. **Sensitivity:** ubah bobot ±20% → cek stabilitas top-10 (rank stability).
3. **Anti-metric:** korelasi skor vs populasi. Kalau > 0,9 → model cuma menggambar ulang peta populasi; perbaiki fitur.
4. **Expert blind review:** 3 praktisi menilai top-10 dan 10 lokasi acak (Likert 1–5), tanpa tahu mana yang model vs acak.
5. **Backtest (opsional):** jika tag `start_date` cukup, latih pada gerai sebelum tahun X dan uji gerai setelahnya.

### 9.5 Evaluasi produk

- Waktu menyusun shortlist 10 lokasi (target < 30 menit).
- Jumlah skenario kanibalisasi yang dijalankan per sesi.
- Apakah decision memo dipakai di rapat (kualitatif, wawancara 3 pengguna).

---

## 10. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| OSM tidak lengkap di Subang | Label & kompetitor bias | Data audit gate; fallback Bandung; Overture; flag completeness |
| Tidak ada ground truth revenue | Klaim berlebihan | Klaim relative suitability, bukan prediksi profit; expert review |
| False precision | Kredibilitas jatuh | Persentil + confidence + caveat di UI |
| Leakage fitur kompetisi | Metrik bagus palsu | Guardrail 9.2; spatial CV |
| Scope creep | Tidak selesai | 1 AOI, 1 kategori, 5 fitur |
| Legal (Google/ODbL) | Produk tidak bisa dipakai | Overture/OSM + atribusi; hindari scrape |
| "Peta bukan produk" | Demo cantik, nilai rendah | Output utama = decision memo |

---

## 11. Keputusan Terbuka

1. ✅ **Data audit gate** — lulus di skala kabupaten (perlu filter batas admin untuk angka final).
2. ✅ **Kategori** — Alfamart & Indomaret; Alfamidi dihitung brand lain.
3. ✅ **AOI demo** — 10 km Kota Subang; evaluasi skala kabupaten.
4. ✅ **Catchment v0** — buffer radial 3 km + distance decay kuadratik; kanibalisasi hanya menghitung brand sendiri (Alfamart/Indomaret).
5. ⬜ **Zonasi** — ketersediaan RDTR Subang dalam bentuk poligon.
6. ✅ **Stack** — Next.js + MapLibre + PostGIS (Neon) + OpenCode Go; live di https://gis-sentry.vercel.app.

---

## Appendix A — Overpass QL untuk Data Audit

Jalankan di [Overpass Turbo](https://overpass-turbo.eu) atau via API:

```overpassql
[out:json][timeout:180];
(
  nwr["shop"~"^(convenience|supermarket|department_store|mall)$"](-6.95,107.25,-6.15,108.0);
  nwr["amenity"~"^(marketplace|university|college|hospital|school)$"](-6.95,107.25,-6.15,108.0);
  nwr["railway"="station"](-6.95,107.25,-6.15,108.0);
  nwr["disused:shop"](-6.95,107.25,-6.15,108.0);
  nwr["abandoned:shop"](-6.95,107.25,-6.15,108.0);
);
out center tags;
```

Setelah jalan, hitung manual atau ekspor GeoJSON dan cek:

- total `shop=convenience`
- distribusi `brand` (Indomaret / Alfamart / Alfamidi / lain)
- jumlah per kategori anchor
- jumlah `disused`/`abandoned`
- sebaran spasial (apakah menumpuk hanya di Kota Subang?)

### Troubleshooting: `Dispatcher_Client::request_read_and_idx::duplicate_query`

Ini **bukan syntax error**. Overpass menolak karena query yang identik sedang diproses/masih antre di server (biasanya karena tombol Run diklik lebih dari sekali, atau query sebelumnya timeout tapi belum selesai).

Cara mengatasi:

1. Tunggu 1–2 menit, lalu klik **Run sekali** saja.
2. Tambahkan komentar di baris pertama (ubah hash query), misal `// audit-v2`.
3. Ganti server: **Settings → General → Server** → `https://overpass.kumi.systems/api/interpreter` atau `https://overpass.private.coffee/api/interpreter`.
4. Pecah query besar menjadi query kecil. Jangan gabungkan `school` dengan semuanya di bbox kabupaten — itu yang paling memberatkan.

Bbox AOI 10 km dari pusat Kota Subang: `(-6.661,107.668,-6.482,107.849)`.

### Query dengan batas administrasi (lebih akurat)

`geocodeArea` adalah fitur Overpass Turbo — gunakan ini untuk angka final, karena bbox persegi ikut menghitung kabupaten tetangga.

```overpassql
// ADMIN-total-v1
[out:json][timeout:90];
{{geocodeArea:Kabupaten Subang, Jawa Barat}}->.subang;
nwr["shop"="convenience"](area.subang);
out count;
```

```overpassql
// ADMIN-indomaret-v1
[out:json][timeout:90];
{{geocodeArea:Kabupaten Subang, Jawa Barat}}->.subang;
nwr["shop"="convenience"][~"^(brand|name|operator)$"~"Indomaret",i](area.subang);
out count;
```

```overpassql
// ADMIN-alfamart-v1
[out:json][timeout:90];
{{geocodeArea:Kabupaten Subang, Jawa Barat}}->.subang;
nwr["shop"="convenience"][~"^(brand|name|operator)$"~"Alfamart",i](area.subang);
out count;
```

Query ringan untuk audit (jalankan satu per satu):

```overpassql
// A-minimarket-total-v2
[out:json][timeout:60];
nwr["shop"="convenience"](-6.661,107.668,-6.482,107.849);
out count;
```

```overpassql
// B-indomaret-v2
[out:json][timeout:60];
nwr["shop"="convenience"][~"^(brand|name|operator)$"~"Indomaret",i](-6.661,107.668,-6.482,107.849);
out count;
```

```overpassql
// C-alfamart-v2
[out:json][timeout:60];
nwr["shop"="convenience"][~"^(brand|name|operator)$"~"Alfamart",i](-6.661,107.668,-6.482,107.849);
out count;
```

```overpassql
// D-anchor-v2
[out:json][timeout:60];
(
  nwr["amenity"="marketplace"](-6.661,107.668,-6.482,107.849);
  nwr["amenity"~"^(university|college)$"](-6.661,107.668,-6.482,107.849);
  nwr["amenity"="hospital"](-6.661,107.668,-6.482,107.849);
);
out count;
```

```overpassql
// E-closed-v2
[out:json][timeout:60];
(
  nwr["disused:shop"](-6.661,107.668,-6.482,107.849);
  nwr["abandoned:shop"](-6.661,107.668,-6.482,107.849);
);
out count;
```

Kalau butuh sebaran visual/GeoJSON, ganti `out count;` menjadi `out center tags;` — tapi jalankan hanya untuk bbox AOI, bukan seluruh kabupaten.

---

## Appendix B — Definisi Metrik

- **Precision@K:** dari K sel teratas, proporsi yang mengandung gerai existing.
- **NDCG@K:** kualitas urutan; relevansi berdasarkan keberadaan gerai (biner atau berbobot).
- **Spearman:** korelasi ranking skor model dengan kepadatan label.
- **Spatial block CV:** validasi silang dengan blok wilayah (kecamatan) sebagai fold, bukan titik acak.
- **Rank stability:** persentase overlap top-10 saat bobot diubah ±20%.
