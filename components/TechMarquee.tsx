import {
  Atom,
  Braces,
  Cloud,
  Component,
  Cpu,
  Database,
  Globe2,
  Layers,
  Map,
  MapPinned,
  Search,
  ShieldCheck,
  Triangle,
  Type,
} from "lucide-react";

const TECH = [
  { name: "OpenStreetMap", Icon: MapPinned },
  { name: "WorldPop", Icon: Globe2 },
  { name: "Next.js", Icon: Component },
  { name: "React", Icon: Atom },
  { name: "TypeScript", Icon: Braces },
  { name: "Vercel", Icon: Triangle },
  { name: "Neon", Icon: Database },
  { name: "PostGIS", Icon: Layers },
  { name: "MapLibre", Icon: Map },
  { name: "IBM Plex", Icon: Type },
  { name: "Zod", Icon: ShieldCheck },
  { name: "AI SDK", Icon: Cpu },
  { name: "BM25 RAG", Icon: Search },
] as const;

function TechGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="tech-group" aria-hidden={hidden || undefined}>
      {TECH.map(({ name, Icon }) => (
        <span className="tech-item" key={`${name}-${hidden ? "b" : "a"}`}>
          <Icon size={16} strokeWidth={1.75} />
          {name}
        </span>
      ))}
    </div>
  );
}

export default function TechMarquee() {
  return (
    <footer className="tech-marquee" aria-label="Teknologi yang dipakai">
      <div className="tech-marquee-label">Dibangun dengan</div>
      <div className="tech-track">
        <TechGroup />
        <TechGroup hidden />
      </div>
    </footer>
  );
}
