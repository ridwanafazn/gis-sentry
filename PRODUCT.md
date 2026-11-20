# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** expansion manager jaringan minimarket (12+ gerai). Bekerja di desktop untuk menyusun shortlist lokasi, lalu membawa keputusan ke rapat ekspansi.

**Secondary:** pemilik franchise/UMKM (1–5 gerai) yang butuh rekomendasi sederhana tanpa analisis berat.

**Tertiary:** analis GIS internal yang memvalidasi data, menjalankan skenario, dan mengekspor memo.

## Product Purpose

GIS Sentry membantu tim ekspansi retail memilih lokasi minimarket di kota tier-2 dengan bukti spasial yang bisa dipertahankan: skor lokasi yang terurai, simulasi kanibalisasi, constraint check, dan decision memo.

Success berarti expansion manager bisa menyusun shortlist 10 lokasi dalam hitungan menit, memahami mengapa sebuah lokasi masuk shortlist, dan membawa memo yang kredibel ke rapat.

## Positioning

Bukan map viewer dan bukan black-box AI. GIS Sentry menggabungkan PostGIS + MVT, baseline weighted-v1 yang transparan, dan copilot yang hanya menjawab dari data/tool dengan sitasi. Fokusnya kota tier-2 Indonesia (Subang), bukan dashboard metro generik.

## Operating Context

- Perencanaan di desktop; review cepat di mobile saat kunjungan lapangan.
- Data inti: OpenStreetMap (gerai, anchor, jalan), WorldPop 2020, Overture Places (label evaluasi), PostGIS.
- Output dipakai di rapat ekspansi: shortlist, gross vs net, caveat, decision memo PDF.
- Model produksi weighted-v1; LightGBM sudah dievaluasi tetapi tidak dipakai karena gagal transfer ke Subang.

## Capabilities and Constraints

- AOI demo 10 km Kota Subang; 2.982 sel H3 res 9; 24 minimarket OSM; 57 anchor; 233 way jalan; populasi 273.170 jiwa.
- Skor weighted-v1: demand 45%, kompetisi 25%, akses 20%, risiko 10% (placeholder 0).
- Simulasi kanibalisasi per brand (Alfamart/Indomaret), buffer radial 3 km.
- Decision memo PDF + halaman cetak; RAG dokumen; copilot dengan tool + sitasi.
- Stack: Next.js 16 App Router, MapLibre, PostGIS (Neon production), Vercel.
- Batasan yang harus terlihat: skor adalah persentil relatif, bukan prediksi profit; BPS belum dikalibrasi; InaRISK/RDTR belum terhubung.

## Brand Commitments

- Nama: **GIS Sentry**.
- Voice: langsung, teknis, tenang; Bahasa Indonesia; tanpa hype.
- **Binding visual constraints dari user:** light mode only; flat icons; tanpa gradient/glow/glassmorphism; tipografi yang nyaman; responsif; anti-generic “AI slop”; arah paper/ink dengan satu aksen forest.
- Tidak ada dark mode toggle. Tidak ada emoji sebagai ikon.

## Evidence on Hand

- Live production: https://gis-sentry.vercel.app
- Data production: 2.982 H3, 24 stores, 57 anchors, 233 roads.
- Model report: `/model` · evaluasi LightGBM vs weighted-v1.
- Dokumen: `docs/01-product-brief.md`, `docs/02-model-evaluation.md`, `docs/03-deploy.md`, `docs/00-progress.md`.
- **Absences:** tidak ada data revenue/transaksi per gerai; tidak ada survei lapangan; tidak ada harga sewa; risiko banjir/zonasi masih placeholder. Jangan memfabrikasi angka atau klaim legal.

## Product Principles

1. **Decision first, map second.** Setiap layar harus mengarah ke shortlist atau memo, bukan sekadar eksplorasi peta.
2. **Show the reasoning.** Skor harus terurai; AI harus mengutip tool/sumber; tidak ada angka yang muncul tanpa asal.
3. **State limits visibly.** Persentil bukan probabilitas; placeholder risiko harus disebut; jangan memberi presisi palsu.
4. **Operational calm.** Kerapatan data boleh tinggi, tetapi hierarki, kontras, dan tipografi harus membuat pengguna tenang.
5. **Ground the AI.** Copilot memanggil data/tool deterministik; tidak pernah mengarang geometri, koordinat, atau angka.

## Accessibility & Inclusion

- Target WCAG 2.2 AA untuk teks, kontrol, dan fokus.
- Keyboard navigable; focus ring terlihat; touch target minimal 44×44 px.
- Mendukung `prefers-reduced-motion`.
- Dipakai di lapangan: teks tidak lebih kecil dari 11–12 px, kontras tinggi di layar terang, layout tidak bergantung pada hover.
