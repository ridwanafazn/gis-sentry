import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "data", "osm");
const AOI = "-6.661,107.668,-6.482,107.849"; // south,west,north,east
const REGENCY = "-6.95,107.25,-6.15,108.0";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const QUERIES = {
  "convenience-aoi": `
    [out:json][timeout:120];
    // gis-sentry convenience aoi
    nwr["shop"="convenience"](${AOI});
    out center tags;
  `,
  "anchors-aoi": `
    [out:json][timeout:120];
    // gis-sentry anchors aoi
    (
      nwr["amenity"="marketplace"](${AOI});
      nwr["amenity"~"^(university|college|hospital|school)$"](${AOI});
      nwr["railway"="station"](${AOI});
    );
    out center tags;
  `,
  "convenience-regency": `
    [out:json][timeout:180];
    // gis-sentry convenience regency
    nwr["shop"="convenience"](${REGENCY});
    out center tags;
  `,
  "roads-aoi": `
    [out:json][timeout:240];
    // gis-sentry roads aoi
    way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${AOI});
    out geom qt;
  `,
  "anchors-regency": `
    [out:json][timeout:300];
    // gis-sentry anchors regency
    (
      nwr["amenity"="marketplace"](${REGENCY});
      nwr["amenity"~"^(university|college|hospital|school)$"](${REGENCY});
      nwr["railway"="station"](${REGENCY});
    );
    out center tags;
  `,
  "roads-regency": `
    [out:json][timeout:300];
    // gis-sentry roads regency
    way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${REGENCY});
    out geom qt;
  `,
};

function withNonce(query) {
  // Overpass deduplicates identical queries; a timestamp keeps each run unique.
  return query.replace("//", `// ${Date.now()} `);
}

async function fetchOverpass(name, query) {
  let lastError = null;

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "gis-sentry/0.1 (portfolio project)",
        },
        body: "data=" + encodeURIComponent(withNonce(query)),
      });

      if (!res.ok) {
        lastError = new Error(`${endpoint} -> HTTP ${res.status}`);
        continue;
      }

      const json = await res.json();
      console.log(
        `[ok] ${name}: ${json.elements?.length ?? 0} elemen via ${endpoint}`,
      );
      return json;
    } catch (err) {
      lastError = err;
      console.warn(`[retry] ${name}: ${String(err).slice(0, 120)}`);
    }
  }

  throw lastError ?? new Error(`Gagal fetch ${name}`);
}

await mkdir(OUT_DIR, { recursive: true });

for (const [name, query] of Object.entries(QUERIES)) {
  const file = path.join(OUT_DIR, `${name}.json`);

  if (!process.env.FORCE) {
    try {
      await access(file);
      console.log(`[skip] ${name} sudah ada (pakai FORCE=1 untuk ambil ulang)`);
      continue;
    } catch {
      // file belum ada
    }
  }

  const json = await fetchOverpass(name, query);
  await writeFile(file, JSON.stringify(json), "utf8");
  console.log(`[save] ${file}`);
}

console.log("Selesai. Lanjut: npm run data:pop / data:pop:regency");
