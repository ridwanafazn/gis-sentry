import Link from "next/link";
import { ArrowLeft, MapPinned } from "lucide-react";

export default function AboutHeader() {
  return (
    <header className="about-header">
      <Link className="about-brand" href="/about">
        <span className="about-brand-mark" aria-hidden="true">
          <MapPinned size={18} strokeWidth={1.75} />
        </span>
        <span>
          <span className="about-brand-title">GIS Sentry</span>
          <span className="about-brand-sub">Retail site intelligence</span>
        </span>
      </Link>

      <nav className="about-nav" aria-label="Navigasi tentang aplikasi">
        <Link href="/">
          <ArrowLeft size={13} strokeWidth={1.75} />
          Peta
        </Link>
        <Link href="/about/api">API</Link>
        <Link href="/about/glossary">Glosarium</Link>
        <Link href="/model">Model</Link>
      </nav>
    </header>
  );
}
