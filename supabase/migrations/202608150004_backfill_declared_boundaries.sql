-- Phase 04.1 / GEOF-02: backfill de declared_boundary a partir dos QTAGs ja
-- existentes (Phase 3).
--
-- Fonte: project_tags no estado ATUAL, sem nenhum tratamento especial para
-- 202605260002_repair_legacy_qtag_geofences.sql. Aquela migration reescreveu
-- latitude/longitude em place num ponto anterior da ordem de migrations; nao
-- existe mais dado "bruto" para re-derivar. project_tags e, e sempre foi, a
-- unica fonte de verdade das coordenadas de vertice.
--
-- Ordenacao: mesma do runtime — centroide + atan2 de angulo polar
-- (_polygon_area em backend_app/modules/projects/service.py e
-- orderTagsForPolygon em src/services/projectOrigination.ts). Nao inventar
-- outra ordenacao (ex.: convex hull do PostGIS): projetos nao convexos
-- mudariam de forma e violariam "sem perda de area/vertices" (GEOF-02).
--
-- Ordem de coordenada: PostGIS e (X, Y) = (longitude, latitude), o INVERSO da
-- convencao (latitude, longitude) usada no resto deste repositorio.
--
-- Idempotente: upsert por project_id; reexecutar apenas re-deriva a geometria
-- do estado corrente de project_tags, nunca duplica linha.

with centroids as (
  select
    t.project_id,
    avg(t.latitude) as c_lat,
    avg(t.longitude) as c_lng,
    count(*) as vertex_count
  from public.project_tags t
  group by t.project_id
  having count(*) >= 4
),
ordered as (
  select
    t.project_id,
    t.latitude,
    t.longitude,
    atan2(t.latitude - c.c_lat, t.longitude - c.c_lng) as angle
  from public.project_tags t
  join centroids c on c.project_id = t.project_id
),
rings as (
  select
    o.project_id,
    -- ST_MakePoint(X, Y) = ST_MakePoint(longitude, latitude)
    ST_MakeLine(
      array_agg(
        ST_SetSRID(ST_MakePoint(o.longitude::float8, o.latitude::float8), 4326)
        order by o.angle
      )
    ) as open_line
  from ordered o
  group by o.project_id
),
polygons as (
  select
    r.project_id,
    -- ST_MakePolygon exige LineString fechada: repete o primeiro ponto no fim
    ST_MakePolygon(ST_AddPoint(r.open_line, ST_StartPoint(r.open_line))) as boundary
  from rings r
)
insert into project_boundaries (
  project_id,
  declared_boundary,
  declared_area_ha,
  declared_source,
  declared_vertex_count,
  active_boundary,
  active_boundary_tier,
  metadata
)
select
  p.project_id,
  p.boundary,
  -- ST_Area precisa do cast ::geography para devolver m2; sem ele o resultado
  -- sai em graus quadrados e nao vira hectare nenhum.
  round((ST_Area(p.boundary::geography) / 10000.0)::numeric, 4),
  'backfill_qtag_shoelace_v1',
  c.vertex_count,
  p.boundary,
  'DECLARED',
  jsonb_build_object('backfill_migration', '202608150004_backfill_declared_boundaries')
from polygons p
join centroids c on c.project_id = p.project_id
where ST_IsValid(p.boundary)
on conflict (project_id) do update set
  declared_boundary = excluded.declared_boundary,
  declared_area_ha = excluded.declared_area_ha,
  declared_source = excluded.declared_source,
  declared_vertex_count = excluded.declared_vertex_count,
  active_boundary = excluded.active_boundary,
  active_boundary_tier = excluded.active_boundary_tier,
  updated_at = now();
