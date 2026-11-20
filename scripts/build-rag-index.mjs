import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FILES = [
  "README.md",
  "docs/00-progress.md",
  "docs/01-product-brief.md",
  "docs/02-model-evaluation.md",
  "docs/03-deploy.md",
  "data/knowledge/01-methodology.md",
  "data/knowledge/02-limitations.md",
  "data/knowledge/03-site-checklist.md",
  "data/knowledge/04-subang-context.md",
  "data/knowledge/05-model-evaluation.md",
];

const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "adalah", "ini",
  "itu", "atau", "juga", "akan", "bisa", "tidak", "dalam", "sebagai", "oleh",
  "karena", "sudah", "lebih", "agar", "saat", "setelah", "sebelum", "antara",
  "tanpa", "harus", "dapat", "menjadi", "memiliki", "digunakan", "memakai",
  "the", "and", "of", "to", "in", "for", "with", "on", "is", "are", "as", "by",
  "that", "this", "from", "it", "be", "at", "or", "an", "we", "you", "not",
]);

function tokenize(text) {
  return (
    text
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 2 && !STOPWORDS.has(token)) ?? []
  );
}

function clean(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkDocument(source, raw) {
  const sections = raw.split(/\n(?=## )/);
  const chunks = [];

  for (const section of sections) {
    const lines = section.split("\n");
    const headingLine = lines.find((line) => line.startsWith("#")) ?? source;
    const heading = headingLine.replace(/^#+\s*/, "").trim();
    const body = clean(lines.filter((line) => !line.startsWith("#")).join("\n"));
    if (!body) continue;

    const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    let buffer = "";

    for (const paragraph of paragraphs) {
      if (buffer && buffer.length + paragraph.length > 700) {
        chunks.push({ source, heading, text: buffer.trim() });
        buffer = "";
      }
      buffer += (buffer ? " " : "") + paragraph;
    }

    if (buffer.trim()) {
      chunks.push({ source, heading, text: buffer.trim() });
    }
  }

  return chunks;
}

const chunks = [];
for (const file of FILES) {
  let raw;
  try {
    raw = await readFile(path.join(ROOT, file), "utf8");
  } catch {
    console.warn(`[skip] ${file} tidak ditemukan`);
    continue;
  }
  const docChunks = chunkDocument(file, raw);
  chunks.push(...docChunks);
  console.log(`[rag] ${file}: ${docChunks.length} chunk`);
}

const docs = chunks.map((chunk, index) => {
  const tokens = tokenize(`${chunk.heading} ${chunk.text}`);
  const tf = {};
  for (const token of tokens) tf[token] = (tf[token] ?? 0) + 1;
  return {
    id: index,
    source: chunk.source,
    heading: chunk.heading,
    text: chunk.text,
    len: tokens.length,
    tf,
  };
});

const df = {};
for (const doc of docs) {
  for (const term of Object.keys(doc.tf)) df[term] = (df[term] ?? 0) + 1;
}

const N = docs.length;
const idf = {};
for (const [term, count] of Object.entries(df)) {
  idf[term] = Math.log(1 + (N - count + 0.5) / (count + 0.5));
}

const avgLen = docs.reduce((sum, doc) => sum + doc.len, 0) / Math.max(1, N);
const index = { generatedAt: new Date().toISOString(), docs, idf, avgLen, k1: 1.5, b: 0.75 };

await mkdir(path.join(ROOT, "data", "rag"), { recursive: true });
await mkdir(path.join(ROOT, "public", "data", "rag"), { recursive: true });
const payload = JSON.stringify(index);
await writeFile(path.join(ROOT, "data", "rag", "index.json"), payload, "utf8");
await writeFile(path.join(ROOT, "public", "data", "rag", "index.json"), payload, "utf8");

console.log(`[ok] ${docs.length} chunk, ${Object.keys(idf).length} term`);
