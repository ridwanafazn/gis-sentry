import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cellToBoundary,
  cellToLatLng,
  gridDisk,
  latLngToCell,
} from "h3-js";

const ROOT = process.cwd();
const RAW = path.join(ROOT, "data", "osm");
const PUBLIC_DATA = path.join(ROOT, "public", "data");

const CENTER = { lat: -6.5716, lng: 107.7583 };
const RADIUS_KM = 10;
const H3_RES = 9;

function detectBrand(tags) {
  const haystack = `${tags.brand ?? ""} ${tags.name ?? ""} ${tags.operator ?? ""}`.toLowerCase();
  if (haystack.includes("indomaret")) return "Indomaret";
  if (haystack.includes("alfamidi")) return "Alfamidi";
  if (haystack.includes("alfamart")) return "Alfamart";
  return "Lainnya";
}

function toPointFeatures(json, kind) {
  const features = [];

  for (const element of json.elements ?? []) {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (lat == null || lng == null) continue;

    const tags = element.tags ?? {};
    const brand = detectBrand(tags);

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id: `${element.type}/${element.id}`,
        kind,
        name: tags.name ?? "",
        brand,
        category: tags.shop ?? tags.amenity ?? tags.railway ?? "unknown",
        operator: tags.operator ?? "",
      },
    });
  }

  return features;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function normalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-9) return values.map(() => 0);
  return values.map((v) => (v - min) / (max - min));
}

function round(n, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function toHexPolygon(h3) {
  const ring = cellToBoundary(h3).map(([lat, lng]) => [lng, lat]);
  ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

await mkdir(PUBLIC_DATA, { recursive: true });

const [convenienceRaw, anchorsRaw] = await Promise.all([
  readFile(path.join(RAW, "convenience-aoi.json"), "utf8").then(JSON.parse),
  readFile(path.join(RAW, "anchors-aoi.json"), "utf8").then(JSON.parse),
]);

const stores = toPointFeatures(convenienceRaw, "store");
const anchors = toPointFeatures(anchorsRaw, "anchor");

const branded = stores.filter((s) => s.properties.brand !== "Lainnya").length;

// H3 grid: res 9, clipped to a 10 km radius.
const centerCell = latLngToCell(CENTER.lat, CENTER.lng, H3_RES);
const candidateCells = gridDisk(centerCell, 45).filter((h3) => {
  const [lat, lng] = cellToLatLng(h3);
  return haversineKm(CENTER.lat, CENTER.lng, lat, lng) <= RADIUS_KM;
});

const rawScores = candidateCells.map((h3) => {
  const [lat, lng] = cellToLatLng(h3);
  const distCenter = haversineKm(CENTER.lat, CENTER.lng, lat, lng);

  let storeCount1km = 0;
  let nearestStoreKm = Infinity;
  for (const store of stores) {
    const [sLng, sLat] = store.geometry.coordinates;
    const d = haversineKm(lat, lng, sLat, sLng);
    if (d <= 1) storeCount1km += 1;
    if (d < nearestStoreKm) nearestStoreKm = d;
  }

  let anchorCount15 = 0;
  for (const anchor of anchors) {
    const [aLng, aLat] = anchor.geometry.coordinates;
    if (haversineKm(lat, lng, aLat, aLng) <= 1.5) anchorCount15 += 1;
  }

  return {
    h3,
    lat,
    lng,
    distCenter,
    storeCount1km,
    nearestStoreKm: Number.isFinite(nearestStoreKm) ? nearestStoreKm : null,
    anchorCount15,
    demandRaw: 0.6 * anchorCount15 + 0.4 * (1 - distCenter / RADIUS_KM),
    competitionRaw: storeCount1km + 0.25 * Math.exp(-(nearestStoreKm ?? 10) / 0.75),
    accessRaw: 1 - distCenter / RADIUS_KM,
  };
});

const demandNorm = normalize(rawScores.map((r) => r.demandRaw));
const competitionNorm = normalize(rawScores.map((r) => r.competitionRaw));
const accessNorm = normalize(rawScores.map((r) => r.accessRaw));

const withRaw = rawScores.map((r, i) => ({
  ...r,
  demandNorm: demandNorm[i],
  competitionNorm: competitionNorm[i],
  accessNorm: accessNorm[i],
  modelRaw:
    0.5 * demandNorm[i] +
    0.2 * accessNorm[i] -
    0.3 * competitionNorm[i],
}));

const modelNorm = normalize(withRaw.map((r) => r.modelRaw));

const cells = withRaw.map((r, i) => ({
  type: "Feature",
  geometry: toHexPolygon(r.h3),
  properties: {
    h3: r.h3,
    score: round(modelNorm[i] * 100),
    demand: round(demandNorm[i] * 100),
    competition: round(competitionNorm[i] * 100),
    access: round(accessNorm[i] * 100),
    risk: 0,
    stores_1km: r.storeCount1km,
    anchors_1_5km: r.anchorCount15,
    nearest_store_km: r.nearestStoreKm == null ? null : round(r.nearestStoreKm, 2),
    dist_center_km: round(r.distCenter, 2),
    lat: round(r.lat, 6),
    lng: round(r.lng, 6),
    model: "demo-heuristic-v0",
  },
}));

const topSites = cells
  .filter((c) => c.properties.stores_1km === 0)
  .sort((a, b) => b.properties.score - a.properties.score)
  .slice(0, 8)
  .map((c, index) => ({
    rank: index + 1,
    ...c.properties,
  }));

const meta = {
  generatedAt: new Date().toISOString(),
  model: "demo-heuristic-v0",
  note:
    "Skor demo (bukan model final). Demand memakai anchor POI + jarak ke pusat; kompetisi memakai gerai dalam 1 km. Ganti dengan LightGBM + spatial CV di fase berikutnya.",
  center: CENTER,
  radiusKm: RADIUS_KM,
  h3Resolution: H3_RES,
  counts: {
    stores: stores.length,
    brandedStores: branded,
    anchors: anchors.length,
    h3Cells: cells.length,
    candidateSites: topSites.length,
  },
};

await Promise.all([
  writeFile(
    path.join(PUBLIC_DATA, "stores.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: stores }),
    "utf8",
  ),
  writeFile(
    path.join(PUBLIC_DATA, "anchors.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: anchors }),
    "utf8",
  ),
  writeFile(
    path.join(PUBLIC_DATA, "h3-demo.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: cells }),
    "utf8",
  ),
  writeFile(
    path.join(PUBLIC_DATA, "top-sites-demo.json"),
    JSON.stringify(topSites, null, 2),
    "utf8",
  ),
  writeFile(path.join(PUBLIC_DATA, "meta-demo.json"), JSON.stringify(meta, null, 2), "utf8"),
]);

console.log(
  `[ok] ${stores.length} minimarket (${branded} branded), ${anchors.length} anchor, ${cells.length} sel H3`,
);
console.log(`[ok] ${topSites.length} kandidat top site`);
console.log(`[save] ${PUBLIC_DATA}`);
