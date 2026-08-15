-- Repair legacy demo QTAGs created with placeholder colinear coordinates.
-- The project centroid remains the source of truth; tags are spread around it
-- so public geofence previews form a closed area instead of a line.
with legacy_placeholder_tags as (
  select
    t.id,
    p.latitude as project_latitude,
    p.longitude as project_longitude,
    row_number() over (
      partition by t.project_id
      order by t.vertex_label, t.tag_uid, t.id
    ) as vertex_index
  from public.project_tags t
  join public.projects p on p.id = t.project_id
  where round(t.latitude::numeric, 2) in (-10.11, -10.12, -10.13, -10.14)
    and round(t.longitude::numeric, 2) in (-48.31, -48.32, -48.33, -48.34)
),
repaired_tags as (
  select
    id,
    case vertex_index
      when 1 then 'A'
      when 2 then 'B'
      when 3 then 'C'
      when 4 then 'D'
    end as vertex_label,
    case vertex_index
      when 1 then project_latitude + 0.010000
      when 2 then project_latitude + 0.010000
      when 3 then project_latitude - 0.010000
      when 4 then project_latitude - 0.010000
    end as latitude,
    case vertex_index
      when 1 then project_longitude - 0.012000
      when 2 then project_longitude + 0.012000
      when 3 then project_longitude + 0.012000
      when 4 then project_longitude - 0.012000
    end as longitude
  from legacy_placeholder_tags
  where vertex_index between 1 and 4
)
update public.project_tags t
set
  vertex_label = repaired_tags.vertex_label,
  latitude = repaired_tags.latitude,
  longitude = repaired_tags.longitude,
  metadata = coalesce(t.metadata, '{}'::jsonb) || jsonb_build_object(
    'legacy_geofence_repair', 'rectangle_around_project_centroid',
    'legacy_geofence_repaired_at', '2026-05-26'
  )
from repaired_tags
where t.id = repaired_tags.id;
