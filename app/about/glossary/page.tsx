import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Glosarium — GIS Sentry",
  description:
    "Arti istilah GIS, data spasial, model, dan copilot yang dipakai di GIS Sentry.",
};

const TERMS = [
  {
    id: "h3",
    term: "H3",
    description:
      "Sistem grid heksagonal dari Uber yang membagi bumi menjadi sel dengan ID unik. GIS Sentry memakai H3 agar skor, populasi, dan simulasi bisa dibandingkan per area yang rapi.",
  },
  {
    id: "resolusi-9",
    term: "Resolusi 9",
    description:
      "Tingkat detail H3 yang dipakai di demo ini. Sel resolusi 9 berukuran ratusan meter, cukup untuk analisis lokasi tingkat kota.",
  },
  {
    id: "aoi",
    term: "AOI",
    description:
      "Area of Interest, yaitu batas wilayah analisis. Demo ini memakai radius 10 km dari pusat Kota Subang.",
  },
  {
    id: "anchor",
    term: "Anchor POI",
    description:
      "Tempat yang menarik kunjungan, seperti sekolah, kantor, pasar, atau rumah sakit. Anchor dipakai sebagai proxy permintaan di sekitar lokasi.",
  },
  {
    id: "minimarket",
    term: "Minimarket",
    description:
      "Gerai jaringan seperti Alfamart, Indomaret, dan Alfamidi. Data gerai dipakai untuk menghitung kompetisi dan kanibalisasi.",
  },
  {
    id: "weighted-v1",
    term: "weighted-v1",
    description:
      "Model skor produksi yang menggabungkan demand, kompetisi, akses, dan risiko dengan bobot tetap. Model ini transparan dan tidak memakai training label lokal.",
  },
  {
    id: "demand",
    term: "Demand",
    description:
      "Perkiraan permintaan dari populasi WorldPop dan kepadatan anchor di sekitar sel. Bobotnya 45 persen pada weighted-v1.",
  },
  {
    id: "kompetisi",
    term: "Kompetisi",
    description:
      "Tekanan dari gerai minimarket lain di sekitar lokasi. Semakin banyak gerai berdekatan, semakin tinggi tekanan kompetisi.",
  },
  {
    id: "akses",
    term: "Akses",
    description:
      "Kemudahan lokasi dijangkau, didekati lewat jarak ke jalan arteri atau kolektor dan pusat aktivitas.",
  },
  {
    id: "risiko",
    term: "Risiko",
    description:
      "Komponen 10 persen yang disiapkan untuk banjir, zonasi, dan constraint lain. Pada demo ini nilainya masih placeholder 0 karena InaRISK dan RDTR belum terhubung.",
  },
  {
    id: "persentil",
    term: "Persentil",
    description:
      "Peringkat relatif di dalam AOI. Skor 80 berarti masuk 20 persen teratas AOI, bukan peluang sukses 80 persen.",
  },
  {
    id: "catchment",
    term: "Catchment",
    description:
      "Wilayah sekitar lokasi yang menjadi sumber kunjungan. Di memo, catchment diringkas lewat populasi dan anchor dalam radius 1,5 km.",
  },
  {
    id: "kanibalisasi",
    term: "Kanibalisasi",
    description:
      "Penurunan penjualan gerai baru karena mengambil pelanggan dari gerai sendiri di sekitar lokasi. Dihitung dari gross menjadi net.",
  },
  {
    id: "gross-net",
    term: "Gross dan net",
    description:
      "Gross adalah skor awal sebelum kanibalisasi. Net adalah skor setelah overlap dengan gerai jaringan sendiri dikurangi.",
  },
  {
    id: "mvt",
    term: "MVT",
    description:
      "Mapbox Vector Tile, format tile vektor yang dikirim ke peta. GIS Sentry membuat MVT langsung dari PostGIS dengan ST_AsMVT.",
  },
  {
    id: "postgis",
    term: "PostGIS",
    description:
      "Ekstensi spasial PostgreSQL untuk menyimpan geometri, menghitung jarak, dan membangun tile. Database produksi berjalan di Neon.",
  },
  {
    id: "lightgbm",
    term: "LightGBM",
    description:
      "Model gradient boosting yang diuji sebagai ranker alternatif. Hasilnya kalah dari weighted-v1 saat ditransfer ke Subang, jadi tidak dipakai di produksi.",
  },
  {
    id: "spatial-cv",
    term: "Spatial block CV",
    description:
      "Validasi silang yang membagi data berdasarkan blok spasial, bukan acak. Tujuannya mengurangi kebocoran informasi antar wilayah yang berdekatan.",
  },
  {
    id: "holdout",
    term: "Holdout",
    description:
      "Wilayah yang dipisahkan dari training untuk menguji transfer model. Subang dipakai sebagai holdout pada evaluasi LightGBM.",
  },
  {
    id: "precision-k",
    term: "Precision@K",
    description:
      "Proporsi kandidat relevan di antara K kandidat teratas. Dipakai untuk mengukur kualitas ranking.",
  },
  {
    id: "ndcg",
    term: "NDCG@K",
    description:
      "Metrik ranking yang memberi bobot lebih besar pada kandidat relevan di posisi atas.",
  },
  {
    id: "roc-auc",
    term: "ROC-AUC",
    description:
      "Ukuran kemampuan model membedakan kelas positif dan negatif di seluruh ambang batas.",
  },
  {
    id: "rag",
    term: "RAG",
    description:
      "Retrieval-augmented generation. Copilot mencari dokumen yang relevan terlebih dahulu, lalu memakai hasilnya sebagai dasar jawaban.",
  },
  {
    id: "bm25",
    term: "BM25",
    description:
      "Algoritma ranking teks yang dipakai retriever dokumen. Hasil pencariannya diberi skor dan heading sumber.",
  },
  {
    id: "sitasi",
    term: "Sitasi",
    description:
      "Rujukan ke dokumen dan heading yang dipakai copilot. Di UI, sitasi tampil sebagai chip sumber di bawah jawaban.",
  },
  {
    id: "worldpop",
    term: "WorldPop",
    description:
      "Dataset populasi raster 2020 yang dipakai untuk memperkirakan jumlah penduduk di sekitar sel H3.",
  },
  {
    id: "overture",
    term: "Overture Places",
    description:
      "Dataset tempat dan POI yang dipakai sebagai label evaluasi model, bukan sebagai skor produksi.",
  },
  {
    id: "decision-memo",
    term: "Decision memo",
    description:
      "Ringkasan satu halaman berisi skor, faktor, catchment, kanibalisasi, batasan, dan rekomendasi. Tersedia sebagai halaman dan PDF.",
  },
];

export default function AboutGlossaryPage() {
  return (
    <>
      <div className="about-back">
        <Link href="/about">
          <ArrowLeft size={13} strokeWidth={1.75} />
          Tentang
        </Link>
      </div>

      <section className="about-hero compact">
        <h1>Glosarium</h1>
        <p className="about-lead">
          Istilah yang muncul di peta, memo, laporan model, dan copilot.
          Definisi ditulis singkat agar bisa dipakai saat membaca data atau
          rapat ekspansi.
        </p>
      </section>

      <section className="about-section glossary-section">
        <dl className="glossary-list">
          {TERMS.map((item) => (
            <div className="glossary-item" id={item.id} key={item.id}>
              <dt>{item.term}</dt>
              <dd>{item.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="about-section">
        <h2>Batas yang perlu diingat</h2>
        <p className="about-note">
          Glosarium ini menjelaskan cara GIS Sentry membaca data, bukan klaim
          legal atau finansial. Validasi lapangan, zonasi, dan negosiasi sewa
          tetap diperlukan.
        </p>
      </section>

      <div className="about-next">
        <Link href="/about/api">
          Lihat API
          <ArrowUpRight size={14} strokeWidth={1.75} />
        </Link>
      </div>
    </>
  );
}
