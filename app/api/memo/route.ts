import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { getMemoData } from "@/lib/memo";

export const runtime = "nodejs";
export const maxDuration = 60;

const INK = rgb(0.106, 0.129, 0.11);
const MUTED = rgb(0.384, 0.424, 0.392);
const GREEN = rgb(0.122, 0.42, 0.31);
const GREEN_SOFT = rgb(0.894, 0.933, 0.91);
const AMBER = rgb(0.541, 0.353, 0.071);
const RED = rgb(0.631, 0.231, 0.196);
const INFO = rgb(0.192, 0.369, 0.478);
const LINE = rgb(0.855, 0.835, 0.784);
const SURFACE_2 = rgb(0.969, 0.957, 0.925);
const WHITE = rgb(1, 1, 1);

async function loadFont(
  pdf: PDFDocument,
  filename: string,
  fallback: StandardFonts,
): Promise<PDFFont> {
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "public", "fonts", filename),
    );
    return await pdf.embedFont(bytes, { subset: true });
  } catch {
    return pdf.embedFont(fallback);
  }
}

function wrap(
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  text: string,
  size: number,
  maxWidth: number,
) {
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
    return Response.json(
      { error: "Parameter h3 wajib diisi." },
      { status: 400 },
    );
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
        {
          error:
            "Memo butuh PostGIS. Jalankan docker compose dan npm run db:seed.",
        },
        { status: 503 },
      );
    }
    console.error("memo data failed", error);
    return Response.json({ error: "Memo gagal dibuat." }, { status: 500 });
  }

  if (!data) {
    return Response.json(
      { error: `H3 ${h3} tidak ditemukan.` },
      { status: 404 },
    );
  }

  const { site, affected, gross, net, cannibalization, recommendation } = data;
  const level =
    site.score >= 75 && net >= 60
      ? "prioritas"
      : site.score >= 50 && net >= 40
        ? "pertimbangkan"
        : "tunda";
  const levelLabel =
    level === "prioritas"
      ? "PRIORITAS"
      : level === "pertimbangkan"
        ? "PERTIMBANGKAN"
        : "TUNDA";

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Decision memo H3 ${h3}`);
  pdf.setAuthor("GIS Sentry");
  pdf.setSubject("Site screening memo");
  pdf.setCreator("GIS Sentry");
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([595.28, 841.89]);
  const font = await loadFont(
    pdf,
    "IBMPlexSans-Regular.ttf",
    StandardFonts.Helvetica,
  );
  const bold = await loadFont(
    pdf,
    "IBMPlexSans-SemiBold.ttf",
    StandardFonts.HelveticaBold,
  );
  const mono = await loadFont(
    pdf,
    "IBMPlexMono-Regular.ttf",
    StandardFonts.Courier,
  );
  const monoBold = await loadFont(
    pdf,
    "IBMPlexMono-Medium.ttf",
    StandardFonts.CourierBold,
  );
  const { width, height } = page.getSize();
  const margin = 46;

  // Header
  page.drawRectangle({
    x: 0,
    y: height - 5,
    width,
    height: 5,
    color: GREEN,
  });
  page.drawRectangle({
    x: margin,
    y: height - 48,
    width: 24,
    height: 24,
    color: GREEN,
  });
  page.drawText("GS", {
    x: margin + 5.5,
    y: height - 42,
    size: 8,
    font: bold,
    color: WHITE,
  });
  page.drawText("GIS SENTRY", {
    x: margin + 34,
    y: height - 34,
    size: 11,
    font: bold,
    color: INK,
  });
  page.drawText("Decision memo · Site screening", {
    x: margin + 34,
    y: height - 46,
    size: 7.5,
    font,
    color: MUTED,
  });
  const dateLabel = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  page.drawText(dateLabel, {
    x: width - margin - mono.widthOfTextAtSize(dateLabel, 8),
    y: height - 34,
    size: 8,
    font: mono,
    color: MUTED,
  });
  page.drawText("Persentil relatif AOI, bukan prediksi profit.", {
    x: margin,
    y: height - 66,
    size: 8,
    font,
    color: MUTED,
  });
  page.drawLine({
    start: { x: margin, y: height - 78 },
    end: { x: width - margin, y: height - 78 },
    thickness: 0.7,
    color: LINE,
  });

  let y = height - 102;

  const badgeWidth = bold.widthOfTextAtSize(levelLabel, 7.5) + 18;
  page.drawRectangle({
    x: width - margin - badgeWidth,
    y: y - 5.5,
    width: badgeWidth,
    height: 17,
    color:
      level === "prioritas"
        ? GREEN_SOFT
        : level === "pertimbangkan"
          ? rgb(0.961, 0.918, 0.847)
          : rgb(0.965, 0.89, 0.878),
    borderColor:
      level === "prioritas" ? GREEN : level === "pertimbangkan" ? AMBER : RED,
    borderWidth: 0.6,
  });
  page.drawText(levelLabel, {
    x: width - margin - badgeWidth + 9,
    y,
    size: 7.5,
    font: bold,
    color:
      level === "prioritas" ? GREEN : level === "pertimbangkan" ? AMBER : RED,
  });

  // Location block
  page.drawText("LOKASI DAN JARINGAN", {
    x: margin,
    y,
    size: 8.5,
    font: bold,
    color: GREEN,
  });
  y -= 16;
  page.drawText(`H3 ${site.h3}`, {
    x: margin,
    y,
    size: 11,
    font: monoBold,
    color: INK,
  });
  y -= 14;
  page.drawText(
    `${round(site.lat, 6)}, ${round(site.lng, 6)}  ·  Jaringan ${chain}`,
    {
      x: margin,
      y,
      size: 8.5,
      font: mono,
      color: MUTED,
    },
  );
  y -= 26;

  // Score hero
  page.drawRectangle({
    x: margin,
    y: y - 64,
    width: width - margin * 2,
    height: 72,
    color: SURFACE_2,
    borderColor: LINE,
    borderWidth: 0.8,
  });
  page.drawText(gross.toFixed(1), {
    x: margin + 16,
    y: y - 42,
    size: 38,
    font: bold,
    color: GREEN,
  });
  page.drawText("/100", {
    x: margin + 16 + bold.widthOfTextAtSize(gross.toFixed(1), 38) + 3,
    y: y - 40,
    size: 9,
    font: mono,
    color: MUTED,
  });
  page.drawText("Skor kelayakan · persentil AOI", {
    x: margin + 200,
    y: y - 27,
    size: 9.5,
    font: bold,
    color: INK,
  });
  page.drawText(
    `Demand ${Math.round(site.demand)} · Kompetisi ${Math.round(site.competition)} · Akses ${Math.round(site.access)} · Risiko ${Math.round(site.risk)}`,
    {
      x: margin + 200,
      y: y - 47,
      size: 8.5,
      font,
      color: MUTED,
    },
  );
  y -= 90;

  // Factor bars
  page.drawText("DEKOMPOSISI SKOR", {
    x: margin,
    y,
    size: 8.5,
    font: bold,
    color: GREEN,
  });
  const weights = "bobot 45 · 25 · 20 · 10";
  page.drawText(weights, {
    x: width - margin - mono.widthOfTextAtSize(weights, 7.5),
    y,
    size: 7.5,
    font: mono,
    color: MUTED,
  });
  y -= 16;
  const bars = [
    { label: "Demand", value: Number(site.demand), color: GREEN },
    { label: "Kompetisi", value: Number(site.competition), color: AMBER },
    { label: "Akses", value: Number(site.access), color: INFO },
    { label: "Risiko", value: Number(site.risk), color: RED },
  ];
  for (const bar of bars) {
    page.drawText(bar.label, {
      x: margin,
      y: y - 1,
      size: 9,
      font,
      color: MUTED,
    });
    const trackX = margin + 72;
    const trackW = width - margin * 2 - 112;
    page.drawRectangle({
      x: trackX,
      y,
      width: trackW,
      height: 7,
      color: rgb(0.922, 0.902, 0.855),
    });
    page.drawRectangle({
      x: trackX,
      y,
      width: Math.max(
        1,
        (Math.min(100, Math.max(0, bar.value)) / 100) * trackW,
      ),
      height: 7,
      color: bar.color,
    });
    const val = String(Math.round(bar.value));
    page.drawText(val, {
      x: width - margin - monoBold.widthOfTextAtSize(val, 9),
      y: y - 1,
      size: 9,
      font: monoBold,
      color: INK,
    });
    y -= 17;
  }
  y -= 12;

  // Context table
  page.drawText("KONTEKS SPASIAL", {
    x: margin,
    y,
    size: 8.5,
    font: bold,
    color: GREEN,
  });
  y -= 16;
  const stats = [
    [
      "Populasi ≤ 1,5 km",
      Number(site.population_1_5km).toLocaleString("id-ID"),
    ],
    ["Anchor ≤ 1,5 km", String(site.anchors_1_5km)],
    ["Gerai ≤ 1 km", String(site.stores_1km)],
    ["Gerai terdekat", `${site.nearest_store_km ?? "—"} km`],
    ["Jalan arteri terdekat", `${site.nearest_road_km ?? "—"} km`],
    ["Jarak dari pusat kota", `${site.dist_center_km} km`],
  ];
  for (let i = 0; i < stats.length; i += 2) {
    const left = stats[i];
    const right = stats[i + 1];
    page.drawText(left[0], { x: margin, y, size: 8.5, font, color: MUTED });
    page.drawText(left[1], {
      x: margin + 150,
      y,
      size: 9,
      font: monoBold,
      color: INK,
    });
    if (right) {
      page.drawText(right[0], {
        x: margin + 285,
        y,
        size: 8.5,
        font,
        color: MUTED,
      });
      page.drawText(right[1], {
        x: margin + 430,
        y,
        size: 9,
        font: monoBold,
        color: INK,
      });
    }
    y -= 16;
  }
  y -= 10;

  // Cannibalization
  page.drawText("SIMULASI KANIBALISASI", {
    x: margin,
    y,
    size: 8.5,
    font: bold,
    color: GREEN,
  });
  y -= 16;
  page.drawText(`Jaringan ${chain} · buffer radial 3 km`, {
    x: margin,
    y,
    size: 8.5,
    font,
    color: MUTED,
  });
  y -= 16;
  page.drawText(`Gross ${gross.toFixed(1)}  →  Net ${net.toFixed(1)}`, {
    x: margin,
    y,
    size: 12,
    font: monoBold,
    color: cannibalization > 0.5 ? RED : GREEN,
  });
  page.drawText(`${Math.round(cannibalization * 100)}% terkikis`, {
    x: margin + 230,
    y,
    size: 9.5,
    font: monoBold,
    color: cannibalization > 0.5 ? RED : MUTED,
  });
  y -= 17;
  if (affected.length > 0) {
    for (const store of affected.slice(0, 3)) {
      page.drawText(
        `• ${store.brand} — ${store.name || "(tanpa nama)"} · ${store.distanceM} m · overlap ${Math.round(store.overlap * 100)}%`,
        {
          x: margin + 4,
          y,
          size: 8.2,
          font,
          color: MUTED,
        },
      );
      y -= 13;
    }
  } else {
    page.drawText("Tidak ada gerai brand yang sama dalam 3 km. Net = gross.", {
      x: margin + 4,
      y,
      size: 8.2,
      font,
      color: MUTED,
    });
    y -= 13;
  }
  y -= 10;

  // Recommendation
  page.drawText("REKOMENDASI", {
    x: margin,
    y,
    size: 8.5,
    font: bold,
    color: GREEN,
  });
  y -= 16;
  for (const line of wrap(font, recommendation, 9, width - margin * 2)) {
    page.drawText(line, { x: margin, y, size: 9, font, color: INK });
    y -= 13;
  }
  y -= 10;

  // Next steps
  page.drawText("LANGKAH BERIKUTNYA", {
    x: margin,
    y,
    size: 8.5,
    font: bold,
    color: GREEN,
  });
  y -= 17;
  const nextSteps = [
    "Verifikasi zonasi dan RDTR di dinas tata ruang setempat.",
    "Cek risiko banjir InaRISK dan kondisi drainase sekitar lokasi.",
    "Survei lapangan arus pejalan kaki, parkir, dan jam sibuk.",
    "Minta penawaran sewa dan bandingkan dengan dua kandidat lain.",
  ];
  nextSteps.forEach((step, index) => {
    page.drawText(`${index + 1}.`, {
      x: margin,
      y,
      size: 8,
      font: mono,
      color: GREEN,
    });
    page.drawText(step, {
      x: margin + 14,
      y,
      size: 8,
      font,
      color: MUTED,
    });
    y -= 12.5;
  });
  y -= 8;

  // Caveats
  page.drawText("CATATAN DAN BATASAN", {
    x: margin,
    y,
    size: 8.5,
    font: bold,
    color: GREEN,
  });
  y -= 16;
  const caveats = [
    "Skor adalah persentil relatif di AOI 10 km, bukan probabilitas profit.",
    "Kanibalisasi memakai buffer radial 3 km + distance decay kuadratik; belum isochrone.",
    "Risiko banjir/zonasi masih placeholder; wajib verifikasi InaRISK/RDTR dan dinas terkait.",
    "Data populasi WorldPop 2020; kalibrasi BPS per kecamatan belum dilakukan.",
    "Model produksi weighted-v1. LightGBM dievaluasi tetapi tidak dipakai karena gagal transfer Subang (lihat /model).",
  ];
  for (const caveat of caveats) {
    const lines = wrap(font, `• ${caveat}`, 8, width - margin * 2);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size: 8, font, color: MUTED });
      y -= 11.5;
    }
    y -= 3;
  }

  // Footer
  page.drawLine({
    start: { x: margin, y: 54 },
    end: { x: width - margin, y: 54 },
    thickness: 0.6,
    color: LINE,
  });
  page.drawText(
    "Sumber OpenStreetMap (ODbL), WorldPop 2020, Overture Places (CDLA-P).",
    {
      x: margin,
      y: 40,
      size: 7,
      font,
      color: MUTED,
    },
  );
  const stamp = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  page.drawText(`Dibuat ${stamp} WIB`, {
    x: margin,
    y: 30,
    size: 6.5,
    font: mono,
    color: MUTED,
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
