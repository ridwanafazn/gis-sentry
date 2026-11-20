import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fromFile, fromUrl } from "geotiff";
import { latLngToCell } from "h3-js";

const WORLD_POP_URL =
  "https://data.worldpop.org/GIS/Population/Global_2000_2020_Constrained/2020/BSGM/IDN/idn_ppp_2020_constrained.tif";

const CENTER = { lat: -6.5716, lng: 107.7583 };
const RADIUS_KM = 10;
const PAD_DEG = 0.02;
const H3_RES = 9;

const REGENCY_BBOX = { west: 107.25, south: -6.95, east: 108.0, north: -6.15 };
const IS_REGENCY = process.argv.includes("--regency");

const OUT_DIR = path.join(process.cwd(), "data", "population");
const PUBLIC_DATA = path.join(process.cwd(), "public", "data");

function bboxForRadius(lat, lng, radiusKm, padDeg) {
  const dLat = radiusKm / 110.574;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    west: lng - dLng - padDeg,
    east: lng + dLng + padDeg,
    south: lat - dLat - padDeg,
    north: lat + dLat + padDeg,
  };
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const LOCAL_TIFF = path.join(OUT_DIR, "idn_ppp_2020_constrained.tif");

let tiff;
try {
  await access(LOCAL_TIFF);
  console.log(`[pop] memakai raster lokal ${LOCAL_TIFF}`);
  tiff = await fromFile(LOCAL_TIFF);
} catch {
  console.log("[pop] raster lokal tidak ada — membuka WorldPop via HTTP range…");
  tiff = await fromUrl(WORLD_POP_URL);
}

const image = await tiff.getImage();

const imageBbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]
const [resX, resY] = image.getResolution();
const originX = imageBbox[0];
const originY = imageBbox[3];
const width = image.getWidth();
const height = image.getHeight();

console.log(
  `[pop] raster ${width}x${height}, resolusi ${resX.toFixed(7)}, ${resY.toFixed(7)}`,
);

const bbox = IS_REGENCY
  ? REGENCY_BBOX
  : bboxForRadius(CENTER.lat, CENTER.lng, RADIUS_KM, PAD_DEG);

const x0 = Math.max(0, Math.floor((bbox.west - originX) / resX));
const x1 = Math.min(width, Math.ceil((bbox.east - originX) / resX));
const y0 = Math.max(0, Math.floor((originY - bbox.north) / Math.abs(resY)));
const y1 = Math.min(height, Math.ceil((originY - bbox.south) / Math.abs(resY)));

const winW = x1 - x0;
const winH = y1 - y0;

if (winW <= 0 || winH <= 0) {
  throw new Error("Window raster kosong — cek bbox/resolusi.");
}

console.log(`[pop] membaca window ${winW}x${winH} px (${x0},${y0}) → (${x1},${y1})`);

const rasters = await image.readRasters({
  window: [x0, y0, x1, y1],
  samples: [0],
  interleave: false,
});

const band = rasters[0];
const population = new Map();
let total = 0;
let pixels = 0;
let maxPixel = 0;

for (let row = 0; row < winH; row += 1) {
  const lat = originY + (y0 + row + 0.5) * resY;
  for (let col = 0; col < winW; col += 1) {
    const value = Number(band[row * winW + col]);
    if (!Number.isFinite(value) || value <= 0 || value > 10000) continue;

    const lng = originX + (x0 + col + 0.5) * resX;
    if (!IS_REGENCY && distanceKm(CENTER.lat, CENTER.lng, lat, lng) > RADIUS_KM + 0.6) {
      continue;
    }

    const h3 = latLngToCell(lat, lng, H3_RES);
    population.set(h3, (population.get(h3) ?? 0) + value);
    total += value;
    pixels += 1;
    if (value > maxPixel) maxPixel = value;
  }
}

await mkdir(OUT_DIR, { recursive: true });
const payload = {
  generatedAt: new Date().toISOString(),
  source: "WorldPop 2020 constrained 100m (UN-adjusted)",
  url: WORLD_POP_URL,
  region: IS_REGENCY ? "regency" : "aoi",
  center: CENTER,
  radiusKm: IS_REGENCY ? null : RADIUS_KM,
  bbox,
  h3Resolution: H3_RES,
  totalPopulation: Math.round(total),
  pixels,
  maxPixelPopulation: Math.round(maxPixel * 100) / 100,
  cells: Object.fromEntries(
    [...population.entries()].map(([h3, value]) => [h3, Math.round(value * 100) / 100]),
  ),
};

const populationFile = IS_REGENCY
  ? "h3-population-regency.json"
  : "h3-population.json";

await writeFile(
  path.join(OUT_DIR, populationFile),
  JSON.stringify(payload, null, 2),
  "utf8",
);

await mkdir(PUBLIC_DATA, { recursive: true });
await writeFile(
  path.join(
    PUBLIC_DATA,
    IS_REGENCY ? "population-summary-regency.json" : "population-summary.json",
  ),
  JSON.stringify(
    {
      source: payload.source,
      totalPopulation: payload.totalPopulation,
      cells: Object.keys(payload.cells).length,
      radiusKm: RADIUS_KM,
      generatedAt: payload.generatedAt,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  `[ok] ${Object.keys(payload.cells).length} sel H3 berpopulasi, total ${payload.totalPopulation.toLocaleString("id-ID")} jiwa`,
);
