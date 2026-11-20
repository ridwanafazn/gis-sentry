import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "API — GIS Sentry",
  description:
    "Endpoint produksi GIS Sentry untuk health, tile MVT, simulasi kanibalisasi, copilot, RAG, dan memo PDF.",
};

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  params: string;
  returns: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/health",
    title: "Health check",
    description:
      "Memeriksa koneksi PostGIS dan konfigurasi copilot. Dipakai untuk monitoring setelah deploy.",
    params: "Tidak ada.",
    returns:
      "JSON dengan ok, db, dbError, aiConfigured, productionModel, dan timestamp.",
  },
  {
    method: "GET",
    path: "/api/tiles/{z}/{x}/{y}",
    title: "Tile H3",
    description:
      "Mengembalikan tile MVT dari PostGIS. Layer h3 berisi skor, faktor, dan atribut sel.",
    params: "z, x, dan y dari skema tile standar.",
    returns:
      "application/vnd.mapbox-vector-tile, 204 saat tile kosong, 503 saat database tidak siap.",
  },
  {
    method: "GET",
    path: "/api/simulate",
    title: "Simulasi kanibalisasi",
    description:
      "Menghitung gross, net, dan gerai yang tumpang tindih untuk satu sel H3 dan satu jaringan.",
    params: "h3 dan chain. Nilai chain adalah Alfamart atau Indomaret.",
    returns:
      "JSON berisi h3, chain, radiusM, grossScore, netScore, cannibalization, dan stores.",
  },
  {
    method: "POST",
    path: "/api/copilot",
    title: "Copilot streaming",
    description:
      "Menjalankan copilot dengan tool top_sites, site_detail, dan search_docs. Jawaban dikirim sebagai teks streaming.",
    params:
      "Body JSON messages berisi role dan content. Maksimal 30 pesan, tiap pesan 8.000 karakter.",
    returns:
      "text/plain streaming. Error JSON 400, 502, atau 503 saat konfigurasi belum siap.",
  },
  {
    method: "GET",
    path: "/api/knowledge",
    title: "Pencarian dokumen",
    description:
      "Menguji retriever BM25 pada indeks dokumen produk dan metodologi.",
    params: "q untuk query dan limit opsional.",
    returns:
      "JSON berisi hasil dengan source, heading, text, score, dan citation.",
  },
  {
    method: "GET",
    path: "/api/memo",
    title: "Decision memo PDF",
    description:
      "Membuat memo A4 dari data PostGIS. Memakai format paper, ink, dan forest yang sama dengan aplikasi.",
    params: "h3 dan chain. Nilai chain adalah Alfamart atau Indomaret.",
    returns: "application/pdf dengan nama gis-sentry-memo-<h3>.pdf.",
  },
  {
    method: "GET",
    path: "/memo/{h3}",
    title: "Halaman memo",
    description:
      "Versi web dan cetak dari decision memo. Halaman ini memakai stylesheet print A4.",
    params: "h3 di path dan chain di query.",
    returns: "HTML satu halaman dengan tombol unduh dan cetak.",
  },
  {
    method: "GET",
    path: "/model",
    title: "Model report",
    description:
      "Laporan evaluasi LightGBM dan weighted-v1, termasuk spatial CV, holdout Subang, dan feature importance.",
    params: "Tidak ada.",
    returns: "HTML report dengan tabel responsif.",
  },
];

export default function AboutApiPage() {
  return (
    <>
      <div className="about-back">
        <Link href="/about">
          <ArrowLeft size={13} strokeWidth={1.75} />
          Tentang
        </Link>
      </div>

      <section className="about-hero compact">
        <h1>API dan endpoint</h1>
        <p className="about-lead">
          Endpoint publik yang dipakai aplikasi ini. API demo ini belum memakai
          autentikasi pengguna atau rate limit, jadi jangan dipakai untuk beban
          produksi terbuka.
        </p>
      </section>

      <section className="about-section">
        <h2>Daftar endpoint</h2>
        <div className="api-list">
          {ENDPOINTS.map((endpoint) => (
            <article className="api-item" key={endpoint.path}>
              <div className="api-signature">
                <span className={`api-method ${endpoint.method.toLowerCase()}`}>
                  {endpoint.method}
                </span>
                <code>{endpoint.path}</code>
              </div>
              <h3>{endpoint.title}</h3>
              <p>{endpoint.description}</p>
              <dl className="api-meta">
                <div>
                  <dt>Parameter</dt>
                  <dd>{endpoint.params}</dd>
                </div>
                <div>
                  <dt>Respons</dt>
                  <dd>{endpoint.returns}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2>Contoh pemeriksaan</h2>
        <pre className="about-code">
          <code>{`curl https://gis-sentry.vercel.app/api/health
curl -I https://gis-sentry.vercel.app/api/tiles/11/1636/1061
curl -I "https://gis-sentry.vercel.app/api/memo?h3=898c16aa36bffff&chain=Alfamart"`}</code>
        </pre>
        <p className="about-note">
          Ganti h3 dengan sel yang ingin diperiksa. Daftar kandidat ada di
          halaman peta dan tersedia lewat tool copilot.
        </p>
      </section>

      <section className="about-section">
        <h2>Batasan API</h2>
        <ul className="about-limits">
          <li>Tidak ada autentikasi publik. API ini untuk demo portofolio.</li>
          <li>
            Copilot membutuhkan konfigurasi model di server. Tanpa itu, endpoint
            mengembalikan 503.
          </li>
          <li>
            Tile bergantung pada PostGIS. Tanpa database, tile kosong dan health
            mengembalikan db false.
          </li>
        </ul>
      </section>

      <div className="about-next">
        <Link href="/about/glossary">
          Baca glosarium
          <ArrowUpRight size={14} strokeWidth={1.75} />
        </Link>
      </div>
    </>
  );
}
