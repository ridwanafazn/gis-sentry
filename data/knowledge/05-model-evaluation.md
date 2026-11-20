# Evaluasi Model LightGBM

## Hasil regional CV
Dengan 69.928 sel dan 681 label positif Overture, LightGBM mengalahkan weighted-v1 pada CV regional 5-fold spatial block:
- Precision@10: 0,180 vs 0,120
- Precision@50: 0,232 vs 0,160
- NDCG@50: 0,220 vs 0,150
- ROC-AUC: 0,913 vs 0,898

## Hasil transfer Subang
Saat dilatih di luar Subang dan diuji di 20.657 sel Subang (91 positif), ML kalah:
- Precision@10: 0,100 vs 0,500
- Precision@50: 0,140 vs 0,180
- NDCG@50: 0,132 vs 0,273
- ROC-AUC: 0,890 vs 0,898

## Keputusan
ML tidak dipakai sebagai skor produksi. Baseline weighted-v1 dipertahankan karena lebih stabil, transparan, dan menang pada uji yang paling relevan. ML pipeline disimpan untuk diuji ulang setelah label Subang bertambah minimal 300 sel positif.

## Halaman laporan
Detail lengkap, feature importance, dan metodologi ada di halaman /model dan dokumen docs/02-model-evaluation.md.
