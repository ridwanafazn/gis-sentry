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
const POP_FILE = path.join(ROOT, "data", "population", "h3-population.json");
const PUBLIC_DATA = path.join(ROOT, "public", "data");

const CENTER = { lat: -6.5716, lng: 107.7583 };
const RADIUS_KM = 10;
const H3_RES = 9;

const WEIGHTS = {
  demand: 0.45,
  competition: 0.25,
  access: 0.2,
  risk: 0.1,
};

function detectBrand(tags) {
  const haystack =
    `${tags.brand ?? ""} ${tags.name ?? ""} ${tags.operator ?? ""}`.toLowerCase();
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
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id: `${element.type}/${element.id}`,
        kind,
        name: tags.name ?? "",
        brand: detectBrand(tags),
        category: tags.shop ?? tags.amenity ?? tags.railway ?? "unknown",
        operator: tags.operator ?? "",
      },
    });
  }
  return features;
}

function toRoadFeatures(json) {
  const features = [];
  for (const element of json.elements ?? []) {
    if (element.type !== "way" || !Array.isArray(element.geometry)) continue;
    const coordinates = element.geometry.map((point) => [point.lon, point.lat]);
    if (coordinates.length < 2) continue;
    const tags = element.tags ?? {};
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates },
      properties: {
        id: `way/${element.id}`,
        highway: tags.highway ?? "unknown",
        name: tags.name ?? "",
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

function round(n, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function toHexPolygon(h3) {
  const ring = cellToBoundary(h3).map(([lat, lng]) => [lng, lat]);
  ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

function pointToSegmentKm(lat, lng, aLat, aLng, bLat, bLng) {
  const lat0 = (lat * Math.PI) / 180;
  const kx = 111.32 * Math.cos(lat0);
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
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(cx, cy);
}

function buildRoadIndex(segments) {
  const BUCKET = 0.02;
  const buckets = new Map();

  for (let index = 0; index < segments.length; index += 1) {
    const seg = segments[index];
    const minLat = Math.min(seg.aLat, seg.bLat);
    const maxLat = Math.max(seg.aLat, seg.bLat);
    const minLng = Math.min(seg.aLng, seg.bLng);
    const maxLng = Math.max(seg.aLng, seg.bLng);

    for (let lat = Math.floor(minLat / BUCKET); lat <= Math.floor(maxLat / BUCKET); lat += 1) {
      for (let lng = Math.floor(minLng / BUCKET); lng <= Math.floor(maxLng / BUCKET); lng += 1) {
        const key = `${lat}:${lng}`;
        const list = buckets.get(key);
        if (list) list.push(index);
        else buckets.set(key, [index]);
      }
    }
  }

  return { BUCKET, buckets };
}

function nearestRoadKm(lat, lng, segments, index) {
  const { BUCKET, buckets } = index;
  const centerLat = Math.floor(lat / BUCKET);
  const centerLng = Math.floor(lng / BUCKET);
  const seen = new Set();
  let best = Infinity;

  for (let dLat = -3; dLat <= 3; dLat += 1) {
    for (let dLng = -3; dLng <= 3; dLng += 1) {
      const list = buckets.get(`${centerLat + dLat}:${centerLng + dLng}`);
      if (!list) continue;
      for (const segIndex of list) {
        if (seen.has(segIndex)) continue;
        seen.add(segIndex);
        const seg = segments[segIndex];
        const d = pointToSegmentKm(lat, lng, seg.aLat, seg.aLng, seg.bLat, seg.bLng);
        if (d < best) best = d;
      }
    }
  }

  return Number.isFinite(best) ? best : 3;
}

await mkdir(PUBLIC_DATA, { recursive: true });

const [convenienceRaw, anchorsRaw, roadsRaw, populationRaw] = await Promise.all([
  readFile(path.join(RAW, "convenience-aoi.json"), "utf8").then(JSON.parse),
  readFile(path.join(RAW, "anchors-aoi.json"), "utf8").then(JSON.parse),
  readFile(path.join(RAW, "roads-aoi.json"), "utf8").then(JSON.parse),
  readFile(POP_FILE, "utf8").then(JSON.parse),
]);

const stores = toPointFeatures(convenienceRaw, "store");
const anchors = toPointFeatures(anchorsRaw, "anchor");
const roads = toRoadFeatures(roadsRaw);
const population = populationRaw.cells ?? {};

const branded = stores.filter((store) => store.properties.brand !== "Lainnya").length;

const centerCell = latLngToCell(CENTER.lat, CENTER.lng, H3_RES);
const cellIds = gridDisk(centerCell, 45).filter((h3) => {
  const [lat, lng] = cellToLatLng(h3);
  return haversineKm(CENTER.lat, CENTER.lng, lat, lng) <= RADIUS_KM;
});

const cellMeta = cellIds.map((h3) => {
  const [lat, lng] = cellToLatLng(h3);
  return { h3, lat, lng, distCenter: haversineKm(CENTER.lat, CENTER.lng, lat, lng) };
});

// Road segments: arterial/collector untuk akses utama, semua jalan untuk akses lokal.
const ARTERIAL = new Set(["motorway", "trunk", "primary", "secondary", "tertiary"]);
const segments = [];
for (const road of roads) {
  const coords = road.geometry.coordinates;
  const isArterial = ARTERIAL.has(road.properties.highway);
  for (let i = 0; i < coords.length - 1; i += 1) {
    segments.push({
      aLat: coords[i][1],
      aLng: coords[i][0],
      bLat: coords[i + 1][1],
      bLng: coords[i + 1][0],
      arterial: isArterial,
    });
  }
}

console.log(
  `[score] ${stores.length} gerai, ${anchors.length} anchor, ${roads.length} way jalan (${segments.length} segmen)`,
);

const roadIndex = buildRoadIndex(segments);

const rows = cellMeta.map((meta) => {
  // Demand: populasi dengan decay + anchor dengan decay.
  let populationDecay = 0;
  let population15 = 0;
  for (const neighbor of gridDisk(meta.h3, 8)) {
    const pop = population[neighbor] ?? 0;
    if (pop <= 0) continue;
    const [nLat, nLng] = cellToLatLng(neighbor);
    const d = haversineKm(meta.lat, meta.lng, nLat, nLng);
    if (d <= 1.5) population15 += pop;
    populationDecay += pop * Math.exp(-d / 0.9);
  }

  let anchorDecay = 0;
  let anchor15 = 0;
  for (const anchor of anchors) {
    const [aLng, aLat] = anchor.geometry.coordinates;
    const d = haversineKm(meta.lat, meta.lng, aLat, aLng);
    if (d <= 1.5) {
      anchor15 += 1;
      anchorDecay += Math.exp(-d / 1.2);
    }
  }

  // Competition: gerai dengan decay.
  let storeDecay = 0;
  let stores1km = 0;
  let nearestStore = Infinity;
  for (const store of stores) {
    const [sLng, sLat] = store.geometry.coordinates;
    const d = haversineKm(meta.lat, meta.lng, sLat, sLng);
    if (d < nearestStore) nearestStore = d;
    if (d <= 1) stores1km += 1;
    if (d <= 1.5) storeDecay += Math.exp(-d / 0.7);
  }

  // Access: jarak ke jalan arteri dan jalan lokal terdekat.
  const nearestAny = nearestRoadKm(meta.lat, meta.lng, segments, roadIndex);
  let nearestArterial = 3;
  for (const seg of segments) {
    if (!seg.arterial) continue;
    const d = pointToSegmentKm(meta.lat, meta.lng, seg.aLat, seg.aLng, seg.bLat, seg.bLng);
    if (d < nearestArterial) nearestArterial = d;
  }

  return {
    ...meta,
    populationDecay,
    population15,
    anchorDecay,
    anchor15,
    storeDecay,
    stores1km,
    nearestStore: Number.isFinite(nearestStore) ? nearestStore : 10,
    nearestAny,
    nearestArterial,
  };
});

const popNorm = normalize(rows.map((r) => r.populationDecay));
const anchorNorm = normalize(rows.map((r) => r.anchorDecay));
const competitionNorm = normalize(rows.map((r) => r.storeDecay));
const accessRaw = rows.map(
  (r) => 0.7 * Math.exp(-r.nearestArterial / 0.8) + 0.3 * Math.exp(-r.nearestAny / 0.5),
);
const accessNorm = normalize(accessRaw);

const demandNorm = rows.map((_, i) => 0.7 * popNorm[i] + 0.3 * anchorNorm[i]);

const rawScore = rows.map(
  (_, i) =>
    WEIGHTS.demand * demandNorm[i] +
    WEIGHTS.competition * (1 - competitionNorm[i]) +
    WEIGHTS.access * accessNorm[i] +
    WEIGHTS.risk * 1,
);

const scorePercentile = percentileRank(rawScore);

const cells = rows.map((row, i) => ({
  type: "Feature",
  geometry: toHexPolygon(row.h3),
  properties: {
    h3: row.h3,
    score: round(scorePercentile[i]),
    demand: round(demandNorm[i] * 100),
    competition: round(competitionNorm[i] * 100),
    access: round(accessNorm[i] * 100),
    risk: 0,
    stores_1km: row.stores1km,
    anchors_1_5km: row.anchor15,
    nearest_store_km: round(row.nearestStore, 2),
    nearest_road_km: round(row.nearestArterial, 2),
    population_1_5km: Math.round(row.population15),
    dist_center_km: round(row.distCenter, 2),
    lat: round(row.lat, 6),
    lng: round(row.lng, 6),
    model: "weighted-v1",
  },
}));

const topSites = cells
  .filter((cell) => cell.properties.stores_1km === 0)
  .sort((a, b) => b.properties.score - a.properties.score)
  .slice(0, 8)
  .map((cell, index) => ({ rank: index + 1, ...cell.properties }));

const meta = {
  generatedAt: new Date().toISOString(),
  model: "weighted-v1",
  note:
    "Demand = 70% populasi WorldPop (decay 0.9 km) + 30% anchor POI. Kompetisi = gerai ≤1.5 km (decay 0.7 km). Akses = jarak ke jalan arteri + lokal. Risiko masih placeholder (0). Skor = persentil relatif AOI, bukan prediksi profit.",
  sources: {
    population: populationRaw.source,
    populationUrl: populationRaw.url,
    stores: "OpenStreetMap shop=convenience",
    anchors: "OpenStreetMap amenity/railway",
    roads: "OpenStreetMap highway",
  },
  weights: WEIGHTS,
  center: CENTER,
  radiusKm: RADIUS_KM,
  h3Resolution: H3_RES,
  population: {
    totalInAoi: populationRaw.totalPopulation,
    cellsWithPopulation: Object.keys(population).length,
  },
  counts: {
    stores: stores.length,
    brandedStores: branded,
    anchors: anchors.length,
    roads: roads.length,
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
    path.join(PUBLIC_DATA, "roads.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: roads }),
    "utf8",
  ),
  writeFile(
    path.join(PUBLIC_DATA, "h3-final.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: cells }),
    "utf8",
  ),
  writeFile(
    path.join(PUBLIC_DATA, "top-sites.json"),
    JSON.stringify(topSites, null, 2),
    "utf8",
  ),
  writeFile(path.join(PUBLIC_DATA, "meta.json"), JSON.stringify(meta, null, 2), "utf8"),
]);

console.log(
  `[ok] weighted-v1: ${cells.length} sel, ${topSites.length} kandidat, populasi AOI ${populationRaw.totalPopulation.toLocaleString("id-ID")}`,
);
