"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Layers, Site } from "@/lib/types";

const BASEMAP =
  process.env.NEXT_PUBLIC_BASEMAP_STYLE ??
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const CENTER: [number, number] = [107.7583, -6.5716];

const SCORE_COLOR = [
  "interpolate",
  ["linear"],
  ["get", "score"],
  0,
  "#ede9dd",
  25,
  "#d8e5dc",
  50,
  "#a9c8b7",
  75,
  "#5d9a7b",
  100,
  "#1f6b4f",
];

function aoiPolygon(lat: number, lng: number, radiusKm: number) {
  const points = 96;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const dx = (radiusKm / 111.32) * Math.cos(angle);
    const dy =
      (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
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
  bottomInset?: number;
  onSelect: (site: Site) => void;
};

export default function MapCanvas({
  layers,
  selected,
  focus,
  bottomInset = 0,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    async function boot() {
      // Let the shell and shortlist paint before MapLibre takes the main thread.
      await new Promise<void>((resolve) => {
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(() => resolve(), { timeout: 700 });
        } else {
          window.setTimeout(resolve, 120);
        }
      });

      if (cancelled) return;

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
      map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        "top-right",
      );
      map.addControl(
        new maplibregl.ScaleControl({ unit: "metric" }),
        "bottom-right",
      );

      if (containerRef.current) {
        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(containerRef.current);
      }

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

        // Keep H3 paint below basemap labels so place names stay readable.
        const beforeLabel = map
          .getStyle()
          .layers.find((layer) => layer.type === "symbol")?.id;

        map.addLayer(
          {
            id: "aoi-line",
            type: "line",
            source: "aoi",
            paint: {
              "line-color": "rgba(27, 33, 28, 0.35)",
              "line-width": 1.2,
              "line-dasharray": [3, 3],
            },
          },
          beforeLabel,
        );

        map.addLayer(
          {
            id: "h3-fill",
            type: "fill",
            source: "h3",
            "source-layer": "h3",
            paint: {
              // Static fallback; ramp diterapkan setelah source siap.
              "fill-color": "#d8e5dc",
              "fill-opacity": 0.5,
            },
          },
          beforeLabel,
        );

        map.addLayer(
          {
            id: "h3-line",
            type: "line",
            source: "h3",
            "source-layer": "h3",
            paint: {
              "line-color": "rgba(27, 33, 28, 0.14)",
              "line-width": 0.45,
            },
          },
          beforeLabel,
        );

        map.addLayer(
          {
            id: "h3-selected-fill",
            type: "fill",
            source: "h3",
            "source-layer": "h3",
            filter: ["==", ["get", "h3"], ""],
            paint: {
              "fill-color": "#1f6b4f",
              "fill-opacity": 0.16,
            },
          },
          beforeLabel,
        );

        map.addLayer(
          {
            id: "h3-hover",
            type: "fill",
            source: "h3",
            "source-layer": "h3",
            filter: ["==", ["get", "h3"], ""],
            paint: {
              "fill-color": "#1b211c",
              "fill-opacity": 0.05,
            },
          },
          beforeLabel,
        );

        map.addLayer({
          id: "anchors",
          type: "circle",
          source: "anchors",
          paint: {
            "circle-radius": 2.8,
            "circle-color": "#8a5a12",
            "circle-opacity": 0.7,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 0.7,
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
              3.6,
              14,
              7,
            ],
            "circle-color": [
              "match",
              ["get", "brand"],
              "Indomaret",
              "#a13b32",
              "Alfamart",
              "#315e7a",
              "Alfamidi",
              "#6b5b95",
              "#8a8375",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.4,
          },
        });

        map.addLayer({
          id: "h3-selected",
          type: "line",
          source: "h3",
          "source-layer": "h3",
          filter: ["==", ["get", "h3"], ""],
          paint: {
            "line-color": "#1b211c",
            "line-width": 2.4,
            "line-opacity": 0.95,
          },
        });

        map.on("click", "h3-fill", (event) => {
          const feature = event.features?.[0];
          if (!feature?.properties) return;
          onSelect(feature.properties as unknown as Site);
        });

        let hoveredH3 = "";
        map.on("mousemove", "h3-fill", (event) => {
          const h3 = event.features?.[0]?.properties?.h3 as string | undefined;
          if (h3 === hoveredH3) return;
          hoveredH3 = h3 ?? "";
          if (map.getLayer("h3-hover")) {
            map.setFilter("h3-hover", ["==", ["get", "h3"], hoveredH3]);
          }
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "h3-fill", () => {
          hoveredH3 = "";
          if (map.getLayer("h3-hover")) {
            map.setFilter("h3-hover", ["==", ["get", "h3"], ""]);
          }
          map.getCanvas().style.cursor = "";
        });

        setReady(true);
      });
    }

    boot();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
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
    set("h3-selected-fill", layers.scores);
    set("h3-hover", layers.scores);
    set("h3-selected", layers.scores);
    set("stores", layers.stores);
    set("anchors", layers.anchors);
  }, [layers, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = selected?.h3 ?? "";
    for (const layer of ["h3-selected", "h3-selected-fill"]) {
      if (map.getLayer(layer)) {
        map.setFilter(layer, ["==", ["get", "h3"], id]);
      }
    }
  }, [selected, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    map.setPadding({
      top: 0,
      right: 0,
      bottom: bottomInset,
      left: 0,
    });
  }, [bottomInset, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) return;

    map.flyTo({
      center: [focus.lng, focus.lat],
      zoom: 14.2,
      duration: 900,
      padding: {
        top: 0,
        right: 0,
        bottom: bottomInset,
        left: 0,
      },
    });
  }, [focus, ready, bottomInset]);

  return (
    <div
      ref={containerRef}
      className="map"
      role="region"
      aria-label="Peta skor lokasi Subang"
    >
      <span className="sr-only">
        Peta interaktif. Daftar kandidat di panel menyediakan alternatif tanpa
        peta.
      </span>
    </div>
  );
}
