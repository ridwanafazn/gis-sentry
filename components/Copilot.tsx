"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  MessageSquare,
  Send,
  Square,
} from "lucide-react";

type Msg = {
  role: "user" | "assistant" | "error";
  content: string;
};

const INITIAL: Msg = {
  role: "assistant",
  content:
    "Tanya data lokasi. Jawaban memakai skor Subang; sumber dokumen tampil sebagai chip di bawah jawaban.",
};

const PROMPTS = [
  "5 kandidat teratas",
  "Kenapa kandidat #1?",
  "Batas skor ini",
  "Checklist survei",
  "Kompetitor terdekat",
];

type Citation = {
  raw: string;
  source: string;
  heading: string;
};

function renderInline(text: string) {
  return text
    .replace(/^[-*]\s+/gm, "• ")
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
}

function parseCitations(content: string) {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  const normalized = content
    .replace(/\]\(source\)/g, "]")
    .replace(/\[\[/g, "[")
    .replace(/\]\]/g, "]");

  const text = normalized
    .replace(
      /^(I'll|I will|Let me)\s+(check|look up|find)[^\n.!?]*[.!?]\s*/i,
      "",
    )
    .replace(/\[([^\[\]\n]+?)\]/g, (full, inner) => {
      if (!inner.includes("§")) return full;

      let found = false;
      for (const part of inner.split(/[;,]\s*/)) {
        const match = part.match(/^([A-Za-z0-9_./-]+)\s*§\s*(.+)$/);
        if (!match) continue;

        const source = match[1].trim();
        const heading = match[2].trim();
        const known =
          source === "README.md" ||
          source.startsWith("docs/") ||
          source.startsWith("data/knowledge/");

        if (!known) continue;

        found = true;
        const raw = `${source} § ${heading}`;
        if (!seen.has(raw)) {
          seen.add(raw);
          citations.push({ raw, source, heading });
        }
      }

      return found ? "" : full;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*&\s*/g, " dan ")
    .replace(/\s*:\s+/g, ". ")
    .replace(/([.!?]\s+)([a-z])/g, (_, punctuation, letter) => {
      return punctuation + letter.toUpperCase();
    })
    .replace(/\s+([.,;!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, citations };
}

export default function Copilot() {
  const [messages, setMessages] = useState<Msg[]>([INITIAL]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;

    setInput("");
    const userMsg: Msg = { role: "user", content };
    const history = [...messages, userMsg];

    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history.map((m) => ({
            role: m.role === "error" ? "assistant" : m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "error",
            content: data.error ?? `Copilot gagal (HTTP ${res.status}).`,
          };
          return copy;
        });
        return;
      }

      if (!res.body) throw new Error("Stream kosong");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];

        if (controller.signal.aborted) {
          if (last?.role === "assistant" && !last.content) {
            copy[copy.length - 1] = {
              role: "assistant",
              content: "Jawaban dihentikan.",
            };
          }
          return copy;
        }

        copy[copy.length - 1] = {
          role: "error",
          content:
            "Copilot tidak merespons. Coba lagi; jika berulang, cek konfigurasi server.",
        };
        return copy;
      });
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  return (
    <div
      className={`copilot ${open ? "is-open" : "is-collapsed"}`}
      aria-busy={busy}
    >
      <div className="copilot-head">
        <h2 className="copilot-title">
          <MessageSquare size={14} strokeWidth={1.75} />
          Copilot
        </h2>
        <div className="copilot-meta">
          <button
            type="button"
            className="copilot-toggle"
            aria-expanded={open}
            aria-controls="copilot-body"
            aria-label={open ? "Tutup copilot" : "Buka copilot"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <ChevronDown size={16} strokeWidth={1.75} />
            ) : (
              <ChevronUp size={16} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      <div className="copilot-body" id="copilot-body">
        <div
          className="messages"
          ref={scrollRef}
          role="log"
          aria-label="Riwayat percakapan"
          aria-live="polite"
          aria-busy={busy}
        >
          {messages.map((m, i) => {
            const pending =
              busy &&
              i === messages.length - 1 &&
              m.role === "assistant" &&
              !m.content;
            const parsed =
              m.role === "assistant" ? parseCitations(m.content) : null;
            const body = parsed?.text ?? m.content;

            return (
              <div
                key={i}
                className={`msg ${m.role}`}
                role={m.role === "error" ? "alert" : undefined}
              >
                {pending ? (
                  <span className="msg-pending">Menyusun jawaban…</span>
                ) : body ? (
                  <span className="msg-text">{renderInline(body)}</span>
                ) : (
                  "…"
                )}

                {parsed && parsed.citations.length > 0 ? (
                  <div className="msg-sources" aria-label="Sumber jawaban">
                    <span className="msg-sources-label">Sumber</span>
                    {parsed.citations.map((citation) => (
                      <span
                        className="citation-chip"
                        key={citation.raw}
                        title={citation.raw}
                        aria-label={`Sumber ${citation.raw}`}
                      >
                        <FileText size={11} strokeWidth={1.75} />
                        <span className="citation-copy">
                          <span className="citation-heading">
                            {citation.heading}
                          </span>
                          <span className="citation-source">
                            {citation.source.split("/").at(-1)}
                          </span>
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="prompts">
          {PROMPTS.map((prompt) => (
            <button
              type="button"
              className="prompt-chip"
              key={prompt}
              onClick={() => send(prompt)}
              disabled={busy}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Tanya soal lokasi…"
            autoComplete="off"
            disabled={busy}
            aria-label="Pertanyaan untuk copilot"
          />
          {busy ? (
            <button
              type="button"
              className="composer-stop"
              onClick={stop}
              aria-label="Hentikan jawaban"
            >
              <Square size={11} strokeWidth={1.75} />
              Hentikan
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="Kirim">
              <Send size={13} strokeWidth={1.75} />
              Kirim
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
