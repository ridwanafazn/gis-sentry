import { access, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL belum diset. Isi .env.local dulu.");
  process.exit(1);
}

const DATA = path.join(process.cwd(), "public", "data");

async function readJson(file) {
  return JSON.parse(await readFile(path.join(DATA, file), "utf8"));
}

async function exists(file) {
  try {
    await access(path.join(DATA, file));
    return true;
  } catch {
    return false;
  }
}

async function insertBatches(client, label, sqlPrefix, columns, rows, placeholdersFor, valuesFor) {
  const BATCH = 200;
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    const params = [];
    const tuples = [];

    for (const row of batch) {
      const tuple = placeholdersFor(row, params.length);
      tuples.push(tuple);
      params.push(...valuesFor(row));
    }

    await client.query(`${sqlPrefix} ${tuples.join(", ")}`, params);
  }
  console.log(`[ok] ${label}: ${rows.length} baris`);
}

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");
  await client.query("TRUNCATE TABLE stores, anchors, roads, h3_cells");

  const h3File = (await exists("h3-final.geojson"))
    ? "h3-final.geojson"
    : "h3-demo.geojson";

  const [stores, anchors, roads, h3] = await Promise.all([
    readJson("stores.geojson"),
    readJson("anchors.geojson"),
    exists("roads.geojson").then((ok) =>
      ok ? readJson("roads.geojson") : { features: [] },
    ),
    readJson(h3File),
  ]);

  console.log(`[info] memakai ${h3File}`);

  await insertBatches(
    client,
    "stores",
    `INSERT INTO stores (id, name, brand, category, lng, lat, props, geom) VALUES`,
    null,
    stores.features,
    (_row, offset) => {
      const b = offset;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}::jsonb, ST_SetSRID(ST_MakePoint($${b + 5}, $${b + 6}), 4326))`;
    },
    (feature) => {
      const p = feature.properties;
      const [lng, lat] = feature.geometry.coordinates;
      return [
        p.id,
        p.name ?? "",
        p.brand ?? "Lainnya",
        p.category ?? "convenience",
        lng,
        lat,
        JSON.stringify(p),
      ];
    },
  );

  await insertBatches(
    client,
    "anchors",
    `INSERT INTO anchors (id, name, category, lng, lat, props, geom) VALUES`,
    null,
    anchors.features,
    (_row, offset) => {
      const b = offset;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}::jsonb, ST_SetSRID(ST_MakePoint($${b + 4}, $${b + 5}), 4326))`;
    },
    (feature) => {
      const p = feature.properties;
      const [lng, lat] = feature.geometry.coordinates;
      return [p.id, p.name ?? "", p.category ?? "unknown", lng, lat, JSON.stringify(p)];
    },
  );

  if (roads.features.length > 0) {
    await insertBatches(
      client,
      "roads",
      `INSERT INTO roads (id, highway, name, geom) VALUES`,
      null,
      roads.features,
      (_row, offset) => {
        const b = offset;
        return `($${b + 1}, $${b + 2}, $${b + 3}, ST_GeomFromGeoJSON($${b + 4}))`;
      },
      (feature) => {
        const p = feature.properties;
        return [
          p.id,
          p.highway ?? "unknown",
          p.name ?? "",
          JSON.stringify(feature.geometry),
        ];
      },
    );
  }

  await insertBatches(
    client,
    "h3_cells",
    `INSERT INTO h3_cells (h3, score, demand, competition, access, risk, stores_1km, anchors_1_5km, nearest_store_km, nearest_road_km, population_1_5km, dist_center_km, lat, lng, geom) VALUES`,
    null,
    h3.features,
    (_row, offset) => {
      const b = offset;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10}, $${b + 11}, $${b + 12}, $${b + 13}, $${b + 14}, ST_GeomFromGeoJSON($${b + 15}))`;
    },
    (feature) => {
      const p = feature.properties;
      return [
        p.h3,
        p.score,
        p.demand,
        p.competition,
        p.access,
        p.risk,
        p.stores_1km,
        p.anchors_1_5km,
        p.nearest_store_km,
        p.nearest_road_km ?? null,
        p.population_1_5km ?? 0,
        p.dist_center_km,
        p.lat,
        p.lng,
        JSON.stringify(feature.geometry),
      ];
    },
  );

  await client.query("COMMIT");
  console.log("[done] seed selesai");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("[fail] seed gagal:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
