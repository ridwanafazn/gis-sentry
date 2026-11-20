CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS stores (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT 'Lainnya',
  category text NOT NULL DEFAULT 'convenience',
  lng double precision NOT NULL,
  lat double precision NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  geom geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS stores_geom_idx ON stores USING GIST (geom);
CREATE INDEX IF NOT EXISTS stores_brand_idx ON stores (brand);

CREATE TABLE IF NOT EXISTS anchors (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'unknown',
  lng double precision NOT NULL,
  lat double precision NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  geom geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS anchors_geom_idx ON anchors USING GIST (geom);
CREATE INDEX IF NOT EXISTS anchors_category_idx ON anchors (category);

CREATE TABLE IF NOT EXISTS roads (
  id text PRIMARY KEY,
  highway text NOT NULL DEFAULT 'unknown',
  name text NOT NULL DEFAULT '',
  geom geometry(LineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS roads_geom_idx ON roads USING GIST (geom);

CREATE TABLE IF NOT EXISTS h3_cells (
  h3 text PRIMARY KEY,
  score numeric NOT NULL DEFAULT 0,
  demand numeric NOT NULL DEFAULT 0,
  competition numeric NOT NULL DEFAULT 0,
  access numeric NOT NULL DEFAULT 0,
  risk numeric NOT NULL DEFAULT 0,
  stores_1km integer NOT NULL DEFAULT 0,
  anchors_1_5km integer NOT NULL DEFAULT 0,
  nearest_store_km numeric,
  nearest_road_km numeric,
  population_1_5km integer NOT NULL DEFAULT 0,
  dist_center_km numeric,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  geom geometry(Polygon, 4326) NOT NULL
);

ALTER TABLE h3_cells ADD COLUMN IF NOT EXISTS nearest_road_km numeric;
ALTER TABLE h3_cells ADD COLUMN IF NOT EXISTS population_1_5km integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS h3_cells_geom_idx ON h3_cells USING GIST (geom);
CREATE INDEX IF NOT EXISTS h3_cells_score_idx ON h3_cells (score DESC);
