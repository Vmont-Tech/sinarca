-- Phase 04.1: fundacao geoespacial.
-- PostGIS ja vem empacotado na imagem Postgres 15 do Supabase; habilitar e
-- apenas criar a extensao. Pre-condicao hard-block das Phases 04.2 e 05.
create extension if not exists postgis;
