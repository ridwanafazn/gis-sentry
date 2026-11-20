# UI Refactor Plan — Light-only, flat, anti-slop

**Status:** R1–R8 selesai. UI baru live di https://gis-sentry.vercel.app. Catatan performa mobile tetap terdokumentasi.
**Mode:** Operate — pengguna menyelesaikan tugas, bukan menikmati landing page.
**Design authority:** Impeccable 4.10.0.
**Jenis pekerjaan:** **redesign**, bukan polish. Tema dark/glass/neon saat ini adalah **anti-reference**, bukan bahan yang dipertahankan.

---

## Arah visual

**World:** “field notebook / planning desk” — kertas, tinta, satu aksen hijau tua. Tenang, teknis, padat, tanpa dekorasi yang bersaing dengan data.

**Prinsip bentuk:**
- Permukaan datar, border 1px, tanpa gradient, glass, blur, atau glow.
- Satu aksen (forest) untuk tindakan/selection; warna lain hanya untuk status.
- Data memakai mono + tabular numerals; label/UI memakai sans.
- Ikon flat dari satu set (Lucide), stroke 1.75, tanpa emoji.
- Bayangan hanya untuk overlay (sheet/popover), bukan kartu.

---

## Token yang diusulkan (dikunci di R1)

### Warna

| Token | Nilai | Pemakaian |
|---|---|---|
| `--canvas` | `#F5F2EA` | latar halaman (warm paper) |
| `--surface` | `#FFFFFF` | panel, sheet, tabel |
| `--surface-2` | `#F7F4EC` | sidebar, header tabel, state hover |
| `--surface-3` | `#EBE6DA` | track, rank chip, inset |
| `--ink` | `#1B211C` | teks utama |
| `--muted` | `#626C64` | teks sekunder |
| `--muted-2` | `#666F67` | micro text (kontras AA) |
| `--line` | `#DAD5C8` | border 1px |
| `--accent` | `#1F6B4F` | aksi, selection, skor tinggi |
| `--accent-soft` | `#E4EEE8` | latar selection ringan |
| `--warn` | `#8A5A12` | risiko/kompetisi |
| `--danger` | `#A13B32` | error/red flag |
| `--info` | `#315E7A` | catatan netral |

**H3 ramp (flat, sequential):** `#EDE9DD → #D8E5DC → #A9C8B7 → #5D9A7B → #1F6B4F`.
**Selected cell:** outline `--ink` 2px; tanpa glow.

### Tipografi

- **UI:** IBM Plex Sans 400/500/600.
- **Data:** IBM Plex Mono 400/500.
- Base **14px**; body 14/1.5; meta **12px**; micro label **11px** (tidak boleh 9–10px).
- Heading: 32/1.1 (page), 18/1.25 (section), 15/1.3 (panel).
- `font-variant-numeric: tabular-nums` untuk skor, koordinat, tabel, jarak.
- Self-host via `@fontsource`; tidak bergantung pada Google Fonts saat runtime.

### Spacing, radius, motion

- Spacing 4/8/12/16/24/32; grid 8px.
- Radius 8px kontrol, 10px panel kompak, 12px panel/sheet; tidak semua elemen jadi pill.
- Motion 140–180ms, hanya sheet/popover/selection; hormati `prefers-reduced-motion`.
- Fokus: 2px `--ink` + offset 2px; touch target ≥44px.

### Ikon

Lucide React, stroke 1.75, ukuran 13/14/19. Yang dipakai R1:
`MapPinned`, `Layers`, `Store`, `MapPin`, `MessageSquare`, `Send`, `FileDown`, `FileText`, `ArrowUpRight`, `ArrowLeft`, `Download`, `Printer`.
Ikon lain dari set yang sama boleh dipakai di R2–R6. Tidak ada emoji, dot dekoratif, atau campuran ikon filled/outline.

---

## Tahap refactor

| Tahap | Impeccable | Scope | Deliverable | Acceptance |
|---|---|---|---|---|
| **R0 · Audit & product truth** | `context` → `init` → `shape` | Inventaris layar/komponen; baseline screenshot 360/390/768/1024/1440; PRODUCT.md | `PRODUCT.md`, baseline, brief ini | Produk truth terkunci; baseline tersimpan; anti-slop rules disetujui |
| **R1 · Design system** | `document` / `extract` / `typeset` | Token light-only, font, ikon, primitives, hapus seluruh token dark | ✅ `DESIGN.md`, `app/tokens.css`, `globals.css`, font, Lucide | Build lolos; kontras AA; detector hanya `cream-palette` (dijustifikasi); belum deploy |
| **R2 · Shell & responsif** | `layout` / `adapt` | Desktop rail + map; ≤1120px map-first + bottom sheet `Kandidat/Detail/Tanya`; top bar; keyboard | ✅ `MapWorkspace.tsx` + `globals.css` | 360/390/768/1024 tanpa horizontal scroll; map terlihat pertama; sheet keyboard; kontrol peta tidak tertutup |
| **R3 · Komponen inti** | `polish` / `distill` | Button, input, tab, badge, score bar, candidate row, detail panel, memo actions; state hover/focus/disabled/loading/empty/error | ✅ Primitives 44px + `.state` loading/error/retry + copilot collapse | Target 44px; focus visible; tidak ada gradient/glow; body ≥12px |
| **R4 · Map surface** | `colorize` / `polish` | Basemap light, ramp flat, marker, legend, kontrol, selected state, padding sheet, resize | ✅ Label di atas H3, selected fill/outline, kontrol 44px, padding map | Data terbaca; atribusi tampil; selected cell di atas sheet; `map.resize()` benar |
| **R5 · Copilot & copy** | `clarify` / `harden` | Panel “Tanya data”, citation chips, empty/error/streaming, stop, prompt; buang copy AI-slop | ✅ Citation chips, stop, pending/error copy | Sitasi terlihat; keyboard; tidak ada klaim tanpa sumber |
| **R6 · Report & memo** | `typeset` / `adapt` | `/model` light; tabel responsif; memo print A4; spacing dokumen | ✅ Tabel stacked ≤760px; memo A4 1 halaman | Print 1 halaman; tabel tidak overflow; tipografi nyaman |
| **R7 · QA & polish** | `audit` / `polish` / `detect` | Screenshot 5 ukuran; a11y; kontras; keyboard; Lighthouse; CLS; detector | ✅ QA report, favicon, heading/ARIA, copy audit | A11y 100; desktop perf 99; mobile 55 (map-engine exception); CLS 0.015 |
| **R8 · Ship** | — | Preview → production; verifikasi health/tile/memo/copilot; update RAG/progress | ✅ Live https://gis-sentry.vercel.app | Health `db:true`, `ai:true`; tile 200; memo 200; UI light; tanpa regresi |

Estimasi: **5–6 hari fokus** (R0–R2 sekitar 2 hari; R3–R6 sekitar 3 hari; R7–R8 setengah hari).

### R1 — hasil (20 November 2026)

- **Token:** `app/tokens.css` light-only; legacy alias dipertahankan agar markup lama tidak putus; tidak ada token dark.
- **Tipografi:** IBM Plex Sans 400/500/600 + IBM Plex Mono 400/500, self-host via Fontsource. Body 14px, meta 12px, micro 11px; label 11px hanya untuk field pendek.
- **Ikon:** Lucide React, stroke 1.75; brand `MapPinned`, layer `Layers/Store/MapPin`, copilot `MessageSquare/Send`, memo `FileDown/FileText`, report `ArrowLeft`.
- **Map:** CARTO Positron; ramp H3 flat; marker dan selected cell light; legenda lima swatch diskret (tanpa gradient).
- **Copy:** kicker/eyebrow `.report-pill` dan `.memo-kicker` dihapus; `layer-dot` dekoratif dihapus; fallback model diselaraskan ke `weighted-v1`.
- **Layout:** shell desktop dirapikan; mobile masih menumpuk rail di atas peta — **map-first bottom sheet adalah R2**, bukan klaim R1.
- **Verifikasi:** `npm run build` lolos; `/api/health` 200; screenshot 1440/390; detector file scan 0 temuan.
- **Detector URL:** temuan kontras dan tiny-text sudah diperbaiki. Sisa satu temuan `cream-palette` yang **dijustifikasi**: warna kertas `#F5F2EA` adalah arah visual yang dipilih user (“paper/ink + forest”), bukan default refleks. Tidak diubah.
- **Sisa saat itu:** R2 shell/responsif (map-first mobile), R3 primitives/states, R4 map interactions, R5 copy/citations, R6 report/memo, R7 QA, R8 deploy. R2 sudah selesai — lihat bagian di bawah.

### R2 — hasil (20 November 2026)

- **Shell:** desktop ≥1121px tetap rail 390px + map. ≤1120px menjadi **map-first**: peta full viewport, top bar 56px, bottom sheet.
- **Sheet:** snap **peek 102px / half 46dvh / full 74dvh**. Full 74dvh dipilih agar kontrol zoom dan atribusi peta tetap terlihat di atas sheet.
- **Panel:** `Kandidat` berisi layer + shortlist; `Detail` berisi skor, faktor, statistik, kanibalisasi, memo; `Tanya` berisi copilot.
- **Keyboard:** grip = button (Enter/Space cycle, ArrowUp/Down), tabs = `role=tablist` dengan ArrowLeft/Right/Home/End. Fokus tetap di tab aktif.
- **Pemilihan:** klik kandidat → tab Detail + half + scroll ke atas. Skor di top bar → Detail.
- **Tablet:** konten sheet dibatasi 640px dan ditengahkan pada 641–1120px; 1024×768 memakai sheet, bukan rail sempit.
- **Map controls:** top-right digeser di bawah top bar; bottom-right (skala/atribusi) selalu di atas sheet. Legenda disembunyikan saat half/full.
- **Safe area:** tinggi sheet, top bar, dan bottom padding memakai `env(safe-area-inset-*)`.
- **Motion:** transisi tinggi 180ms; `prefers-reduced-motion` mematikan transisi.
- **QA otomatis:** 390×844, 360×800, 768×1024, 1024×768, 1280×800, 1440×900. `scrollWidth === viewport`, sheet/tab 44px, kontrol tidak tertutup, keyboard tab = Detail, ArrowDown = half, 0 console error.
- **Detector:** file scan 0; URL scan 360/390/768/1024/1280/1440 hanya `cream-palette` (dijustifikasi). `side-tab` pada border rail kanan di-ignore inline dengan alasan (divider layout, bukan aksen dekoratif).
- **Bukti:** `data/ui-r2/final/` (screenshot, `qa-result.json`, detector).

### R3 — hasil (20 November 2026)

- **Target 44px:** layer, chain, prompt, composer, memo button/link, memo actions, report nav, copilot toggle, state retry. Candidate row 56px; sheet tab 44px; grip 56px.
- **Tipografi:** body/control ≥12px; label uppercase 12px. Hanya count badge, unit `/100`, dan judul legenda mobile yang tetap 11px.
- **State:** loading kandidat, error kandidat + `Muat ulang`, detail kosong, loading simulasi, error simulasi + `Coba lagi`, copilot pending/error, prompt/composer disabled.
- **Semantik:** `aria-pressed` pada layer/chain/candidate, `role=status` untuk loading, `role=alert` untuk error, `role=log` untuk percakapan, focus ring input 2px.
- **Copilot:** collapsed bar di desktop (44px toggle) agar shortlist tetap terlihat; mobile Tanya selalu expanded.
- **Desktop flow:** klik kandidat → detail di-scroll ke atas rail dan menerima fokus.
- **QA:** 390/360 tanpa overflow; 44px pada semua kontrol utama; 0 console error; error/loading states disimulasikan lewat route interception.
- **Detector:** file scan 0; URL scan 360–1440 dan `/model`/memo hanya `cream-palette` (dijustifikasi). Tidak ada temuan baru.
- **Bukti:** `data/ui-r3/final/`.

### R4 — hasil (20 November 2026)

- **Label di atas data:** H3 fill/line, AOI, selected fill, dan hover fill disisipkan sebelum layer simbol pertama Positron. Nama tempat dan jalan tetap terbaca.
- **Ramp:** opasitas H3 0.5; hairline 0.14. Fill tidak lagi menenggelamkan label.
- **Selected cell:** fill forest 0.16 + outline ink 2.4px; filter mengikuti `selected.h3`. Hover cell 0.05 ink + cursor pointer.
- **Marker:** anchor 2.8px; store radius 3.6–7, stroke putih 1.4. Warna brand tetap.
- **Legend:** lima swatch skor + lima marker key di desktop; mobile tetap ringkas.
- **Kontrol:** tombol MapLibre 44px; atribusi/skala 12px.
- **Padding sheet:** bottom inset 102px (peek), 46dvh (half), 74dvh (full) mengikuti tinggi sheet, sehingga selected cell tetap di area peta yang terlihat. Full sheet menyembunyikan zoom + skala; atribusi tetap di atas sheet.
- **Resize:** `ResizeObserver` memanggil `map.resize()`; canvas 390×844 → 360×800 terverifikasi.
- **QA:** `h3BelowLabels: true`, semua layer ada, selected filter cocok, kontrol 44px, 0 console error; screenshot peek/half/full/desktop/360.
- **Detector:** static 0; URL scan hanya `cream-palette`.
- **Bukti:** `data/ui-r4/final/`.

### R5 — hasil (20 November 2026)

- **Citation chips:** jawaban memakai format `[path § heading]`; parser membuang marker dari teks dan menampilkan chip `Sumber` per heading. Hanya path `README.md`, `docs/`, dan `data/knowledge/` yang diterima; full path ada di `title`/`aria-label`.
- **Copy:** sapaan awal, prompt (5 item pendek), error, dan pending state ditulis ulang. Tidak ada “AI-powered”, kalimat pembuka cari-dokumen, atau instruksi internal di UI.
- **Markdown ringan:** `**bold**` dirender sebagai `<strong>`; bullet `-` menjadi `•`; tidak ada asterisk mentah.
- **Stop:** tombol `Hentikan` 44px meng-abort fetch; state berakhir `Jawaban dihentikan.` dan input aktif kembali.
- **QA:** 4 citation chips, teks tanpa `§`, 0 error; stop diuji dengan route delay 5 detik.
- **Bukti:** `data/ui-r5-r6/final/`.

### R6 — hasil (20 November 2026)

- **`/model` mobile:** tabel Regional CV dan Subang transfer menjadi baris label/value dengan `data-label`; tidak ada scroll horizontal. `scrollWidth = clientWidth = 358` di 390px.
- **`/model` desktop:** tabel tetap 4 kolom; tidak ada perubahan data.
- **Memo mobile:** actions `Kembali`, `Unduh PDF`, `Cetak` menjadi satu baris 44px.
- **Memo print:** `@page` A4 10mm × 12mm, body 9–10pt, spacing dirapatkan, action disembunyikan, warna dipertahankan.
- **QA:** PDF A4 **1 halaman** (pdf-lib), 0 error; memo 390 tanpa overflow.
- **Bukti:** `data/ui-r5-r6/final/` termasuk `memo-a4.pdf` dan `memo-print.png`.

### R7 — hasil (20 November 2026)

- **Lighthouse desktop:** performance **99**, accessibility **100**, best practices **100**, SEO **100**.
- **Lighthouse mobile:** performance **55**, accessibility **100**, best practices **100**, SEO **100**. Mobile performance adalah pengecualian yang didokumentasikan; bottleneck ada di boot MapLibre + vector tile pada CPU throttled, bukan layout/contrast.
- **CLS:** 0.015 Lighthouse, 0.0149 observer lokal. LCP lokal 656ms.
- **Keyboard:** 14 tab stop, semua terlihat, semua punya outline 2px; tidak ada fokus di elemen tersembunyi.
- **Struktur:** h1 tersembunyi, h2 untuk section, `role=region` pada peta, `aria-label` panel, `role=status/alert/log`, tombol 44px.
- **Copy audit:** **0 `&`**, **0 `:`** pada home, `/model`, memo, dan jawaban copilot yang diuji. Aturan copy baru masuk ke `DESIGN.md`; prompt copilot juga melarang ampersand/titik dua dan preamble.
- **Favicon:** `app/icon.svg`; error console favicon 404 hilang, best practices 100.
- **Detector:** static 0; URL scan 360/390/768/1024/1440 + model/memo hanya `cream-palette`.
- **Bukti:** `data/ui-r7/final/`.

### R8 — hasil (20 November 2026)

- **Deploy:** production Vercel, alias `https://gis-sentry.vercel.app`.
- **Basemap:** env production `NEXT_PUBLIC_BASEMAP_STYLE` dikoreksi dari dark-matter ke Positron, lalu redeploy. UI light dan peta light terverifikasi.
- **Health:** `ok:true`, `db:true`, `aiConfigured:true`.
- **API:** tile MVT 200, memo PDF 200, copilot 200.
- **UI production:** desktop light, mobile map-first + sheet, citation chips (5), model table mobile tanpa overflow, memo copy `dan` tanpa `&`/`:`.
- **Fix production:** hydration mismatch tanggal diperbaiki dengan timezone `Asia/Jakarta`; console error production 0.
- **Favicon:** 200.
- **RAG index:** diregenerasi sebelum deploy.
- **Bukti:** `data/ui-r8/final/` (screenshot production + `qa-prod-result.json`).

---

## Aturan anti-slop (mengikat)

**Dilarang:**
- Gradient, glassmorphism, blur dekoratif, neon glow, drop shadow pada kartu.
- Emoji sebagai ikon; sparkle/AI magic; purple-blue AI gradient.
- Card soup: setiap baris jadi kartu dengan radius 16–24px.
- Teks 9–10px; label all-caps di mana-mana; line-height <1.4 untuk body.
- Floating chat bubble yang menutupi peta; panel copilot permanen di mobile.
- Copy generik: “Seamlessly”, “Unlock”, “Supercharge”, “Revolutionize”, “AI-powered” tanpa bukti.
- Dark mode toggle. Light-only berarti **hanya light**.

**Diwajibkan:**
- Satu aksen; border 1px; hierarki lewat ukuran/berat/spacing, bukan warna-warni.
- Angka data memakai mono/tabular; satuan dan sumber jelas.
- Empty/loading/error state nyata, bukan spinner selamanya.
- Setiap klaim AI punya tool/source; setiap skor punya dekomposisi.
- Atribusi OSM/Overture/CARTO tetap terlihat.

---

## Responsif

| Breakpoint | Perilaku |
|---|---|
| **≥1121px** | Rail kiri 390px (identitas, layer, kandidat, detail, copilot collapsed default), map mengisi sisa |
| **641–1120px** | Map full viewport; top bar; bottom sheet dengan konten maksimum 640px ditengahkan; tab `Kandidat · Detail · Tanya` |
| **≤640px** | Map full viewport; top bar; bottom sheet full width; snap peek 102px / half 46dvh / full 74dvh; safe-area |
| **360×800** | Tidak ada horizontal scroll; sheet & tab ≥44px; kontrol peta dan atribusi tidak tertutup sheet |

Sheet meng-overlay peta, jadi ukuran canvas tidak berubah; padding bawah peta mengikuti tinggi sheet (102px / 46dvh / 74dvh) agar selected cell tetap terlihat. Pada full sheet, zoom dan skala disembunyikan; atribusi tetap terlihat. `ResizeObserver` tetap memanggil `map.resize()` saat container berubah (mis. rotasi).

---

## Yang tidak boleh berubah

- Data, API, skor weighted-v1, simulasi kanibalisasi, memo facts, sitasi RAG.
- Model produksi tetap weighted-v1; ML tetap dievaluasi, bukan dipakai.
- Tidak menambah klaim, metrik, atau fitur baru dalam refactor visual ini.
- Tidak mengubah attribution/license.

---

## Definition of done

- [x] Semua layar light-only; tidak ada token/kelas dark.
- [x] Ikon flat Lucide; tidak ada emoji/dot dekoratif.
- [x] Tidak ada gradient/glass/glow/shadow kartu.
- [x] IBM Plex Sans/Mono self-host; teks minimum 11–12px; tabular data.
- [x] Responsif 360/390/768/1024/1280/1440; map-first di ≤1120px.
- [x] Komponen inti: target 44px, focus visible, loading/error/empty, disabled, `aria-pressed`.
- [x] Map surface: label di atas H3, selected cell, marker, legend, kontrol 44px, padding sheet, resize.
- [x] Copilot: citation chips, stop, pending/error, copy tanpa AI-slop.
- [x] Report/memo: tabel responsif, memo A4 1 halaman.
- [x] A11y AA; keyboard; focus visible; reduced motion. **Lighthouse a11y 100; 14 tab stop teruji.**
- [x] `npm run build` lolos; production health/tile/memo/copilot tetap 200. **(live R8)**
- [x] Impeccable detector bersih atau setiap temuan dijustifikasi. **(sisa `cream-palette`, dijustifikasi)**
- [x] Screenshot before/after disimpan untuk portfolio. **(`data/ui-r1/final/`, `data/ui-r2/final/`, `data/ui-r3/final/`, `data/ui-r4/final/`, `data/ui-r5-r6/final/`)**

### Pengecualian yang disengaja

`cream-palette` tetap dipakai. Latar `#F5F2EA` adalah keputusan arah visual user (paper/ink), bukan default “tasteful” tanpa alasan. Warna ini juga yang membuat peta Positron dan tint forest terbaca sebagai satu sistem. Jangan diganti tanpa keputusan produk baru.
