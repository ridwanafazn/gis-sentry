import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, FileText, Map, Search, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Tentang GIS Sentry",
  description:
    "Alat bantu keputusan ekspansi minimarket di Subang, dengan peta, shortlist, memo, dan copilot yang menyitir sumber.",
};

export default function AboutPage() {
  return (
    <>
      <section className="about-hero">
        <h1>GIS Sentry</h1>
        <p className="about-lead">
          Alat bantu keputusan untuk ekspansi minimarket di Subang. GIS Sentry
          menggabungkan peta, skor lokasi, simulasi kanibalisasi, shortlist,
          memo, dan copilot yang menjawab dari data serta dokumen.
        </p>
        <div className="about-actions">
          <Link className="about-button primary" href="/">
            <Map size={15} strokeWidth={1.75} />
            Buka peta
          </Link>
          <Link className="about-button" href="/about/api">
            API
            <ArrowUpRight size={14} strokeWidth={1.75} />
          </Link>
          <Link className="about-button" href="/about/glossary">
            Glosarium
            <ArrowUpRight size={14} strokeWidth={1.75} />
          </Link>
        </div>
        <figure className="about-preview">
          <Image
            alt="Peta skor H3 Subang, panel shortlist kandidat, dan copilot dalam antarmuka GIS Sentry."
            height={900}
            loading="eager"
            sizes="(max-width: 900px) 100vw, 900px"
            src="/about-app.png"
            width={1440}
          />
          <figcaption>
            Peta skor H3, shortlist kandidat, dan copilot dalam satu layar.
          </figcaption>
        </figure>
      </section>

      <section className="about-section">
        <h2>Untuk siapa</h2>
        <div className="about-rows">
          <div className="about-row">
            <strong>Expansion manager</strong>
            <p>
              Menyusun shortlist lokasi, memeriksa alasan skor, dan membawa memo
              ke rapat ekspansi.
            </p>
          </div>
          <div className="about-row">
            <strong>Pemilik franchise</strong>
            <p>
              Melihat kandidat yang layak dan memahami batas data sebelum
              mengambil keputusan sewa.
            </p>
          </div>
          <div className="about-row">
            <strong>Analis GIS</strong>
            <p>
              Memeriksa data, menjalankan simulasi, dan mengekspor memo dengan
              sumber yang dapat dilacak.
            </p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Cara kerja</h2>
        <ol className="about-steps">
          <li>
            <span className="about-step-number">1</span>
            <div>
              <strong>Data spasial</strong>
              <p>
                Minimarket, anchor, jalan, dan populasi WorldPop diolah menjadi
                grid H3 resolusi 9.
              </p>
            </div>
          </li>
          <li>
            <span className="about-step-number">2</span>
            <div>
              <strong>Skor weighted-v1</strong>
              <p>
                Demand 45 persen, kompetisi 25 persen, akses 20 persen, dan
                risiko 10 persen. Skor adalah persentil relatif AOI.
              </p>
            </div>
          </li>
          <li>
            <span className="about-step-number">3</span>
            <div>
              <strong>Shortlist dan simulasi</strong>
              <p>
                Kandidat diurutkan, lalu gross dan net diuji dengan buffer
                radial 3 km per jaringan.
              </p>
            </div>
          </li>
          <li>
            <span className="about-step-number">4</span>
            <div>
              <strong>Memo dan copilot</strong>
              <p>
                Decision memo menyimpan dekomposisi skor. Copilot hanya menjawab
                dari tool dan dokumen, lalu menampilkan sitasi.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="about-section">
        <h2>Batas yang harus terlihat</h2>
        <ul className="about-limits">
          <li>
            Skor adalah persentil relatif di AOI 10 km, bukan probabilitas
            profit atau revenue.
          </li>
          <li>
            Risiko banjir dan zonasi masih placeholder. InaRISK dan RDTR belum
            terhubung.
          </li>
          <li>
            Populasi memakai WorldPop 2020. Kalibrasi BPS per kecamatan belum
            dilakukan.
          </li>
          <li>Simulasi kanibalisasi memakai buffer radial, belum isochrone.</li>
        </ul>
      </section>

      <section className="about-section">
        <h2>Jelajahi</h2>
        <div className="about-links">
          <Link className="about-link" href="/about/api">
            <span className="about-link-icon">
              <FileText size={18} strokeWidth={1.75} />
            </span>
            <span>
              <strong>API dan endpoint</strong>
              <span>
                Health, tile MVT, simulasi, copilot, RAG, dan memo PDF.
              </span>
            </span>
            <ArrowUpRight size={16} strokeWidth={1.75} />
          </Link>
          <Link className="about-link" href="/about/glossary">
            <span className="about-link-icon">
              <Search size={18} strokeWidth={1.75} />
            </span>
            <span>
              <strong>Glosarium</strong>
              <span>
                Arti H3, anchor, LightGBM, kanibalisasi, RAG, dan istilah lain.
              </span>
            </span>
            <ArrowUpRight size={16} strokeWidth={1.75} />
          </Link>
          <Link className="about-link" href="/model">
            <span className="about-link-icon">
              <ShieldCheck size={18} strokeWidth={1.75} />
            </span>
            <span>
              <strong>Model report</strong>
              <span>
                Bukti evaluasi LightGBM dan alasan weighted-v1 tetap dipakai.
              </span>
            </span>
            <ArrowUpRight size={16} strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </>
  );
}
