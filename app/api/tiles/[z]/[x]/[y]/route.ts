import { getPool } from "@/lib/db";

export const runtime = "nodejs";

const MVT_SQL = `
WITH bounds AS (
  SELECT ST_TileEnvelope($1::int, $2::int, $3::int) AS geom
),
mvtgeom AS (
  SELECT
    h3,
    score::float8 AS score,
    demand::float8 AS demand,
    competition::float8 AS competition,
    access::float8 AS access,
    risk::float8 AS risk,
    stores_1km,
    anchors_1_5km,
    nearest_store_km::float8 AS nearest_store_km,
    nearest_road_km::float8 AS nearest_road_km,
    population_1_5km,
    dist_center_km::float8 AS dist_center_km,
    lat::float8 AS lat,
    lng::float8 AS lng,
    ST_AsMVTGeom(
      ST_Transform(h3_cells.geom, 3857),
      bounds.geom,
      4096,
      64,
      true
    ) AS geom
  FROM h3_cells, bounds
  WHERE h3_cells.geom && ST_Transform(bounds.geom, 4326)
)
SELECT ST_AsMVT(mvtgeom, 'h3', 4096, 'geom') AS mvt
FROM mvtgeom;
`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await params;
  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(y);

  if (![zi, xi, yi].every(Number.isInteger) || zi < 0 || zi > 22) {
    return new Response("Invalid tile coordinates", { status: 400 });
  }

  const pool = getPool();
  if (!pool) {
    return new Response(null, {
      status: 204,
      headers: { "X-GIS-Sentry": "database-not-configured" },
    });
  }

  try {
    const result = await pool.query<{ mvt: Buffer | null }>(MVT_SQL, [zi, xi, yi]);
    const mvt = result.rows[0]?.mvt;

    if (!mvt || mvt.length === 0) {
      return new Response(null, { status: 204 });
    }

    return new Response(new Uint8Array(mvt), {
      headers: {
        "Content-Type": "application/vnd.mapbox-vector-tile",
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("tile query failed", error);
    return new Response("Tile query failed", { status: 500 });
  }
}
