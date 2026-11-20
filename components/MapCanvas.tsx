"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Layers, Site } from "@/lib/types";

const BASEMAP =
  process.env.NEXT_PUBLIC_BASEMAP_STYLE ??
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const CENTER: [number, number] = [107.7583, -6.5716];

const SCORE_COLOR = [
  "interpolate",
  ["linear"],
  ["get", "score"],
  0,
  "#7f1d1d",
  25,
  "#b45309",
  50,
  "#eab308",
  75,
  "#22c55e",
  100,
  "#06b6d4",
];

function aoiPolygon(lat: number, lng: number, radiusKm: number) {
  const points = 96;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const dx = (radiusKm / 111.32) * Math.cos(angle);
    const dy = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    coords.push([lng + dy, lat + dx]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coords] },
  };
}

type Props = {
  layers: Layers;
  selected: Site | null;
  focus: { lng: number; lat: number; h3?: string } | null;
  onSelect: (site: Site) => void;
};

export default function MapCanvas({ layers, selected, focus, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      // Next/Turbopack resolves MapLibre's internal worker URL incorrectly in dev.
      // Serving the worker from /public keeps it stable in dev and production.
      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP,
        center: CENTER,
        zoom: 11.4,
        minZoom: 4,
        maxZoom: 18,
        attributionControl: { compact: true },
      });

      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

      map.on("load", async () => {
        if (cancelled) return;

        const [stores, anchors] = await Promise.all([
          fetch("/data/stores.geojson").then((r) => r.json()),
          fetch("/data/anchors.geojson").then((r) => r.json()),
        ]);

        if (cancelled) return;

        map.addSource("aoi", {
          type: "geojson",
          data: aoiPolygon(-6.5716, 107.7583, 10) as GeoJSON.Feature,
        });
        map.addSource("h3", {
          type: "vector",
          tiles: ["/api/tiles/{z}/{x}/{y}"],
          minzoom: 8,
          maxzoom: 14,
        });
        map.addSource("stores", { type: "geojson", data: stores });
        map.addSource("anchors", { type: "geojson", data: anchors });

        map.addLayer({
          id: "aoi-line",
          type: "line",
          source: "aoi",
          paint: {
            "line-color": "rgba(148, 163, 184, 0.55)",
            "line-width": 1,
            "line-dasharray": [3, 3],
          },
        });

        map.addLayer({
          id: "h3-fill",
          type: "fill",
          source: "h3",
          "source-layer": "h3",
          paint: {
            // Static fallback; gradient diterapkan setelah source siap.
            "fill-color": "#eab308",
            "fill-opacity": 0.44,
          },
        });

        map.addLayer({
          id: "h3-line",
          type: "line",
          source: "h3",
          "source-layer": "h3",
          paint: {
            "line-color": "rgba(255, 255, 255, 0.14)",
            "line-width": 0.35,
          },
        });

        map.addLayer({
          id: "h3-selected",
          type: "line",
          source: "h3",
          "source-layer": "h3",
          filter: ["==", ["get", "h3"], ""],
          paint: {
            "line-color": "#a7f3d0",
            "line-width": 2.4,
            "line-opacity": 0.95,
          },
        });

        map.addLayer({
          id: "anchors",
          type: "circle",
          source: "anchors",
          paint: {
            "circle-radius": 2.4,
            "circle-color": "#fbbf24",
            "circle-opacity": 0.62,
            "circle-stroke-color": "#3b2a05",
            "circle-stroke-width": 0.5,
          },
        });

        map.addLayer({
          id: "stores",
          type: "circle",
          source: "stores",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              3.2,
              14,
              6.2,
            ],
            "circle-color": [
              "match",
              ["get", "brand"],
              "Indomaret",
              "#fb7185",
              "Alfamart",
              "#38bdf8",
              "Alfamidi",
              "#a78bfa",
              "#94a3b8",
            ],
            "circle-stroke-color": "#05080b",
            "circle-stroke-width": 1.2,
          },
        });

        map.on("click", "h3-fill", (event) => {
          const feature = event.features?.[0];
          if (!feature?.properties) return;
          onSelect(feature.properties as unknown as Site);
        });

        map.on("mouseenter", "h3-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "h3-fill", () => {
          map.getCanvas().style.cursor = "";
        });

        setReady(true);
      });
    }

    boot();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (map.getLayer("h3-fill")) {
      map.setPaintProperty("h3-fill", "fill-color", SCORE_COLOR as never);
    }

    const set = (id: string, visible: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    };

    set("h3-fill", layers.scores);
    set("h3-line", layers.scores);
    set("h3-selected", layers.scores);
    set("stores", layers.stores);
    set("anchors", layers.anchors);
  }, [layers, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = selected?.h3 ?? "";
    if (map.getLayer("h3-selected")) {
      map.setFilter("h3-selected", ["==", ["get", "h3"], id]);
    }
  }, [selected, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) return;
    map.flyTo({ center: [focus.lng, focus.lat], zoom: 14.2, duration: 900 });
  }, [focus, ready]);

  return <div ref={containerRef} className="map" aria-label="Peta skor lokasi Subang" />;
}
