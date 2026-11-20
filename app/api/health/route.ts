import { getPool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const pool = getPool();
  let db = false;
  let dbError: string | null = null;

  if (!pool) {
    dbError = "database_not_configured";
  } else {
    try {
      await pool.query("SELECT 1");
      db = true;
    } catch {
      dbError = "database_unreachable";
    }
  }

  return Response.json(
    {
      ok: db,
      service: "gis-sentry",
      db,
      dbError,
      aiConfigured: Boolean(process.env.OPENCODE_GO_API_KEY),
      productionModel: "weighted-v1",
      timestamp: new Date().toISOString(),
    },
    { status: db ? 200 : 503 },
  );
}
