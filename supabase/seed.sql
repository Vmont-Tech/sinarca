-- Seed idempotente consolidado a partir de backend/mock_data.py,
-- src/data/mrca_db.ts e mocks das telas Transactions, AuditorReview e CertifierReview.

insert into organizations (external_id, name, role, document, website, logo_url, authorized, metadata)
values
  ('reg-001', 'SINARCA', 'Registry', '00.000.000/0001-00', 'https://sinarca.example', null, true, jsonb_build_object('source', 'backend/mock_data.py')),
  ('dev-001', 'Carbon Green', 'Developer', '11.111.111/0001-11', null, null, true, jsonb_build_object('projects', 5, 'total_impact', 145200, 'source', 'src/data/mrca_db.ts')),
  ('dev-002', 'AgroSustentável', 'Developer', '22.222.222/0001-22', null, null, true, jsonb_build_object('projects', 2, 'total_impact', 85000, 'source', 'src/data/mrca_db.ts')),
  ('dev-005', 'BioGreen', 'Developer', '55.555.555/0001-55', null, null, true, jsonb_build_object('projects', 1, 'total_impact', 500000, 'source', 'src/data/mrca_db.ts')),
  ('prod-001', 'Produtor Demo', 'Producer', '123.456.789-00', null, null, true, jsonb_build_object('source', 'backend/mock_data.py')),
  ('comp-001', 'Banco Futuro', 'Compensator', '33.333.333/0001-33', null, null, true, jsonb_build_object('projects', 0, 'total_impact', 0, 'source', 'src/data/mrca_db.ts')),
  ('aud-001', 'GreenCheck Auditores', 'Auditor', null, null, null, true, jsonb_build_object('projects_audited', 12, 'rating', 4.9, 'source', 'src/data/mrca_db.ts')),
  ('aud-002', 'EcoVerify Global', 'Auditor', null, null, null, true, jsonb_build_object('projects_audited', 8, 'rating', 4.7, 'source', 'src/data/mrca_db.ts')),
  ('aud-005', 'Vinícius Monteiro', 'Auditor', '111.111.111-11', null, null, true, jsonb_build_object('projects_audited', 15, 'rating', 5.0, 'source', 'backend/mock_data.py')),
  ('std-001', 'Verra', 'Certifier', '44.444.444/0001-44', 'https://verra.org', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Verra_logo.png/640px-Verra_logo.png', true, jsonb_build_object('source', 'src/data/mrca_db.ts')),
  ('std-002', 'Gold Standard', 'Certifier', null, 'https://www.goldstandard.org', 'https://www.goldstandard.org/sites/default/files/gold-standard-logo.png', true, jsonb_build_object('source', 'src/data/mrca_db.ts')),
  ('std-003', 'Cercarbono', 'Certifier', null, 'https://cercarbono.com', '', true, jsonb_build_object('source', 'src/data/mrca_db.ts'))
on conflict (external_id) do update set
  name = excluded.name,
  role = excluded.role,
  document = excluded.document,
  website = excluded.website,
  logo_url = excluded.logo_url,
  authorized = excluded.authorized,
  metadata = excluded.metadata,
  updated_at = now();

insert into inventory_regions (id, uf, name, description, status, emissions, local_contributions, source)
values
  ('am', 'AM', 'Amazonas', 'Maior reserva de biomas tropicais.', 'SURPLUS', '{"total":4500000,"industrial":800000,"agri":1200000,"waste":500000}'::jsonb, '{"estimatedRemovals":12000000,"registeredProjectsCount":154}'::jsonb, 'MCTI / SEEG 2024'),
  ('pa', 'PA', 'Pará', 'Fronteira ativa de preservação.', 'DEFICIT', '{"total":12000000,"industrial":2000000,"agri":8500000,"waste":1500000}'::jsonb, '{"estimatedRemovals":9500000,"registeredProjectsCount":88}'::jsonb, 'MCTI / SEEG 2024'),
  ('mt', 'MT', 'Mato Grosso', 'Potência agro-ambiental.', 'BALANCED', '{"total":18000000,"industrial":1500000,"agri":14000000,"waste":2500000}'::jsonb, '{"estimatedRemovals":18200000,"registeredProjectsCount":112}'::jsonb, 'MCTI / SEEG 2024'),
  ('sp', 'SP', 'São Paulo', 'Centro industrial e tecnológico.', 'DEFICIT', '{"total":25000000,"industrial":12000000,"agri":8000000,"waste":5000000}'::jsonb, '{"estimatedRemovals":5000000,"registeredProjectsCount":45}'::jsonb, 'MCTI / SEEG 2024'),
  ('pr', 'PR', 'Paraná', 'Excelência em conservação de bacias.', 'SURPLUS', '{"total":7500000,"industrial":2000000,"agri":4500000,"waste":1000000}'::jsonb, '{"estimatedRemovals":9800000,"registeredProjectsCount":67}'::jsonb, 'MCTI / SEEG 2024'),
  ('to', 'TO', 'Tocantins', 'Coração do Matopiba.', 'BALANCED', '{"total":3500000,"industrial":500000,"agri":2500000,"waste":500000}'::jsonb, '{"estimatedRemovals":3600000,"registeredProjectsCount":12}'::jsonb, 'MCTI / SEEG 2024')
on conflict (id) do update set
  uf = excluded.uf,
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  emissions = excluded.emissions,
  local_contributions = excluded.local_contributions,
  source = excluded.source,
  updated_at = now();

insert into profiles (external_id, organization_id, name, email, document, role, password_hash, phone, avatar_url, gov_level)
values
  ('comp-001', (select id from organizations where external_id = 'comp-001'), 'Banco Futuro', 'empresa@sinarca.com.br', '999.888.777-66', 'company', '$argon2id$v=19$m=65536,t=3,p=4$g9Dw4x3u2dw9bKCqzdgj8A$IkFPQeS0zKQFJMNT3LczCbjkbrAU9vEyOct/AcAEoO8', null, null, null),
  ('aud-005', (select id from organizations where external_id = 'aud-005'), 'Vinícius Monteiro', 'auditor@sinarca.com.br', '111.111.111-11', 'auditor', '$argon2id$v=19$m=65536,t=3,p=4$uNDXGXqGsCnXJfROYFG2Rg$31+SJPqNkkiOxyUhDp2d3o27J5jl3313KHmY6UTW2JI', null, null, null),
  ('std-001-user', (select id from organizations where external_id = 'std-001'), 'Certificadora Verra', 'certificadora@sinarca.com.br', '555.444.333-22', 'certifier', '$argon2id$v=19$m=65536,t=3,p=4$EkJbEItankgiJOai0GdzWg$4QxS1xef5UvGnpM/mIiMwIP/XGifoSdWTq/iRUhklrU', null, null, null),
  ('prod-001', (select id from organizations where external_id = 'prod-001'), 'Produtor Demo', 'produtor@sinarca.com.br', '123.456.789-00', 'producer', '$argon2id$v=19$m=65536,t=3,p=4$F3xhYzbhG1RCmCTT5wPqkw$B7h7I4j0Br8j6Dpw74ViN3rIMbs3bZe/WXiZkyuzZbQ', null, null, null),
  ('admin-001', (select id from organizations where external_id = 'reg-001'), 'Administrador SINARCA', 'admin@sinarca.com.br', '000.000.000-00', 'admin', '$argon2id$v=19$m=65536,t=3,p=4$o/T6DrbtYjVncNJprf3fRQ$N5M3D6rLapPECIEPmwFyLvtasVpvlHJTElMEmRA6fHI', null, null, null)
on conflict (email) do update set
  external_id = excluded.external_id,
  organization_id = excluded.organization_id,
  name = excluded.name,
  document = excluded.document,
  role = excluded.role,
  password_hash = excluded.password_hash,
  phone = excluded.phone,
  avatar_url = excluded.avatar_url,
  gov_level = excluded.gov_level,
  updated_at = now();

insert into projects (
  friendly_id, source_hash, version, name, description, baseline, methodology, methodology_link, status,
  developer_organization_id, auditor_organization_id, certifier_organization_id, registry_organization_id,
  city, state, state_id, biome, latitude, longitude, svg_x, svg_y, area_hectares, carbon_stock,
  investment_value_brl, vintage, image_url, serial_start, serial_end, contract_address, merkle_root,
  block_height, blockchain_timestamp, timeline, metadata
)
values
  ('PRC-2024-882', '0x7f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f', 'v1.0', 'Reserva Juma', 'Projeto de conservação florestal e redução de emissões em área de alta biodiversidade.', 'Desmatamento projetado de 2.5% ao ano sem intervenção.', 'VM0015 (Verra)', 'https://verra.org/methodology/vm0015', 'RETIRED',
    (select id from organizations where external_id = 'dev-001'), (select id from organizations where external_id = 'aud-001'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Novo Aripuanã', 'Amazonas', 'am', 'Amazônia', -7.210000, -60.360000, 180, 160, 12450, 145200, 6534000, '2023',
    'https://images.unsplash.com/photo-1572276596237-5db2c3e16c5d?auto=format&fit=crop&w=800&q=80', 'BR-2024-882-0000001', 'BR-2024-882-1200000', '0x123...abc', '0x999...111', 1829240, '2023-01-10T14:00:00Z',
    '[{"title":"Registro do Projeto","date":"10 Jan 2023","status":"completed","desc":"Submissão inicial realizada."},{"title":"Aposentadoria Total","date":"15 Fev 2025","status":"completed","desc":"Compensação realizada por Banco Futuro."}]'::jsonb,
    jsonb_build_object('source', 'src/data/mrca_db.ts', 'frontendStatus', 'RETIRED')),
  ('PRC-2024-002', '0x8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a', 'v1.0', 'Projeto Carbono Cerrado', 'Recuperação de áreas degradadas no bioma Cerrado com foco em agricultura regenerativa.', 'Área degradada por pastagem intensiva por mais de 10 anos.', 'AR-ACM0003', null, 'AVAILABLE',
    (select id from organizations where external_id = 'dev-002'), (select id from organizations where external_id = 'aud-002'), (select id from organizations where external_id = 'std-002'), (select id from organizations where external_id = 'reg-001'),
    'Palmas', 'Tocantins', 'to', 'Cerrado', -10.180000, -48.330000, 375, 280, 5800, 85000, 4250000, '2024',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', 'BR-2024-002-000001', 'BR-2024-002-085000', '0x456...def', '0x888...222', 1830000, '2024-02-15T09:30:00Z',
    '[{"title":"Aprovação Final","date":"25 Fev 2024","status":"completed","desc":"Projeto migrado para status AVAILABLE."}]'::jsonb,
    jsonb_build_object('source', 'backend/mock_data.py + src/data/mrca_db.ts', 'frontendStatus', 'AVAILABLE')),
  ('PRC-2025-001', '0x1234567890abcdef1234567890abcdef12345678', 'v3.0', 'Recuperação Florestal Amazônia - Fase 3', 'Fase 3 do projeto de recuperação florestal focada em corredores ecológicos.', 'Expansão da fronteira agrícola na região do Xingu.', 'REDD+', null, 'AVAILABLE',
    (select id from organizations where external_id = 'dev-005'), (select id from organizations where external_id = 'aud-005'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Altamira', 'Pará', 'pa', 'Amazônia', -3.200000, -52.200000, 325, 125, 15000, 500000, 27500000, '2024',
    'https://images.unsplash.com/photo-1596395817818-b271d44093df?auto=format&fit=crop&w=800&q=80', 'BR-2025-001-000001', 'BR-2025-001-500000', '0xAAA...BBB', '0xCCC...DDD', 2000000, '2025-01-01T10:00:00Z',
    '[{"title":"Registro","date":"2025-01-01","status":"completed","desc":"Projeto Ativo"}]'::jsonb,
    jsonb_build_object('source', 'src/data/mrca_db.ts', 'frontendStatus', 'AVAILABLE')),
  ('PRC-2025-002', '0x999888777666555444333222111000aaabbbcccdddeeefff', 'v1.0', 'Energia Solar do Agreste', 'Parque solar fotovoltaico substituindo matriz energética fóssil na região.', 'Uso de termelétricas a diesel.', 'ACM0002', null, 'AVAILABLE',
    (select id from organizations where external_id = 'dev-002'), (select id from organizations where external_id = 'aud-002'), (select id from organizations where external_id = 'std-002'), (select id from organizations where external_id = 'reg-001'),
    'Caruaru', 'Pernambuco', 'pe', 'Caatinga', -8.280000, -35.970000, 520, 180, 200, 12000, 5000000, '2025',
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80', 'BR-2025-002-000001', 'BR-2025-002-012000', '0xSUN...PWR', '0xEEE...FFF', 2100500, '2025-02-10T08:00:00Z',
    '[{"title":"Conexão à Rede","date":"2025-02-01","status":"completed","desc":"Início da geração."}]'::jsonb,
    jsonb_build_object('source', 'src/data/mrca_db.ts', 'frontendStatus', 'AVAILABLE')),
  ('PRC-2023-555', '0xaaabbbcccdddeeefff111222333444555666777888', 'v2.0', 'Reflorestamento Mata Atlântica Sul', 'Restaurando o habitat natural da Mata Atlântica através do plantio de espécies nativas.', 'Área anteriormente utilizada para pastagem degradada.', 'AR-AMS0007', null, 'AUDITED',
    (select id from organizations where external_id = 'dev-001'), (select id from organizations where external_id = 'aud-001'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Joinville', 'Santa Catarina', 'sc', 'Mata Atlântica', -26.300000, -48.840000, 310, 410, 500, 45000, 2000000, '2023',
    'https://images.unsplash.com/photo-1448375240586-dfd8f3793371?auto=format&fit=crop&w=800&q=80', 'BR-2023-555-000001', 'BR-2023-555-045000', '0xATL...FOR', '0xGGG...HHH', 1950000, '2023-06-15T11:20:00Z',
    '[{"title":"Auditoria Anual","date":"2024-06-15","status":"completed","desc":"Verificação de crescimento."}]'::jsonb,
    jsonb_build_object('source', 'src/data/mrca_db.ts', 'frontendStatus', 'AUDITED', 'queue', 'certifier')),
  ('PRC-2026-010', 'queue-certifier-demo-2026-010', 'v1.0', 'Restauração Ribeirinha Tocantins', 'Projeto demo para fila inicial da certificadora.', 'APP degradada aguardando certificação.', 'AR-ACM0003', null, 'CREATED',
    (select id from organizations where external_id = 'prod-001'), (select id from organizations where external_id = 'aud-005'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Porto Nacional', 'Tocantins', 'to', 'Cerrado', -10.700000, -48.410000, 392, 292, 1200, 18000, 900000, '2026',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', 'BR-2026-010-000001', 'BR-2026-010-018000', 'pending', 'pending', null, '2026-05-22T09:00:00Z',
    '[{"title":"Submissão","date":"2026-05-22","status":"active","desc":"Projeto enviado à certificadora."}]'::jsonb,
    jsonb_build_object('source', 'frontend CertifierReview queue', 'queue', 'certifier')),
  ('PRC-2026-011', 'queue-auditor-demo-2026-011', 'v1.0', 'Manejo Comunitário Araguaia', 'Projeto demo para fila inicial de auditoria.', 'Área comunitária certificada aguardando inspeção de campo.', 'VM0015 (Verra)', null, 'AWAITING_AUDIT',
    (select id from organizations where external_id = 'prod-001'), (select id from organizations where external_id = 'aud-005'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Caseara', 'Tocantins', 'to', 'Cerrado', -9.270000, -49.950000, 360, 260, 2400, 32000, 1600000, '2026',
    'https://images.unsplash.com/photo-1596395817818-b271d44093df?auto=format&fit=crop&w=800&q=80', 'BR-2026-011-000001', 'BR-2026-011-032000', '0xAUD...QUEUE', '0xAUD...ROOT', null, '2026-05-22T10:00:00Z',
    '[{"title":"Certificação","date":"2026-05-22","status":"completed","desc":"Projeto aguardando auditoria."}]'::jsonb,
    jsonb_build_object('source', 'frontend AuditorReview queue', 'queue', 'auditor'))
on conflict (friendly_id) do update set
  source_hash = excluded.source_hash,
  version = excluded.version,
  name = excluded.name,
  description = excluded.description,
  baseline = excluded.baseline,
  methodology = excluded.methodology,
  methodology_link = excluded.methodology_link,
  status = excluded.status,
  developer_organization_id = excluded.developer_organization_id,
  auditor_organization_id = excluded.auditor_organization_id,
  certifier_organization_id = excluded.certifier_organization_id,
  registry_organization_id = excluded.registry_organization_id,
  city = excluded.city,
  state = excluded.state,
  state_id = excluded.state_id,
  biome = excluded.biome,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  svg_x = excluded.svg_x,
  svg_y = excluded.svg_y,
  area_hectares = excluded.area_hectares,
  carbon_stock = excluded.carbon_stock,
  investment_value_brl = excluded.investment_value_brl,
  vintage = excluded.vintage,
  image_url = excluded.image_url,
  serial_start = excluded.serial_start,
  serial_end = excluded.serial_end,
  contract_address = excluded.contract_address,
  merkle_root = excluded.merkle_root,
  block_height = excluded.block_height,
  blockchain_timestamp = excluded.blockchain_timestamp,
  timeline = excluded.timeline,
  metadata = excluded.metadata,
  updated_at = now();

insert into project_tags (project_id, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2024-002'), '04A224C8D91C90', 'cmac-prc-002-a', -10.171200, -48.339100, 'A', 'ACTIVE', '2024-02-10T08:00:00Z', '2024-02-25T09:30:00Z', jsonb_build_object('source', 'NFC 424 DNA demo')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), '04A224C8D91C91', 'cmac-prc-002-b', -10.182500, -48.317800, 'B', 'ACTIVE', '2024-02-10T08:10:00Z', '2024-02-25T09:34:00Z', jsonb_build_object('source', 'NFC 424 DNA demo')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), '04A224C8D91C92', 'cmac-prc-002-c', -10.198900, -48.334200, 'C', 'ACTIVE', '2024-02-10T08:20:00Z', '2024-02-25T09:38:00Z', jsonb_build_object('source', 'NFC 424 DNA demo')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), '04A224C8D91C93', 'cmac-prc-002-d', -10.184100, -48.352000, 'D', 'ACTIVE', '2024-02-10T08:30:00Z', '2024-02-25T09:42:00Z', jsonb_build_object('source', 'NFC 424 DNA demo'))
on conflict (tag_uid) do update set
  project_id = excluded.project_id,
  cmac = excluded.cmac,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  vertex_label = excluded.vertex_label,
  status = excluded.status,
  first_seen_at = excluded.first_seen_at,
  last_seen_at = excluded.last_seen_at,
  metadata = excluded.metadata;

insert into project_baselines (project_id, sentinel_scene_id, baseline_hash, points_analyzed, vegetation_cover_pct, ndvi_mean, captured_at, evidence_uri)
values
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'S2A_MSIL2A_20240215T133241_N0509_R081_T22LHH', 'baseline-prc-2024-002-cerrado', 5000, 72.400, 0.681, '2024-02-15T13:32:41Z', 's3://sinarca-demo/baselines/PRC-2024-002.json'),
  ((select id from projects where friendly_id = 'PRC-2026-010'), 'S2A_MSIL2A_20260520T133241_N0509_R081_T22LHH', 'baseline-prc-2026-010-certifier-queue', 5000, 58.100, 0.552, '2026-05-20T13:32:41Z', 's3://sinarca-demo/baselines/PRC-2026-010.json'),
  ((select id from projects where friendly_id = 'PRC-2026-011'), 'S2A_MSIL2A_20260521T133241_N0509_R081_T22LHH', 'baseline-prc-2026-011-auditor-queue', 5000, 64.800, 0.604, '2026-05-21T13:32:41Z', 's3://sinarca-demo/baselines/PRC-2026-011.json')
on conflict (baseline_hash) do update set
  project_id = excluded.project_id,
  sentinel_scene_id = excluded.sentinel_scene_id,
  points_analyzed = excluded.points_analyzed,
  vegetation_cover_pct = excluded.vegetation_cover_pct,
  ndvi_mean = excluded.ndvi_mean,
  captured_at = excluded.captured_at,
  evidence_uri = excluded.evidence_uri;

insert into certifications (project_id, certifier_organization_id, certifier_profile_id, methodology, credit_potential, decision, notes, signed_document_hash, signed_at)
values
  ((select id from projects where friendly_id = 'PRC-2024-002'), (select id from organizations where external_id = 'std-002'), (select id from profiles where external_id = 'std-001-user'), 'AR-ACM0003', 85000, 'APPROVED', 'Certificação demo consolidada do mock Carbono Cerrado.', 'sha256-cert-prc-2024-002', '2024-02-25T10:00:00Z'),
  ((select id from projects where friendly_id = 'PRC-2026-010'), (select id from organizations where external_id = 'std-001'), (select id from profiles where external_id = 'std-001-user'), 'AR-ACM0003', 18000, 'PENDING', 'Fila inicial da certificadora para validação de UI.', null, null),
  ((select id from projects where friendly_id = 'PRC-2026-011'), (select id from organizations where external_id = 'std-001'), (select id from profiles where external_id = 'std-001-user'), 'VM0015 (Verra)', 32000, 'APPROVED', 'Certificação aprovada; aguardando auditoria.', 'sha256-cert-prc-2026-011', '2026-05-22T10:00:00Z')
on conflict (project_id, decision) do update set
  certifier_organization_id = excluded.certifier_organization_id,
  certifier_profile_id = excluded.certifier_profile_id,
  methodology = excluded.methodology,
  credit_potential = excluded.credit_potential,
  notes = excluded.notes,
  signed_document_hash = excluded.signed_document_hash,
  signed_at = excluded.signed_at;

insert into audits (project_id, auditor_organization_id, auditor_profile_id, status, report_text, latitude, longitude, evidence_urls, digital_signature, audited_at)
values
  ((select id from projects where friendly_id = 'PRC-2024-002'), (select id from organizations where external_id = 'aud-002'), (select id from profiles where external_id = 'aud-005'), 'APPROVED', 'Auditoria aprovada com trilha documental suficiente.', -10.180000, -48.330000, '["https://example.test/evidencia-cerrado.jpg"]'::jsonb, 'assinatura-demo-cerrado', '2024-03-01T14:00:00Z'),
  ((select id from projects where friendly_id = 'PRC-2026-011'), (select id from organizations where external_id = 'aud-005'), (select id from profiles where external_id = 'aud-005'), 'PENDING', 'Fila inicial de auditoria para validação de campo.', -9.270000, -49.950000, '[]'::jsonb, null, null)
on conflict (project_id, status) do update set
  auditor_organization_id = excluded.auditor_organization_id,
  auditor_profile_id = excluded.auditor_profile_id,
  report_text = excluded.report_text,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  evidence_urls = excluded.evidence_urls,
  digital_signature = excluded.digital_signature,
  audited_at = excluded.audited_at;

insert into environmental_credits (project_id, vintage, quantity_total, quantity_available, quantity_retired, status, token_metadata, serial_start, serial_end)
values
  ((select id from projects where friendly_id = 'PRC-2024-882'), '2023', 145200, 0, 145200, 'RETIRED', jsonb_build_object('source', 'frontend details', 'asset', 'Reserva Juma'), 'BR-2024-882-0000001', 'BR-2024-882-1200000'),
  ((select id from projects where friendly_id = 'PRC-2024-002'), '2024', 85000, 84500, 0, 'AVAILABLE', jsonb_build_object('source', 'backend/mock_data.py + src/data/mrca_db.ts', 'asset', 'Carbono Cerrado'), 'BR-2024-002-000001', 'BR-2024-002-085000'),
  ((select id from projects where friendly_id = 'PRC-2025-001'), '2024', 500000, 495000, 0, 'AVAILABLE', jsonb_build_object('source', 'src/data/mrca_db.ts', 'asset', 'Recuperação Amazônia'), 'BR-2025-001-000001', 'BR-2025-001-500000'),
  ((select id from projects where friendly_id = 'PRC-2025-002'), '2025', 12000, 11850, 150, 'AVAILABLE', jsonb_build_object('source', 'src/data/mrca_db.ts + Transactions.tsx', 'asset', 'Energia Limpa Solar'), 'BR-2025-002-000001', 'BR-2025-002-012000'),
  ((select id from projects where friendly_id = 'PRC-2023-555'), '2023', 45000, 44800, 0, 'AVAILABLE', jsonb_build_object('source', 'src/data/mrca_db.ts + Transactions.tsx', 'asset', 'Mata Atlântica Viva'), 'BR-2023-555-000001', 'BR-2023-555-045000')
on conflict (project_id, vintage) do update set
  quantity_total = excluded.quantity_total,
  quantity_available = excluded.quantity_available,
  quantity_retired = excluded.quantity_retired,
  status = excluded.status,
  token_metadata = excluded.token_metadata,
  serial_start = excluded.serial_start,
  serial_end = excluded.serial_end,
  updated_at = now();

insert into ledger_accounts (external_id, owner_organization_id, project_id, account_type, currency, balance, metadata)
values
  ('ledger-comp-001', (select id from organizations where external_id = 'comp-001'), null, 'COMPANY_CREDIT_WALLET', 'tCO2e', 19450, jsonb_build_object('source', 'Transactions.tsx', 'owner', 'Banco Futuro')),
  ('ledger-project-prc-2024-002', null, (select id from projects where friendly_id = 'PRC-2024-002'), 'PROJECT_ISSUANCE', 'tCO2e', 84500, jsonb_build_object('source', 'environmental_credits')),
  ('ledger-project-prc-2025-001', null, (select id from projects where friendly_id = 'PRC-2025-001'), 'PROJECT_ISSUANCE', 'tCO2e', 495000, jsonb_build_object('source', 'environmental_credits')),
  ('ledger-project-prc-2025-002', null, (select id from projects where friendly_id = 'PRC-2025-002'), 'PROJECT_ISSUANCE', 'tCO2e', 11850, jsonb_build_object('source', 'environmental_credits'))
on conflict (external_id) do update set
  owner_organization_id = excluded.owner_organization_id,
  project_id = excluded.project_id,
  account_type = excluded.account_type,
  currency = excluded.currency,
  balance = excluded.balance,
  metadata = excluded.metadata,
  updated_at = now();

insert into purchases (project_id, buyer_organization_id, credit_id, quantidade, unit_price_brl, total_value_brl, platform_fee_brl, receipt_hash, status, idempotency_key, settled_at)
values
  ((select id from projects where friendly_id = 'PRC-2024-002'), (select id from organizations where external_id = 'comp-001'), (select id from environmental_credits where project_id = (select id from projects where friendly_id = 'PRC-2024-002') and vintage = '2024'), 500, 50, 25000, 1125, 'receipt-purchase-tx-002', 'SETTLED', 'tx-002', '2026-05-21T14:15:00Z')
on conflict (idempotency_key) do update set
  project_id = excluded.project_id,
  buyer_organization_id = excluded.buyer_organization_id,
  credit_id = excluded.credit_id,
  quantidade = excluded.quantidade,
  unit_price_brl = excluded.unit_price_brl,
  total_value_brl = excluded.total_value_brl,
  platform_fee_brl = excluded.platform_fee_brl,
  receipt_hash = excluded.receipt_hash,
  status = excluded.status,
  settled_at = excluded.settled_at;

insert into retirements (project_id, owner_organization_id, amount, emissions_data, certificate_hash, burn_hash, documentation_uri, status, idempotency_key, retired_at)
values
  ((select id from projects where friendly_id = 'PRC-2024-882'), (select id from organizations where external_id = 'comp-001'), 1200, '{"scope1":400,"scope2":500,"scope3":300,"total":1200}'::jsonb, 'certificate-tx-001-reserva-juma', '0x7f9...e4r5', 's3://sinarca-demo/retirements/tx-001.pdf', 'COMPLETED', 'tx-001', '2026-05-22T10:30:00Z'),
  ((select id from projects where friendly_id = 'PRC-2025-002'), (select id from organizations where external_id = 'comp-001'), 150, '{"scope1":50,"scope2":80,"scope3":20,"total":150}'::jsonb, 'certificate-tx-005-solar', '0x3e4...r5t6', 's3://sinarca-demo/retirements/tx-005.pdf', 'COMPLETED', 'tx-005', '2024-12-20T12:00:00Z')
on conflict (idempotency_key) do update set
  project_id = excluded.project_id,
  owner_organization_id = excluded.owner_organization_id,
  amount = excluded.amount,
  emissions_data = excluded.emissions_data,
  certificate_hash = excluded.certificate_hash,
  burn_hash = excluded.burn_hash,
  documentation_uri = excluded.documentation_uri,
  status = excluded.status,
  retired_at = excluded.retired_at;

insert into chain_events (project_id, event_type, chain, transaction_hash, source_tx_hash, amount, status, payload)
values
  ((select id from projects where friendly_id = 'PRC-2024-882'), 'BURN', 'soroban', '0x7f9...e4r5', 'tx-001', 1200, 'CONFIRMED', jsonb_build_object('source', 'Transactions.tsx', 'type', 'retired')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'TRANSFER', 'soroban', '0x8a1...b2c3', 'tx-002', 500, 'CONFIRMED', jsonb_build_object('source', 'Transactions.tsx', 'type', 'received')),
  ((select id from projects where friendly_id = 'PRC-2023-555'), 'TRANSFER', 'soroban', '0x1c9...f2a3', 'tx-003', 200, 'PENDING', jsonb_build_object('source', 'Transactions.tsx', 'type', 'sent')),
  ((select id from projects where friendly_id = 'PRC-2025-001'), 'MINT_LOCKED', 'soroban', '0x9d8...e1s2', 'tx-004', 5000, 'CONFIRMED', jsonb_build_object('source', 'Transactions.tsx', 'type', 'minted')),
  ((select id from projects where friendly_id = 'PRC-2025-002'), 'BURN', 'soroban', '0x3e4...r5t6', 'tx-005', 150, 'CONFIRMED', jsonb_build_object('source', 'Transactions.tsx', 'type', 'retired')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'TREASURY_LOCK', 'etherfuse', 'etherfuse-demo-prc-2024-002', 'etherfuse-demo-prc-2024-002', 4250000, 'CONFIRMED', jsonb_build_object('source', 'DOCX financeiro', 'provider', 'Etherfuse')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'VAULT_LOCK', 'polygon', 'polygon-lock-demo-prc-2024-002', 'polygon-lock-demo-prc-2024-002', 1000, 'RECORDED', jsonb_build_object('source', 'lock-and-mint demo'))
on conflict (source_tx_hash) where source_tx_hash is not null do update set
  project_id = excluded.project_id,
  event_type = excluded.event_type,
  chain = excluded.chain,
  transaction_hash = excluded.transaction_hash,
  amount = excluded.amount,
  status = excluded.status,
  payload = excluded.payload;

insert into ledger_entries (account_id, entry_type, amount, unit, project_id, purchase_id, retirement_id, idempotency_key, counterparty, metadata)
values
  ((select id from ledger_accounts where external_id = 'ledger-comp-001'), 'RETIREMENT', -1200, 'tCO2e', (select id from projects where friendly_id = 'PRC-2024-882'), null, (select id from retirements where idempotency_key = 'tx-001'), 'tx-001', 'Aposentadoria', jsonb_build_object('frontend_id', 'tx-001', 'asset', 'Reserva Juma', 'date_label', 'Hoje, 10:30', 'hash', '0x7f9...e4r5')),
  ((select id from ledger_accounts where external_id = 'ledger-comp-001'), 'RECEIVED', 500, 'tCO2e', (select id from projects where friendly_id = 'PRC-2024-002'), (select id from purchases where idempotency_key = 'tx-002'), null, 'tx-002', 'AgroSustentável', jsonb_build_object('frontend_id', 'tx-002', 'asset', 'Carbono Cerrado', 'date_label', 'Ontem, 14:15', 'hash', '0x8a1...b2c3')),
  ((select id from ledger_accounts where external_id = 'ledger-comp-001'), 'TRANSFER_SENT', -200, 'tCO2e', (select id from projects where friendly_id = 'PRC-2023-555'), null, null, 'tx-003', 'TechGlobal', jsonb_build_object('frontend_id', 'tx-003', 'asset', 'Mata Atlântica Viva', 'date_label', '12 Jan 2025', 'hash', '0x1c9...f2a3', 'status', 'pending')),
  ((select id from ledger_accounts where external_id = 'ledger-comp-001'), 'MINT', 5000, 'tCO2e', (select id from projects where friendly_id = 'PRC-2025-001'), null, null, 'tx-004', 'Protocolo', jsonb_build_object('frontend_id', 'tx-004', 'asset', 'Recuperação Amazônia', 'date_label', '01 Jan 2025', 'hash', '0x9d8...e1s2')),
  ((select id from ledger_accounts where external_id = 'ledger-comp-001'), 'RETIREMENT', -150, 'tCO2e', (select id from projects where friendly_id = 'PRC-2025-002'), null, (select id from retirements where idempotency_key = 'tx-005'), 'tx-005', 'Aposentadoria', jsonb_build_object('frontend_id', 'tx-005', 'asset', 'Energia Limpa Solar', 'date_label', '20 Dez 2024', 'hash', '0x3e4...r5t6'))
on conflict (idempotency_key) do update set
  account_id = excluded.account_id,
  entry_type = excluded.entry_type,
  amount = excluded.amount,
  unit = excluded.unit,
  project_id = excluded.project_id,
  purchase_id = excluded.purchase_id,
  retirement_id = excluded.retirement_id,
  counterparty = excluded.counterparty,
  metadata = excluded.metadata;

insert into treasury_positions (project_id, provider, principal_brl, instrument, external_reference, status, opened_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'Etherfuse', 4250000, 'Tesouro Direto tokenizado', 'etherfuse-prc-2024-002', 'LOCKED', '2024-02-20T12:00:00Z', jsonb_build_object('yield_model', '90/10', 'source', 'DOCX-YIELD-SOCIAL'))
on conflict (external_reference) do update set
  project_id = excluded.project_id,
  provider = excluded.provider,
  principal_brl = excluded.principal_brl,
  instrument = excluded.instrument,
  status = excluded.status,
  opened_at = excluded.opened_at,
  metadata = excluded.metadata,
  updated_at = now();

insert into yield_distributions (treasury_position_id, gross_yield_brl, operational_brl, social_vault_brl, distribution_month, status)
values
  ((select id from treasury_positions where external_reference = 'etherfuse-prc-2024-002'), 18500, 16650, 1850, '2024-03-01', 'BOOKED')
on conflict (treasury_position_id, distribution_month) do update set
  gross_yield_brl = excluded.gross_yield_brl,
  operational_brl = excluded.operational_brl,
  social_vault_brl = excluded.social_vault_brl,
  status = excluded.status;

insert into external_chain_projects (project_id, chain, vault_address, source_token_address, source_tx_hash, wrapped_stellar_asset, status, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'polygon', '0xVaultSinarcaDemo000000000000000000000002', '0xCreditTokenDemo0000000000000000000000002', 'polygon-lock-demo-prc-2024-002', 'SINARCA-PRC-2024-002-WRAPPED', 'WRAPPED_MINTED', jsonb_build_object('source', 'DOCX-LOCK-AND-MINT', 'network', 'polygon-amoy-demo'))
on conflict (source_tx_hash) do update set
  project_id = excluded.project_id,
  chain = excluded.chain,
  vault_address = excluded.vault_address,
  source_token_address = excluded.source_token_address,
  wrapped_stellar_asset = excluded.wrapped_stellar_asset,
  status = excluded.status,
  metadata = excluded.metadata;

insert into documents (owner_organization_id, project_id, document_type, storage_path, sha256_hash, mime_type, size_bytes, metadata)
values
  ((select id from organizations where external_id = 'std-002'), (select id from projects where friendly_id = 'PRC-2024-002'), 'CERTIFICATION_REPORT', 's3://sinarca-demo/documents/prc-2024-002-certification.pdf', 'sha256-cert-prc-2024-002', 'application/pdf', 204800, jsonb_build_object('source', 'certification seed')),
  ((select id from organizations where external_id = 'aud-002'), (select id from projects where friendly_id = 'PRC-2024-002'), 'AUDIT_REPORT', 's3://sinarca-demo/documents/prc-2024-002-audit.pdf', 'sha256-audit-prc-2024-002', 'application/pdf', 307200, jsonb_build_object('source', 'audit seed'))
on conflict (sha256_hash) do update set
  owner_organization_id = excluded.owner_organization_id,
  project_id = excluded.project_id,
  document_type = excluded.document_type,
  storage_path = excluded.storage_path,
  mime_type = excluded.mime_type,
  size_bytes = excluded.size_bytes,
  metadata = excluded.metadata;

insert into idempotency_keys (key, scope, request_hash, response_payload, status, expires_at)
values
  ('tx-001', 'retirements', 'hash-request-tx-001', jsonb_build_object('certificate_hash', 'certificate-tx-001-reserva-juma'), 'RECORDED', '2027-05-22T00:00:00Z'),
  ('tx-002', 'purchases', 'hash-request-tx-002', jsonb_build_object('receipt_hash', 'receipt-purchase-tx-002'), 'RECORDED', '2027-05-22T00:00:00Z'),
  ('tx-005', 'retirements', 'hash-request-tx-005', jsonb_build_object('certificate_hash', 'certificate-tx-005-solar'), 'RECORDED', '2027-05-22T00:00:00Z')
on conflict (key, scope) do update set
  request_hash = excluded.request_hash,
  response_payload = excluded.response_payload,
  status = excluded.status,
  expires_at = excluded.expires_at;
