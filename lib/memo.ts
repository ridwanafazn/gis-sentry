import { getPool } from "./db";

export const MEMO_RADIUS_M = 3000;

const SITE_SQL = `
SELECT
  h3, score::float8 AS score, demand::float8 AS demand,
  competition::float8 AS competition, access::float8 AS access,
  risk::float8 AS risk, stores_1km, anchors_1_5km,
  nearest_store_km::float8 AS nearest_store_km,
  nearest_road_km::float8 AS nearest_road_km,
  population_1_5km, dist_center_km::float8 AS dist_center_km,
  lat::float8 AS lat, lng::float8 AS lng
FROM h3_cells
WHERE h3 = $1;
`;

const SIM_SQL = `
WITH cand AS (
  SELECT h3, score, ST_Centroid(geom) AS geom
  FROM h3_cells WHERE h3 = $1
)
SELECT
  s.id, s.name, s.brand,
  ST_Distance(s.geom::geography, c.geom::geography)::float AS distance_m,
  POWER(GREATEST(0, 1 - (ST_Distance(s.geom::geography, c.geom::geography) / $2::float)), 2)::float AS overlap
FROM cand c
LEFT JOIN stores s
  ON ST_DWithin(s.geom::geography, c.geom::geography, $2::int)
  AND s.brand = $3::text
ORDER BY distance_m NULLS LAST;
`;

export type MemoSite = {
  h3: string;
  score: number;
  demand: number;
  competition: number;
  access: number;
  risk: number;
  stores_1km: number;
  anchors_1_5km: number;
  nearest_store_km: number | null;
  nearest_road_km: number | null;
  population_1_5km: number;
  dist_center_km: number;
  lat: number;
  lng: number;
};

export type MemoStore = {
  name: string;
  brand: string;
  distanceM: number;
  overlap: number;
};

export type MemoData = {
  site: MemoSite;
  chain: string;
  gross: number;
  net: number;
  cannibalization: number;
  affected: MemoStore[];
  recommendation: string;
};

export async function getMemoData(
  h3: string,
  chain: string,
): Promise<MemoData | null> {
  const pool = getPool();
  if (!pool) throw new Error("DATABASE_NOT_CONFIGURED");

  const [siteResult, simResult] = await Promise.all([
    pool.query<MemoSite>(SITE_SQL, [h3]),
    pool.query(SIM_SQL, [h3, MEMO_RADIUS_M, chain]),
  ]);

  if (siteResult.rows.length === 0) return null;

  const site = siteResult.rows[0];
  const affected: MemoStore[] = simResult.rows
    .filter((row) => row.id)
    .map((row) => ({
      name: row.name,
      brand: row.brand,
      distanceM: Math.round(Number(row.distance_m)),
      overlap: Number(row.overlap),
    }));

  const cannibalization = Math.min(
    0.85,
    affected.reduce((sum, store) => sum + store.overlap, 0),
  );
  const gross = Number(site.score);
  const net = gross * (1 - cannibalization);

  const recommendation =
    gross >= 75 && net >= 60
      ? "Layak masuk shortlist. Lanjutkan validasi lapangan: zonasi, risiko banjir, akses aktual, dan negosiasi sewa."
      : gross >= 60
        ? "Perlu kajian tambahan. Skor cukup baik, tetapi faktor risiko/kanibalisasi harus divalidasi sebelum shortlist."
        : "Tidak diprioritaskan pada putaran ini. Cari kandidat dengan demand lebih tinggi atau kompetisi lebih rendah.";

  return { site, chain, gross, net, cannibalization, affected, recommendation };
}
