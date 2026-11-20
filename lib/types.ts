export type Site = {
  rank?: number;
  h3: string;
  score: number;
  demand: number;
  competition: number;
  access: number;
  risk: number;
  stores_1km: number;
  anchors_1_5km: number;
  nearest_store_km: number | null;
  nearest_road_km?: number;
  population_1_5km?: number;
  dist_center_km: number;
  lat: number;
  lng: number;
  model?: string;
};

export type Meta = {
  generatedAt: string;
  model: string;
  note: string;
  center: { lat: number; lng: number };
  radiusKm: number;
  h3Resolution: number;
  counts: {
    stores: number;
    brandedStores: number;
    anchors: number;
    h3Cells: number;
    candidateSites: number;
  };
};

export type Layers = {
  scores: boolean;
  stores: boolean;
  anchors: boolean;
};
