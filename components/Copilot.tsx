"use client";

import { useEffect, useRef, useState } from "react";

type Msg = {
  role: "user" | "assistant" | "error";
  content: string;
};

const INITIAL: Msg = {
  role: "assistant",
  content:
    "Copilot siap. Saya menjawab dari data skor Subang — bukan mengarang angka atau koordinat. Coba tanya kandidat terbaik, alasan skor, atau kompetitor terdekat.",
};

const PROMPTS = [
  "Tampilkan 5 kandidat terbaik",
  "Kenapa kandidat #1 skor tinggi?",
  "Kenapa weighted-v1?",
  "Apa itu kanibalisasi?",
  "Apa batasan skor ini?",
  "Checklist sebelum buka gerai?",
  "Di mana kompetitor terdekat?",
];

export default function Copilot() {
  const [messages, setMessages] = useState<Msg[]>([INITIAL]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role === "error" ? "assistant" : m.role, content: m.content })),
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
        copy[copy.length - 1] = {
          role: "error",
          content:
            "Koneksi ke copilot gagal. Pastikan OPENCODE_GO_API_KEY ada di .env.local dan server di-restart.",
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="copilot">
      <div className="copilot-head">
        <div className="copilot-title">
          <span className="spark" />
          Copilot
        </div>
        <div className="copilot-model">opencode-go · deepseek-v4.1-flash</div>
      </div>

      <div className="messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content || "…"}
          </div>
        ))}
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
          disabled={busy}
          aria-label="Pertanyaan untuk copilot"
        />
        <button type="submit" disabled={busy || !input.trim()}>
          {busy ? "…" : "Kirim"}
        </button>
      </form>
    </div>
  );
}
