# Konteks Subang

## Pasar tier-2
Subang adalah kabupaten tier-2 di Jawa Barat dengan populasi sekitar 1,6 juta jiwa. Pusat urban utama ada di Kota Subang; Pamanukan menjadi pusat kedua di utara. Analisis MVP memakai AOI radius 10 km dari pusat Kota Subang.

## Driver pertumbuhan
Pelabuhan Patimban dan kawasan industri di sekitar Subang mendorong perubahan ekonomi dan permintaan retail. Namun dampaknya belum merata; analisis per kecamatan tetap diperlukan.

## Cakupan data
Cakupan OSM di Subang lebih tipis dibanding Bandung. OSM mencatat 28 minimarket di polygon Subang; Overture mencatat 92 minimarket chain. Untuk itu, label evaluasi ML memakai Overture, sedangkan peta display memakai OSM. Perbedaan ini harus disebut saat mempresentasikan hasil.

## Mengapa baseline dipilih
Dengan 91 sel positif Subang, model ML tidak punya cukup contoh lokal. Baseline weighted-v1 lebih stabil dan dapat dijelaskan. Fokus berikutnya adalah menambah label lokal, bukan memaksa model yang belum generalize.
