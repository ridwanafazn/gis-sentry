import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getMemoData } from "@/lib/memo";

export const runtime = "nodejs";
export const maxDuration = 60;

const INK = rgb(0.09, 0.13, 0.17);
const MUTED = rgb(0.38, 0.45, 0.52);
const GREEN = rgb(0.13, 0.65, 0.45);
const GREEN_SOFT = rgb(0.9, 0.97, 0.94);
const AMBER = rgb(0.85, 0.55, 0.05);
const RED = rgb(0.78, 0.22, 0.28);
const LINE = rgb(0.86, 0.89, 0.92);
const WHITE = rgb(1, 1, 1);

function wrap(font: { widthOfTextAtSize: (t: string, s: number) => number }, text: string, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const h3 = params.get("h3");
  const chain = params.get("chain") ?? "Alfamart";

  if (!h3) {
    return Response.json({ error: "Parameter h3 wajib diisi." }, { status: 400 });
  }
  if (!["Alfamart", "Indomaret"].includes(chain)) {
    return Response.json(
      { error: "Chain harus Alfamart atau Indomaret." },
      { status: 400 },
    );
  }

  let data;
  try {
    data = await getMemoData(h3, chain);
  } catch (error) {
    if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") {
      return Response.json(
        { error: "Memo butuh PostGIS. Jalankan docker compose dan npm run db:seed." },
        { status: 503 },
      );
    }
    console.error("memo data failed", error);
    return Response.json({ error: "Memo gagal dibuat." }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: `H3 ${h3} tidak ditemukan.` }, { status: 404 });
  }

  const { site, affected, gross, net, cannibalization, recommendation } = data;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 46;

  // Header
  page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: rgb(0.05, 0.09, 0.12) });
  page.drawText("GIS SENTRY", {
    x: margin,
    y: height - 44,
    size: 20,
    font: bold,
    color: WHITE,
  });
  page.drawText("Decision Memo — Site Screening", {
    x: margin,
    y: height - 63,
    size: 9.5,
    font,
    color: rgb(0.66, 0.76, 0.84),
  });
  const dateLabel = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  page.drawText(dateLabel, {
    x: width - margin - font.widthOfTextAtSize(dateLabel, 9),
    y: height - 44,
    size: 9,
    font,
    color: rgb(0.66, 0.76, 0.84),
  });
  page.drawText("Bukan prediksi profit. Skor = persentil relatif AOI.", {
    x: margin,
    y: height - 79,
    size: 7.5,
    font,
    color: rgb(0.52, 0.64, 0.73),
  });

  let y = height - 124;

  // Location block
  page.drawText("LOKASI & JARINGAN", { x: margin, y, size: 8, font: bold, color: GREEN });
  y -= 16;
  page.drawText(`H3 ${site.h3}`, { x: margin, y, size: 12, font: bold, color: INK });
  y -= 14;
  page.drawText(`${round(site.lat, 6)}, ${round(site.lng, 6)}  ·  Jaringan: ${chain}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: MUTED,
  });
  y -= 24;

  // Score hero
  page.drawRectangle({
    x: margin,
    y: y - 58,
    width: width - margin * 2,
    height: 64,
    color: GREEN_SOFT,
    borderColor: rgb(0.78, 0.9, 0.84),
    borderWidth: 0.8,
  });
  page.drawText(String(Math.round(gross)), {
    x: margin + 16,
    y: y - 38,
    size: 34,
    font: bold,
    color: rgb(0.05, 0.36, 0.24),
  });
  page.drawText("/100", {
    x: margin + 16 + bold.widthOfTextAtSize(String(Math.round(gross)), 34) + 3,
    y: y - 36,
    size: 10,
    font,
    color: rgb(0.35, 0.5, 0.42),
  });
  page.drawText("Skor kelayakan (persentil AOI)", {
    x: margin + 100,
    y: y - 24,
    size: 9,
    font: bold,
    color: INK,
  });
  page.drawText(`Demand ${Math.round(site.demand)} · Kompetisi ${Math.round(site.competition)} · Akses ${Math.round(site.access)} · Risiko ${Math.round(site.risk)}`, {
    x: margin + 100,
    y: y - 39,
    size: 8,
    font,
    color: MUTED,
  });
  y -= 82;

  // Factor bars
  page.drawText("DEKOMPOSISI SKOR", { x: margin, y, size: 8, font: bold, color: GREEN });
  y -= 14;
  const bars = [
    { label: "Demand", value: Number(site.demand), color: GREEN },
    { label: "Kompetisi", value: Number(site.competition), color: AMBER },
    { label: "Akses", value: Number(site.access), color: rgb(0.13, 0.55, 0.8) },
    { label: "Risiko", value: Number(site.risk), color: RED },
  ];
  for (const bar of bars) {
    page.drawText(bar.label, { x: margin, y: y - 1, size: 8.5, font, color: MUTED });
    const trackX = margin + 70;
    const trackW = width - margin * 2 - 110;
    page.drawRectangle({ x: trackX, y: y, width: trackW, height: 6, color: rgb(0.92, 0.94, 0.95) });
    page.drawRectangle({
      x: trackX,
      y: y,
      width: Math.max(1, (Math.min(100, Math.max(0, bar.value)) / 100) * trackW),
      height: 6,
      color: bar.color,
    });
    const val = String(Math.round(bar.value));
    page.drawText(val, {
      x: width - margin - font.widthOfTextAtSize(val, 8.5),
      y: y - 1,
      size: 8.5,
      font: bold,
      color: INK,
    });
    y -= 15;
  }
  y -= 6;

  // Context table
  page.drawText("KONTEKS SPASIAL", { x: margin, y, size: 8, font: bold, color: GREEN });
  y -= 14;
  const stats = [
    ["Populasi <= 1,5 km", Number(site.population_1_5km).toLocaleString("id-ID")],
    ["Anchor <= 1,5 km", String(site.anchors_1_5km)],
    ["Gerai <= 1 km", String(site.stores_1km)],
    ["Gerai terdekat", `${site.nearest_store_km ?? "—"} km`],
    ["Jalan arteri terdekat", `${site.nearest_road_km ?? "—"} km`],
    ["Jarak dari pusat kota", `${site.dist_center_km} km`],
  ];
  for (let i = 0; i < stats.length; i += 2) {
    const left = stats[i];
    const right = stats[i + 1];
    page.drawText(left[0], { x: margin, y, size: 8, font, color: MUTED });
    page.drawText(left[1], { x: margin + 150, y, size: 8.5, font: bold, color: INK });
    if (right) {
      page.drawText(right[0], { x: margin + 285, y, size: 8, font, color: MUTED });
      page.drawText(right[1], { x: margin + 430, y, size: 8.5, font: bold, color: INK });
    }
    y -= 14;
  }
  y -= 4;

  // Cannibalization
  page.drawText("SIMULASI KANIBALISASI", { x: margin, y, size: 8, font: bold, color: GREEN });
  y -= 14;
  page.drawText(`Jaringan ${chain} · buffer radial 3 km`, { x: margin, y, size: 8, font, color: MUTED });
  y -= 14;
  page.drawText(`Gross ${Math.round(gross)}   ->   Net ${Math.round(net)}`, {
    x: margin,
    y,
    size: 11,
    font: bold,
    color: cannibalization > 0.5 ? RED : GREEN,
  });
  page.drawText(`${Math.round(cannibalization * 100)}% terkikis`, {
    x: margin + 230,
    y,
    size: 9,
    font: bold,
    color: cannibalization > 0.5 ? RED : MUTED,
  });
  y -= 15;
  if (affected.length > 0) {
    for (const store of affected.slice(0, 3)) {
      page.drawText(`• ${store.brand} — ${store.name || "(tanpa nama)"} · ${store.distanceM} m · overlap ${Math.round(store.overlap * 100)}%`, {
        x: margin + 4,
        y,
        size: 7.8,
        font,
        color: MUTED,
      });
      y -= 12;
    }
  } else {
    page.drawText("Tidak ada gerai brand yang sama dalam 3 km. Net = gross.", {
      x: margin + 4,
      y,
      size: 7.8,
      font,
      color: MUTED,
    });
    y -= 12;
  }
  y -= 6;

  // Recommendation
  page.drawText("REKOMENDASI", { x: margin, y, size: 8, font: bold, color: GREEN });
  y -= 14;
  for (const line of wrap(font, recommendation, 8.5, width - margin * 2)) {
    page.drawText(line, { x: margin, y, size: 8.5, font, color: INK });
    y -= 12;
  }
  y -= 6;

  // Caveats
  page.drawText("CATATAN & BATASAN", { x: margin, y, size: 8, font: bold, color: GREEN });
  y -= 14;
  const caveats = [
    "Skor adalah persentil relatif di AOI 10 km, bukan probabilitas profit.",
    "Kanibalisasi memakai buffer radial 3 km + distance decay kuadratik; belum isochrone.",
    "Risiko banjir/zonasi masih placeholder; wajib verifikasi InaRISK/RDTR dan dinas terkait.",
    "Data populasi WorldPop 2020; kalibrasi BPS per kecamatan belum dilakukan.",
    "Model produksi: weighted-v1. LightGBM dievaluasi tetapi tidak dipakai karena gagal transfer Subang (lihat /model).",
  ];
  for (const caveat of caveats) {
    const lines = wrap(font, `• ${caveat}`, 7.5, width - margin * 2);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size: 7.5, font, color: MUTED });
      y -= 10.5;
    }
    y -= 2;
  }

  // Footer
  page.drawLine({
    start: { x: margin, y: 54 },
    end: { x: width - margin, y: 54 },
    thickness: 0.6,
    color: LINE,
  });
  page.drawText("Sumber: OpenStreetMap (ODbL), WorldPop 2020, Overture Places (CDLA-P).", {
    x: margin,
    y: 40,
    size: 7,
    font,
    color: MUTED,
  });
  page.drawText(`Digenerate ${new Date().toISOString()}`, {
    x: margin,
    y: 30,
    size: 6.5,
    font,
    color: rgb(0.55, 0.6, 0.65),
  });

  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="gis-sentry-memo-${h3}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
