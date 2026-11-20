import MapWorkspace from "@/components/MapWorkspace";
import meta from "@/public/data/meta.json";
import sites from "@/public/data/top-sites.json";
import type { Meta, Site } from "@/lib/types";

export default function Home() {
  return (
    <MapWorkspace initialMeta={meta as Meta} initialSites={sites as Site[]} />
  );
}
