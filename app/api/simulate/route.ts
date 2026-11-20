import { getPool } from "@/lib/db";

export const runtime = "nodejs";

const RADIUS_M = 3000;

const SQL = `
WITH cand AS (
  SELECT h3, score, ST_Centroid(geom) AS geom
  FROM h3_cells
  WHERE h3 = $1
)
SELECT
  c.h3,
  c.score::float AS gross_score,
  s.id,
  s.name,
  s.brand,
  ST_Distance(s.geom::geography, c.geom::geography)::float AS distance_m,
  POWER(
    GREATEST(
      0,
      1 - (ST_Distance(s.geom::geography, c.geom::geography) / $2::float)
    ),
    2
  )::float AS overlap
FROM cand c
LEFT JOIN stores s
  ON ST_DWithin(s.geom::geography, c.geom::geography, $2::int)
  AND s.brand = $3::text
ORDER BY distance_m NULLS LAST;
`;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const h3 = params.get("h3");
  const chain = params.get("chain") ?? "Alfamart";

  if (!h3) {
    return Response.json({ error: "Parameter h3 wajib diisi." }, { status: 400 });
  }

  if (!["Alfamart", "Indomaret"].includes(chain)) {
    return Response.json(
      { error: "Parameter chain harus Alfamart atau Indomaret." },
      { status: 400 },
    );
  }

  const pool = getPool();
  if (!pool) {
    return Response.json(
      {
        error:
          "Simulasi kanibalisasi butuh PostGIS. Jalankan docker compose dan npm run db:seed.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await pool.query(SQL, [h3, RADIUS_M, chain]);

    if (result.rows.length === 0) {
      return Response.json({ error: `H3 ${h3} tidak ditemukan.` }, { status: 404 });
    }

    const grossScore = Number(result.rows[0].gross_score);
    const stores = result.rows
      .filter((row) => row.id)
      .map((row) => ({
        id: row.id,
        name: row.name,
        brand: row.brand,
        distanceM: Math.round(Number(row.distance_m)),
        overlap: Number(row.overlap),
      }));

    const cannibalization = Math.min(
      0.85,
      stores.reduce((sum, store) => sum + store.overlap, 0),
    );

    return Response.json({
      h3,
      chain,
      radiusM: RADIUS_M,
      grossScore,
      netScore: grossScore * (1 - cannibalization),
      cannibalization,
      stores,
    });
  } catch (error) {
    console.error("simulate failed", error);
    return Response.json({ error: "Simulasi gagal dijalankan." }, { status: 500 });
  }
}
