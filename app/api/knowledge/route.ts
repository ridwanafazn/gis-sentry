import { searchDocs } from "@/lib/rag";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();

  if (!q) {
    return Response.json(
      {
        error:
          "Parameter q wajib diisi. Contoh: /api/knowledge?q=batasan%20skor",
      },
      { status: 400 },
    );
  }

  const results = searchDocs(q, 4);
  return Response.json({ query: q, count: results.length, results });
}
