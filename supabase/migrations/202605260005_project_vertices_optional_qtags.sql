-- Permite que a geofence seja formada por vértices com ou sem QTAG física.

alter table project_tags
  add column if not exists has_qtag boolean not null default true;

update project_tags
set has_qtag = true
where tag_uid is not null
   or cmac is not null;

alter table project_tags
  alter column has_qtag set default false;

alter table project_tags
  alter column tag_uid drop not null;

alter table project_tags
  alter column cmac drop not null;

drop index if exists project_tags_tag_uid_idx;

create unique index if not exists project_tags_tag_uid_idx
  on project_tags (tag_uid)
  where tag_uid is not null;
