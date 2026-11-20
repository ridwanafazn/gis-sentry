# Metodologi GIS Sentry

## Skor weighted-v1
Skor produksi adalah **weighted-v1**: 45% demand, 25% kompetisi, 20% akses, dan 10% risiko. Skor akhir adalah **persentil relatif di dalam AOI 10 km**, bukan probabilitas profit. Skor 80 berarti sel tersebut berada di top 20% AOI, bukan "80% kemungkinan sukses".

## Demand
Demand terdiri dari 70% populasi WorldPop 2020 constrained 100 m dan 30% anchor POI. Populasi dihitung dengan distance decay 0,9 km; anchor (pasar, kampus, RS, sekolah, stasiun) memakai decay 1,2 km. Populasi belum dikalibrasi ke BPS per kecamatan.

## Kompetisi
Kompetisi menghitung gerai minimarket dalam radius 1,5 km dengan distance decay 0,7 km. Semakin padat kompetitor, semakin rendah skor. Gerai di sel target dikecualikan dari fitur kompetitor saat evaluasi model untuk mencegah leakage.

## Akses
Akses memakai 70% jarak ke jalan arteri/kolektor dan 30% jarak ke jalan lokal, dengan exponential decay. Jalan berasal dari OpenStreetMap (highway=motorway/trunk/primary/secondary/tertiary).

## Risiko
Risiko masih placeholder 0. Zona banjir InaRISK, konflik landuse, dan zonasi RDTR belum masuk model. Jangan menyimpulkan lokasi bebas banjir hanya dari skor.

## Kanibalisasi
Simulasi kanibalisasi menghitung hanya gerai **brand sendiri** (Alfamart atau Indomaret) dalam buffer radial 3 km, dengan overlap = (1 - jarak/3 km)^2. Gross score dikalikan (1 - kanibalisasi), dengan cap 85%. Buffer radial belum isochrone; bobot kapasitas gerai masih seragam.

## Data
Minimarket dan anchor dari OpenStreetMap; populasi dari WorldPop 2020; label evaluasi ML dari Overture Places. Semua sumber punya keterbatasan cakupan dan lisensi masing-masing.
