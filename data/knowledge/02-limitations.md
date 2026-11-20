# Batasan Produk

## Bukan prediksi profit
Skor adalah persentil relatif AOI, bukan prediksi revenue atau profit. Keputusan investasi tetap membutuhkan validasi lapangan, data sewa, dan proyeksi keuangan.

## Populasi belum dikalibrasi BPS
Populasi memakai WorldPop 2020 constrained 100 m yang sudah UN-adjusted. Kalibrasi ke BPS per kecamatan/desa belum dilakukan. Kalibrasi tidak mengubah ranking relatif, tetapi mengubah skala absolut.

## Cakupan gerai tidak lengkap
OSM hanya memetakan 28 minimarket di polygon Subang; Overture memiliki 92 minimarket chain. Data lapangan bisa lebih banyak lagi. Kompetitor yang tidak terpetakan tidak masuk perhitungan.

## Risiko masih placeholder
Risiko banjir, zonasi RDTR, dan konflik landuse belum masuk skor. Selalu verifikasi ke InaRISK, RDTR/RTRW, dan dinas terkait sebelum membuka gerai.

## Kanibalisasi masih sederhana
Buffer radial 3 km belum isochrone; bobot kapasitas gerai seragam; belum ada data revenue per gerai. Angka kanibalisasi bersifat ordinal, bukan rupiah.

## ML tidak dipakai di produksi
LightGBM menang di CV regional tetapi kalah pada uji transfer Subang (Precision@10 0,10 vs 0,50 baseline). Penyebab utama: hanya 91 sel positif Subang dan domain shift dari Bandung. Laporan lengkap ada di halaman /model.
