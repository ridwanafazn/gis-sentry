"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

type Props = {
  h3: string;
  chain: string;
};

export default function MemoActions({ h3, chain }: Props) {
  const pdfUrl = `/api/memo?h3=${encodeURIComponent(h3)}&chain=${encodeURIComponent(chain)}`;

  return (
    <div className="memo-actions">
      <Link href="/">
        <ArrowLeft size={13} strokeWidth={1.75} />
        Kembali ke peta
      </Link>
      <div className="memo-actions-right">
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          <Download size={13} strokeWidth={1.75} />
          Unduh PDF
        </a>
        <button type="button" onClick={() => window.print()}>
          <Printer size={13} strokeWidth={1.75} />
          Cetak
        </button>
      </div>
    </div>
  );
}
