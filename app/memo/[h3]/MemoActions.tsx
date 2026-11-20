"use client";

import Link from "next/link";

type Props = {
  h3: string;
  chain: string;
};

export default function MemoActions({ h3, chain }: Props) {
  const pdfUrl = `/api/memo?h3=${encodeURIComponent(h3)}&chain=${encodeURIComponent(chain)}`;

  return (
    <div className="memo-actions">
      <Link href={`/?site=${encodeURIComponent(h3)}`}>← Kembali ke peta</Link>
      <a href={pdfUrl} target="_blank" rel="noreferrer">
        Unduh PDF
      </a>
      <button type="button" onClick={() => window.print()}>
        Cetak
      </button>
    </div>
  );
}
