import rawIndex from "@/public/data/rag/index.json";

type RagDoc = {
  id: number;
  source: string;
  heading: string;
  text: string;
  len: number;
  tf: Record<string, number>;
};

type RagIndex = {
  generatedAt: string;
  docs: RagDoc[];
  idf: Record<string, number>;
  avgLen: number;
  k1: number;
  b: number;
};

const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "adalah", "ini",
  "itu", "atau", "juga", "akan", "bisa", "tidak", "dalam", "sebagai", "oleh",
  "karena", "sudah", "lebih", "agar", "saat", "setelah", "sebelum", "antara",
  "tanpa", "harus", "dapat", "menjadi", "memiliki", "digunakan", "memakai",
  "the", "and", "of", "to", "in", "for", "with", "on", "is", "are", "as", "by",
  "that", "this", "from", "it", "be", "at", "or", "an", "we", "you", "not",
]);

const index = rawIndex as unknown as RagIndex;

function tokenize(text: string) {
  return (
    text
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 2 && !STOPWORDS.has(token)) ?? []
  );
}

export type RagResult = {
  source: string;
  heading: string;
  text: string;
  score: number;
  citation: string;
};

export function searchDocs(query: string, limit = 3): RagResult[] {
  const tokens = [...new Set(tokenize(query))];
  if (tokens.length === 0) return [];

  const results = index.docs
    .map((doc) => {
      let score = 0;
      for (const token of tokens) {
        const tf = doc.tf[token] ?? 0;
        if (tf === 0) continue;
        const idf = index.idf[token] ?? 0;
        const denom =
          tf + index.k1 * (1 - index.b + index.b * (doc.len / index.avgLen));
        score += idf * ((tf * (index.k1 + 1)) / denom);
      }
      const knowledgeBoost = doc.source.startsWith("data/knowledge/") ? 2.0 : 1;
      const metaPenalty =
        doc.source.includes("00-progress") || doc.source.includes("03-deploy")
          ? 0.7
          : 1;
      return { doc, score: score * knowledgeBoost * metaPenalty };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results.map(({ doc, score }) => ({
    source: doc.source,
    heading: doc.heading,
    text: doc.text,
    score: Number(score.toFixed(3)),
    citation: `${doc.source} § ${doc.heading}`,
  }));
}
