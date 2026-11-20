# Phase 3 — Model Evaluation: LightGBM vs weighted-v1

**Status:** selesai — ML dievaluasi, **tidak dipakai di produksi** karena gagal pada uji transfer Subang.
**Model produksi:** weighted-v1.
**Halaman laporan:** `/model`.

---

## 1. Tujuan

Menguji apakah LightGBM ranker bisa mengalahkan baseline weighted-v1 untuk memilih lokasi minimarket. Fokus evaluasi bukan hanya akurasi di data training, tetapi **kemampuan generalisasi ke Subang** — kota target produk.

---

## 2. Data

| Komponen | Nilai |
|---|---|
| Wilayah training | bbox Greater Subang (107.25–108.0 E, -6.95–-6.15 S) |
| Sel H3 res 9 | **69.928** |
| Label positif | **681 sel** (0,97%) berisi minimarket chain |
| Sumber label | **Overture Places**: 1.390 minimarket (Alfamart/Indomaret/Alfamidi) |
| Sel Subang (holdout) | **20.657** sel, **91 positif** |
| Blok spasial | **240** blok 0,05° |
| Anchor POI | 1.569 (pasar, kampus, RS, sekolah, stasiun) |
| Segmen jalan | 140.298 (arteri/kolektor OSM) |
| Populasi | WorldPop 2020 constrained 100 m |
| Fitur model | 13 fitur (populasi, anchor, kompetitor, akses, jarak) |

**Catatan sumber label:** OSM hanya memiliki 28 minimarket di dalam polygon Subang; Overture memiliki 92. Karena itu label training memakai Overture. Peta tetap menampilkan titik OSM untuk display; perbedaan sumber ini dicatat sebagai keterbatasan.

---

## 3. Metodologi

### Label dan negative sampling

- Positif: sel H3 yang berisi ≥1 minimarket chain.
- Sel tanpa gerai **bukan negative sejati** → pendekatan PU-style:
  - positif: bobot 1,0
  - negatif urban (populasi catchment ≥ median): bobot 0,8
  - negatif rural: bobot 0,15

### Leakage guard

Fitur kompetitor **mengecualikan gerai di sel target**. Tanpa ini, model positif akan melihat "jarak ke gerai sendiri = 0" dan metrik menjadi palsu.

### Spatial CV

- `GroupKFold(5)` berdasarkan blok spasial 0,05° (bukan random split per sel).
- Kandidat evaluasi: sel urban (populasi catchment ≥ median), karena memilih lokasi di sel rural kosong tidak relevan.
- Metrik: Precision@K, NDCG@K, ROC-AUC, average precision.

### Subang transfer test

Model dilatih di **luar** polygon Subang, lalu diuji di 20.657 sel Subang (91 positif). Ini mengukur apakah model regional bisa memilih lokasi di kota target, bukan hanya menghafal pola Bandung.

---

## 4. Hasil

### 4.1 Regional CV (5-fold spatial block, kandidat urban)

| Metrik | LightGBM | Weighted-v1 |
|---|---|---|
| Precision@10 | **0,180 ± 0,147** | 0,120 ± 0,117 |
| Precision@25 | **0,232 ± 0,127** | 0,168 ± 0,127 |
| Precision@50 | **0,232 ± 0,100** | 0,160 ± 0,091 |
| Precision@100 | **0,208 ± 0,092** | 0,180 ± 0,089 |
| NDCG@50 | **0,220 ± 0,116** | 0,150 ± 0,083 |
| ROC-AUC | **0,913 ± 0,007** | 0,898 ± 0,021 |

**Interpretasi:** di wilayah training, ML konsisten mengalahkan baseline. Ini bukan hasil yang mengejutkan karena model bisa mempelajari kombinasi non-linear populasi, akses, dan kompetitor.

### 4.2 Subang transfer test

| Metrik | LightGBM | Weighted-v1 |
|---|---|---|
| Precision@10 | 0,100 | **0,500** |
| Precision@25 | 0,160 | **0,280** |
| Precision@50 | 0,140 | **0,180** |
| Precision@100 | 0,130 | 0,130 |
| NDCG@50 | 0,132 | **0,273** |
| ROC-AUC | 0,890 | **0,898** |

**Interpretasi:** saat dipindahkan ke Subang, ML **kalah jauh** dari baseline pada Precision@10 (0,10 vs 0,50) dan NDCG@50 (0,132 vs 0,273). Model regional terlalu terikat pada pola Bandung dan tidak cukup belajar pola Subang karena hanya 91 sel positif.

### 4.3 Feature importance (gain)

| Fitur | Gain |
|---|---|
| arterial_km | 11.855 |
| access | 7.271 |
| competitor_decay | 5.952 |
| nearest_competitor_km | 4.656 |
| population_1_5km | 2.841 |
| anchor_decay | 2.814 |
| demand | 2.676 |
| population_decay | 2.259 |

Akses jalan dan kompetitor mendominasi; populasi tetap penting tetapi bukan satu-satunya sinyal.

---

## 5. Keputusan

**Produksi tetap memakai weighted-v1.**

Alasan:

1. **Baseline menang pada uji yang paling relevan** — Subang transfer.
2. **Label Subang terlalu tipis** — 91 sel positif; ML tidak punya cukup contoh lokal.
3. **Domain shift** — model regional belajar dari Bandung yang jauh lebih padat; Subang lebih rural.
4. **Baseline lebih stabil dan bisa dijelaskan** — tidak membutuhkan training label lokal, dan dekomposisi faktornya transparan.

ML pipeline tetap disimpan (`data/ml/`, `scripts/build-ml-dataset.mjs`, `scripts/train_ranker.py`) untuk diuji ulang ketika data Subang bertambah.

---

## 6. Keterbatasan

- Label Overture bisa tidak lengkap di area rural; 92 minimarket chain di Subang masih di bawah estimasi lapangan.
- Sel tanpa gerai bukan negative sejati; bobot PU hanya mitigasi.
- Uji transfer Subang hanya 91 positif; metrik per fold berisiko tinggi.
- Belum ada fitur building footprint, daya beli BPS, banjir InaRISK, atau zonasi RDTR.
- Model belum memakai data kompetitor per brand (Alfamart vs Indomaret).

---

## 7. Yang akan mengubah keputusan

1. **≥300 sel positif Subang** dari survey lapangan / Overture refresh / data mitra.
2. Fitur baru: building footprint, daya beli BPS, risiko banjir, zonasi.
3. Model per brand (Alfamart vs Indomaret) dengan label dan kompetitor terpisah.
4. Uji ulang dengan spatial CV **di dalam Subang** setelah data lokal cukup.

Sampai itu terjadi, weighted-v1 adalah pilihan yang lebih jujur dan lebih stabil.
