import { readFile } from "node:fs/promises";
import path from "node:path";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  createTextStreamResponse,
  isStepCount,
  streamText,
  toTextStream,
  tool,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import { searchDocs } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL =
  process.env.OPENCODE_GO_BASE_URL ?? "https://opencode.ai/inference/go/v1";
const MODEL = process.env.OPENCODE_GO_MODEL ?? "deepseek-v4.1-flash";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8_000),
      }),
    )
    .min(1)
    .max(30),
});

type TopSite = {
  rank: number;
  h3: string;
  score: number;
  demand: number;
  competition: number;
  access: number;
  risk: number;
  stores_1km: number;
  anchors_1_5km: number;
  nearest_store_km: number | null;
  dist_center_km: number;
  lat: number;
  lng: number;
};

async function loadContext() {
  const [sitesRaw, metaRaw] = await Promise.all([
    readFile(
      path.join(process.cwd(), "public", "data", "top-sites.json"),
      "utf8",
    ),
    readFile(path.join(process.cwd(), "public", "data", "meta.json"), "utf8"),
  ]);

  return {
    sites: JSON.parse(sitesRaw) as TopSite[],
    meta: JSON.parse(metaRaw) as {
      counts: { stores: number; anchors: number; h3Cells: number };
      radiusKm: number;
      model: string;
    },
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENCODE_GO_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "OPENCODE_GO_API_KEY belum diset. Tambahkan key OpenCode Go ke .env.local lalu restart dev server.",
      },
      { status: 503 },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return Response.json(
      { error: "Payload pesan tidak valid." },
      { status: 400 },
    );
  }

  const { sites, meta } = await loadContext();

  const provider = createOpenAICompatible({
    name: "opencode-go",
    baseURL: BASE_URL,
    apiKey,
    headers: {
      "x-opencode-session": "gis-sentry-demo",
      "User-Agent": "gis-sentry/0.1 (portfolio)",
    },
  });

  const system = `
Kamu adalah analis ekspansi retail untuk GIS Sentry, fokus Kabupaten Subang.
Kamu menjawab dalam Bahasa Indonesia yang ringkas, konkret, dan berbasis data.

Konteks data:
- Model skor produksi: ${meta.model} (weighted, bukan prediksi profit).
- AOI demo: radius ${meta.radiusKm} km dari pusat Kota Subang.
- Dataset: ${meta.counts.stores} minimarket, ${meta.counts.anchors} anchor POI, ${meta.counts.h3Cells} sel H3 res 9.
- Kandidat top site dan detail tersedia lewat tool top_sites/site_detail.
- Dokumentasi produk/metodologi tersedia lewat tool search_docs.

Aturan:
1. Jangan pernah mengarang angka, koordinat, atau nama lokasi. Semua angka harus dari tool.
2. Kalau data tidak ada, bilang tidak ada.
3. Sebutkan bahwa skor adalah persentil relatif di AOI, bukan probabilitas profit.
4. Maksimal 4 kalimat kecuali diminta detail.
5. Jangan membuat geometri atau peta sendiri.
6. Untuk pertanyaan "kenapa", definisi, metodologi, atau keputusan model, panggil search_docs dan kutip sumbernya dalam format [source § heading].
7. Tulis sitasi dengan path file asli dari hasil search_docs, contoh: [data/knowledge/01-methodology.md § Skor weighted-v1]. Jangan menulis kata "source", jangan membuat markdown link, menambahkan "(source)", atau menggabungkan beberapa sitasi dalam satu bracket.
8. Jangan menulis kalimat pembuka tentang mencari dokumen ("I'll check...", "Let me...", "Saya akan cek..."). Langsung jawab.
9. Hindari ampersand (&) dan titik dua (:) sebagai gaya copy. Gunakan kalimat langsung atau bullet. Titik dua hanya untuk data teknis yang memang perlu.
`.trim();

  const tools = {
    top_sites: tool({
      description:
        "Ambil daftar kandidat lokasi terbaik di Subang, sudah diurutkan berdasarkan skor. Gunakan ini untuk pertanyaan tentang kandidat, ranking, atau rekomendasi.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(8).default(5),
      }),
      execute: async ({ limit }) => ({
        model: meta.model,
        sites: sites.slice(0, limit),
      }),
    }),
    site_detail: tool({
      description:
        "Ambil detail satu kandidat berdasarkan H3 cell id. Gunakan kalau user bertanya tentang kandidat tertentu.",
      inputSchema: z.object({
        h3: z.string().min(1),
      }),
      execute: async ({ h3 }) => {
        const site = sites.find((item) => item.h3 === h3);
        return (
          site ?? { error: `H3 ${h3} tidak ada di daftar kandidat top-8.` }
        );
      },
    }),
    search_docs: tool({
      description:
        "Cari dokumentasi produk: problem statement, metodologi skor, evaluasi LightGBM, deployment, dan keputusan model. Gunakan untuk pertanyaan 'kenapa', definisi, atau metodologi. Selalu kutip source dan heading.",
      inputSchema: z.object({
        query: z.string().min(3),
        limit: z.number().int().min(1).max(5).default(3),
      }),
      execute: async ({ query, limit }) => ({
        results: searchDocs(query, limit),
      }),
    }),
  };

  try {
    const result = streamText({
      model: provider(MODEL),
      system,
      messages: parsed.messages as ModelMessage[],
      tools,
      stopWhen: isStepCount(5),
      temperature: 0.2,
    });

    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
    });
  } catch (error) {
    console.error("copilot failed", error);
    return Response.json(
      {
        error:
          "Copilot gagal memanggil OpenCode Go. Cek key, model, dan kuota.",
      },
      { status: 502 },
    );
  }
}
