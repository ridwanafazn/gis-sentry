import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cellToLatLng,
  gridDisk,
  latLngToCell,
  polygonToCells,
} from "h3-js";

const ROOT = process.cwd();
const OSM = path.join(ROOT, "data", "osm");
const OUT = path.join(ROOT, "data", "ml");

const CENTER = { lat: -6.5716, lng: 107.7583 };
const H3_RES = 9;
const BUCKET = 0.02;

// Wilayah training: bbox yang sudah dipakai untuk query OSM/Overture.
// Subang tetap ditandai is_subang untuk holdout transfer.
const REGION = { west: 107.25, south: -6.95, east: 108.0, north: -6.15 };

function pointInPolygon(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function detectBrand(text) {
  const haystack = text.toLowerCase();
  if (haystack.includes("indomaret") || haystack.includes("indomart")) return "Indomaret";
  if (haystack.includes("alfamidi")) return "Alfamidi";
  if (haystack.includes("alfamart")) return "Alfamart";
  return "Lainnya";
}

function overtureStores(json) {
  const stores = [];
  for (const feature of json.features ?? []) {
    const p = feature.properties ?? {};
    if (feature.geometry?.type !== "Point") continue;

    const taxonomy = p.taxonomy?.primary ?? p.basic_category ?? "";
    const name = p.names?.primary ?? "";
    const brandName = p.brand?.names?.primary ?? "";
    const text = `${taxonomy} ${name} ${brandName}`;

    const isConvenience =
      taxonomy === "convenience_store" ||
      /indomaret|indomart|alfamart|alfamidi/i.test(text);

    if (!isConvenience) continue;

    const [lng, lat] = feature.geometry.coordinates;
    stores.push({
      lat,
      lng,
      brand: detectBrand(text),
      name,
      taxonomy,
    });
  }
  return stores;
}

function toAnchors(json) {
  const anchors = [];
  for (const element of json.elements ?? []) {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (lat == null || lng == null) continue;
    anchors.push({ lat, lng });
  }
  return anchors;
}

function toRoadSegments(json) {
  const segments = [];
  for (const element of json.elements ?? []) {
    if (element.type !== "way" || !Array.isArray(element.geometry)) continue;
    const highway = element.tags?.highway ?? "unknown";
    const arterial = ["motorway", "trunk", "primary", "secondary", "tertiary"].includes(
      highway,
    );
    const geom = element.geometry;
    for (let i = 0; i < geom.length - 1; i += 1) {
      segments.push({
        aLat: geom[i].lat,
        aLng: geom[i].lon,
        bLat: geom[i + 1].lat,
        bLng: geom[i + 1].lon,
        arterial,
      });
    }
  }
  return segments;
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

function pointToSegmentKm(lat, lng, aLat, aLng, bLat, bLng) {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.574;
  const ax = (aLng - lng) * kx;
  const ay = (aLat - lat) * ky;
  const bx = (bLng - lng) * kx;
  const by = (bLat - lat) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return Math.hypot(ax, ay);
  let t = -(ax * dx + ay * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function buildPointIndex(points) {
  const buckets = new Map();
  points.forEach((point, index) => {
    const key = `${Math.floor(point.lat / BUCKET)}:${Math.floor(point.lng / BUCKET)}`;
    const list = buckets.get(key);
    if (list) list.push(index);
    else buckets.set(key, [index]);
  });
  return buckets;
}

function nearbyPoints(lat, lng, radiusKm, buckets, points) {
  const dLat = radiusKm / 110.574;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const lat0 = Math.floor((lat - dLat) / BUCKET);
  const lat1 = Math.floor((lat + dLat) / BUCKET);
  const lng0 = Math.floor((lng - dLng) / BUCKET);
  const lng1 = Math.floor((lng + dLng) / BUCKET);
  const seen = new Set();
  const result = [];

  for (let a = lat0; a <= lat1; a += 1) {
    for (let b = lng0; b <= lng1; b += 1) {
      const list = buckets.get(`${a}:${b}`);
      if (!list) continue;
      for (const index of list) {
        if (seen.has(index)) continue;
        seen.add(index);
        const point = points[index];
        const d = haversineKm(lat, lng, point.lat, point.lng);
        if (d <= radiusKm) result.push({ point, d });
      }
    }
  }
  return result;
}

function buildRoadIndex(segments) {
  const buckets = new Map();
  segments.forEach((segment, index) => {
    const minLat = Math.min(segment.aLat, segment.bLat);
    const maxLat = Math.max(segment.aLat, segment.bLat);
    const minLng = Math.min(segment.aLng, segment.bLng);
    const maxLng = Math.max(segment.aLng, segment.bLng);
    for (let lat = Math.floor(minLat / BUCKET); lat <= Math.floor(maxLat / BUCKET); lat += 1) {
      for (let lng = Math.floor(minLng / BUCKET); lng <= Math.floor(maxLng / BUCKET); lng += 1) {
        const key = `${lat}:${lng}`;
        const list = buckets.get(key);
        if (list) list.push(index);
        else buckets.set(key, [index]);
      }
    }
  });
  return buckets;
}

function nearestRoads(lat, lng, segments, buckets) {
  const centerLat = Math.floor(lat / BUCKET);
  const centerLng = Math.floor(lng / BUCKET);
  const seen = new Set();
  let arterial = 3;
  let any = 3;

  for (let dLat = -3; dLat <= 3; dLat += 1) {
    for (let dLng = -3; dLng <= 3; dLng += 1) {
      const list = buckets.get(`${centerLat + dLat}:${centerLng + dLng}`);
      if (!list) continue;
      for (const index of list) {
        if (seen.has(index)) continue;
        seen.add(index);
        const segment = segments[index];
        const d = pointToSegmentKm(
          lat,
          lng,
          segment.aLat,
          segment.aLng,
          segment.bLat,
          segment.bLng,
        );
        if (d < any) any = d;
        if (segment.arterial && d < arterial) arterial = d;
      }
    }
  }

  return { arterial, any };
}

function normalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-9) return values.map(() => 0);
  return values.map((v) => (v - min) / (max - min));
}

function percentileRank(values) {
  const n = values.length;
  if (n <= 1) return values.map(() => 50);
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return (lo / (n - 1)) * 100;
  });
}

function round(n, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

const [adminRaw, overtureRaw, anchorsRaw, roadsRaw, popRaw] = await Promise.all([
  readFile(path.join(ROOT, "data", "admin", "subang.geojson"), "utf8").then(JSON.parse),
  readFile(path.join(ROOT, "data", "overture", "subang-places.geojson"), "utf8").then(JSON.parse),
  readFile(path.join(OSM, "anchors-regency.json"), "utf8").then(JSON.parse),
  readFile(path.join(OSM, "roads-regency.json"), "utf8").then(JSON.parse),
  readFile(path.join(ROOT, "data", "population", "h3-population-regency.json"), "utf8").then(JSON.parse),
]);

const admin = adminRaw.feature ?? adminRaw;
const adminRing = admin.geometry.coordinates[0];

// Training region = bbox. Subang = spatial holdout (is_subang).
const bboxPolygon = [
  [
    [REGION.west, REGION.south],
    [REGION.east, REGION.south],
    [REGION.east, REGION.north],
    [REGION.west, REGION.north],
    [REGION.west, REGION.south],
  ],
];
const cells = polygonToCells(bboxPolygon, H3_RES, true);

const stores = overtureStores(overtureRaw);
const anchors = toAnchors(anchorsRaw);
const segments = toRoadSegments(roadsRaw);
const population = popRaw.cells ?? {};

const storeCells = new Map();
const brandedCells = new Set();

for (const store of stores) {
  const h3 = latLngToCell(store.lat, store.lng, H3_RES);
  const list = storeCells.get(h3);
  if (list) list.push(store);
  else storeCells.set(h3, [store]);
  if (store.brand !== "Lainnya") brandedCells.add(h3);
}

const anchorIndex = buildPointIndex(anchors);
const storeIndex = buildPointIndex(stores);
const roadIndex = buildRoadIndex(segments);

console.log(
  `[dataset] ${cells.length} sel bbox, ${stores.length} minimarket Overture, ${anchors.length} anchor, ${segments.length} segmen jalan`,
);

const meta = cells.map((h3) => {
  const [lat, lng] = cellToLatLng(h3);
  return {
    h3,
    lat,
    lng,
    block: `${Math.floor(lat / 0.05)}_${Math.floor(lng / 0.05)}`,
    isSubang: pointInPolygon(lat, lng, adminRing),
  };
});

const rows = meta.map((cell) => {
  let populationDecay = 0;
  let population15 = 0;
  for (const neighbor of gridDisk(cell.h3, 8)) {
    const pop = population[neighbor] ?? 0;
    if (pop <= 0) continue;
    const [nLat, nLng] = cellToLatLng(neighbor);
    const d = haversineKm(cell.lat, cell.lng, nLat, nLng);
    if (d <= 1.5) population15 += pop;
    populationDecay += pop * Math.exp(-d / 0.9);
  }

  let anchorDecay = 0;
  let anchor15 = 0;
  for (const { d } of nearbyPoints(cell.lat, cell.lng, 1.5, anchorIndex, anchors)) {
    anchor15 += 1;
    anchorDecay += Math.exp(-d / 1.2);
  }

  let storeDecay = 0;
  let store15 = 0;
  let nearestStore = 10;
  for (const { point, d } of nearbyPoints(cell.lat, cell.lng, 1.5, storeIndex, stores)) {
    // Leakage guard: gerai di sel target tidak dihitung sebagai kompetitor.
    if (latLngToCell(point.lat, point.lng, H3_RES) === cell.h3) continue;
    store15 += 1;
    storeDecay += Math.exp(-d / 0.7);
    if (d < nearestStore) nearestStore = d;
  }

  const roads = nearestRoads(cell.lat, cell.lng, segments, roadIndex);
  const accessRaw =
    0.7 * Math.exp(-roads.arterial / 0.8) + 0.3 * Math.exp(-roads.any / 0.5);

  return {
    ...cell,
    label: brandedCells.has(cell.h3) ? 1 : 0,
    populationDecay,
    population15,
    anchorDecay,
    anchor15,
    storeDecay,
    store15,
    nearestStore,
    arterialKm: roads.arterial,
    localKm: roads.any,
    accessRaw,
    distCenter: haversineKm(CENTER.lat, CENTER.lng, cell.lat, cell.lng),
  };
});

const popNorm = normalize(rows.map((r) => r.populationDecay));
const anchorNorm = normalize(rows.map((r) => r.anchorDecay));
const compNorm = normalize(rows.map((r) => r.storeDecay));
const accessNorm = normalize(rows.map((r) => r.accessRaw));

const demand = rows.map((_, i) => 0.7 * popNorm[i] + 0.3 * anchorNorm[i]);
const baselineRaw = rows.map(
  (_, i) => 0.45 * demand[i] + 0.25 * (1 - compNorm[i]) + 0.2 * accessNorm[i] + 0.1,
);
const baselineScore = percentileRank(baselineRaw);

const header = [
  "h3",
  "lat",
  "lng",
  "block",
  "is_subang",
  "label",
  "population_decay",
  "population_1_5km",
  "anchor_decay",
  "anchor_1_5km",
  "competitor_decay",
  "competitor_1_5km",
  "nearest_competitor_km",
  "arterial_km",
  "local_km",
  "access_raw",
  "demand",
  "competition",
  "access",
  "dist_center_km",
  "baseline_score",
];

const lines = [header.join(",")];
rows.forEach((row, i) => {
  lines.push(
    [
      row.h3,
      round(row.lat, 6),
      round(row.lng, 6),
      row.block,
      row.isSubang ? 1 : 0,
      row.label,
      round(row.populationDecay, 4),
      Math.round(row.population15),
      round(row.anchorDecay, 4),
      row.anchor15,
      round(row.storeDecay, 4),
      row.store15,
      round(row.nearestStore, 4),
      round(row.arterialKm, 4),
      round(row.localKm, 4),
      round(row.accessRaw, 4),
      round(demand[i], 4),
      round(compNorm[i], 4),
      round(accessNorm[i], 4),
      round(row.distCenter, 4),
      round(baselineScore[i], 2),
    ].join(","),
  );
});

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "features.csv"), lines.join("\n"), "utf8");

const positives = rows.filter((r) => r.label === 1);
const subangRows = rows.filter((r) => r.isSubang);
const summary = {
  generatedAt: new Date().toISOString(),
  region: "bbox Greater Subang (training) + Subang polygon (holdout)",
  cells: cells.length,
  positives: positives.length,
  negatives: rows.length - positives.length,
  positiveRate: positives.length / rows.length,
  subangCells: subangRows.length,
  subangPositives: subangRows.filter((r) => r.label === 1).length,
  blocks: new Set(rows.map((r) => r.block)).size,
  stores: stores.length,
  brandedStores: stores.filter((s) => s.brand !== "Lainnya").length,
  brandedCells: brandedCells.size,
  anchors: anchors.length,
  roadSegments: segments.length,
  populationInCells: Math.round(
    rows.reduce((sum, row) => sum + (population[row.h3] ?? 0), 0),
  ),
  sources: {
    labels: "Overture Places (convenience_store + brand names), CDLA-Permissive 2.0",
    admin: "Nominatim / OpenStreetMap boundary",
    population: popRaw.source,
    anchors: "OpenStreetMap amenity/railway",
    roads: "OpenStreetMap highway",
  },
};

await writeFile(
  path.join(OUT, "dataset-summary.json"),
  JSON.stringify(summary, null, 2),
  "utf8",
);

console.log(
  `[ok] ${cells.length} sel → ${summary.positives} positif (${(summary.positiveRate * 100).toFixed(2)}%)`,
);
console.log(
  `[ok] Subang: ${summary.subangCells} sel, ${summary.subangPositives} positif`,
);
console.log(`[ok] ${summary.blocks} blok spasial, ${stores.length} minimarket Overture`);
console.log(`[save] ${OUT}/features.csv`);
