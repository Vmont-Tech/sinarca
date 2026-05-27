-- Seed idempotente consolidado a partir de legacy-mvp-seed,
-- src/data/mrca_db.ts e dados das telas Transactions, AuditorReview e CertifierReview.

insert into organizations (external_id, name, role, document, website, logo_url, authorized, metadata)
values
  ('reg-001', 'SINARCA', 'Registry', '00.000.000/0001-00', 'https://sinarca.example', null, true, jsonb_build_object('source', 'legacy-mvp-seed')),
  ('dev-001', 'Carbon Green', 'Developer', '11.111.111/0001-11', null, null, true, jsonb_build_object('projects', 5, 'total_impact', 145200, 'source', 'src/data/mrca_db.ts')),
  ('dev-002', 'AgroSustentável', 'Developer', '22.222.222/0001-22', null, null, true, jsonb_build_object('projects', 2, 'total_impact', 85000, 'source', 'src/data/mrca_db.ts')),
  ('dev-005', 'BioGreen', 'Developer', '55.555.555/0001-55', null, null, true, jsonb_build_object('projects', 1, 'total_impact', 500000, 'source', 'src/data/mrca_db.ts')),
  ('prod-001', 'Produtor SINARCA', 'Producer', '123.456.789-00', null, null, true, jsonb_build_object('source', 'legacy-mvp-seed')),
  ('comp-001', 'Banco Futuro', 'Compensator', '33.333.333/0001-33', null, null, true, jsonb_build_object('projects', 0, 'total_impact', 0, 'source', 'src/data/mrca_db.ts')),
  ('aud-001', 'GreenCheck Auditores', 'Auditor', null, null, null, true, jsonb_build_object('projects_audited', 12, 'rating', 4.9, 'source', 'src/data/mrca_db.ts')),
  ('aud-002', 'EcoVerify Global', 'Auditor', null, null, null, true, jsonb_build_object('projects_audited', 8, 'rating', 4.7, 'source', 'src/data/mrca_db.ts')),
  ('aud-005', 'Vinícius Monteiro', 'Auditor', '111.111.111-11', null, null, true, jsonb_build_object('projects_audited', 15, 'rating', 5.0, 'source', 'legacy-mvp-seed')),
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
  ('am', 'AM', 'Amazonas', 'Maior reserva de biomas tropicais.', 'SURPLUS', '{"total":4500000,"industrial":800000,"agri":1200000,"waste":500000}'::jsonb, '{"estimatedRemovals":12000000,"registeredProjectsCount":154}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('pa', 'PA', 'Pará', 'Fronteira ativa de preservação.', 'DEFICIT', '{"total":12000000,"industrial":2000000,"agri":8500000,"waste":1500000}'::jsonb, '{"estimatedRemovals":9500000,"registeredProjectsCount":88}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('mt', 'MT', 'Mato Grosso', 'Potência agro-ambiental.', 'BALANCED', '{"total":18000000,"industrial":1500000,"agri":14000000,"waste":2500000}'::jsonb, '{"estimatedRemovals":18200000,"registeredProjectsCount":112}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('sp', 'SP', 'São Paulo', 'Centro industrial e tecnológico.', 'DEFICIT', '{"total":25000000,"industrial":12000000,"agri":8000000,"waste":5000000}'::jsonb, '{"estimatedRemovals":5000000,"registeredProjectsCount":45}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('pr', 'PR', 'Paraná', 'Excelência em conservação de bacias.', 'SURPLUS', '{"total":7500000,"industrial":2000000,"agri":4500000,"waste":1000000}'::jsonb, '{"estimatedRemovals":9800000,"registeredProjectsCount":67}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('to', 'TO', 'Tocantins', 'Coração do Matopiba.', 'BALANCED', '{"total":3500000,"industrial":500000,"agri":2500000,"waste":500000}'::jsonb, '{"estimatedRemovals":3600000,"registeredProjectsCount":12}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('ac', 'AC', 'Acre', 'Paisagens extrativistas e corredores amazônicos.', 'SURPLUS', '{"total":2100000,"industrial":180000,"agri":1400000,"waste":520000}'::jsonb, '{"estimatedRemovals":5200000,"registeredProjectsCount":24}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('al', 'AL', 'Alagoas', 'Mosaico costeiro e áreas de restauração hídrica.', 'DEFICIT', '{"total":2900000,"industrial":900000,"agri":1300000,"waste":700000}'::jsonb, '{"estimatedRemovals":850000,"registeredProjectsCount":6}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('ap', 'AP', 'Amapá', 'Florestas amazônicas e zonas úmidas costeiras.', 'SURPLUS', '{"total":1200000,"industrial":160000,"agri":580000,"waste":460000}'::jsonb, '{"estimatedRemovals":4100000,"registeredProjectsCount":18}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('ba', 'BA', 'Bahia', 'Transição entre Caatinga, Cerrado e Mata Atlântica.', 'BALANCED', '{"total":9600000,"industrial":2400000,"agri":5600000,"waste":1600000}'::jsonb, '{"estimatedRemovals":6800000,"registeredProjectsCount":42}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('ce', 'CE', 'Ceará', 'Restauração de Caatinga e proteção de nascentes semiáridas.', 'DEFICIT', '{"total":5200000,"industrial":1600000,"agri":2400000,"waste":1200000}'::jsonb, '{"estimatedRemovals":1800000,"registeredProjectsCount":21}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('df', 'DF', 'Distrito Federal', 'Cerrado urbano, nascentes e bacias de abastecimento.', 'DEFICIT', '{"total":3800000,"industrial":1700000,"agri":900000,"waste":1200000}'::jsonb, '{"estimatedRemovals":950000,"registeredProjectsCount":9}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('es', 'ES', 'Espírito Santo', 'Restauração hídrica e florestal da Mata Atlântica.', 'BALANCED', '{"total":4300000,"industrial":1400000,"agri":2100000,"waste":800000}'::jsonb, '{"estimatedRemovals":3900000,"registeredProjectsCount":31}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('go', 'GO', 'Goiás', 'Cerrado de altitude, veredas e corredores ripários.', 'BALANCED', '{"total":9800000,"industrial":1300000,"agri":7200000,"waste":1300000}'::jsonb, '{"estimatedRemovals":8200000,"registeredProjectsCount":48}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('ma', 'MA', 'Maranhão', 'Ecótonos Amazônia-Cerrado e matas ciliares.', 'BALANCED', '{"total":7100000,"industrial":900000,"agri":5200000,"waste":1000000}'::jsonb, '{"estimatedRemovals":6200000,"registeredProjectsCount":27}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('mg', 'MG', 'Minas Gerais', 'Nascentes, serras e corredores de Mata Atlântica e Cerrado.', 'BALANCED', '{"total":14500000,"industrial":4800000,"agri":7800000,"waste":1900000}'::jsonb, '{"estimatedRemovals":11800000,"registeredProjectsCount":74}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('ms', 'MS', 'Mato Grosso do Sul', 'Pantanal, Cerrado e restauração ripária.', 'BALANCED', '{"total":9300000,"industrial":900000,"agri":7600000,"waste":800000}'::jsonb, '{"estimatedRemovals":9700000,"registeredProjectsCount":39}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('pb', 'PB', 'Paraíba', 'Caatinga, brejos de altitude e restauração semiárida.', 'DEFICIT', '{"total":2600000,"industrial":700000,"agri":1300000,"waste":600000}'::jsonb, '{"estimatedRemovals":1100000,"registeredProjectsCount":8}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('pe', 'PE', 'Pernambuco', 'Caatinga, Agreste e remanescentes de Mata Atlântica.', 'DEFICIT', '{"total":6200000,"industrial":2300000,"agri":2600000,"waste":1300000}'::jsonb, '{"estimatedRemovals":2400000,"registeredProjectsCount":19}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('pi', 'PI', 'Piauí', 'Cerrado, Caatinga e corredores de recarga hídrica.', 'BALANCED', '{"total":4100000,"industrial":500000,"agri":3000000,"waste":600000}'::jsonb, '{"estimatedRemovals":3600000,"registeredProjectsCount":14}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('rj', 'RJ', 'Rio de Janeiro', 'Mata Atlântica, mananciais e corredores costeiros.', 'DEFICIT', '{"total":11200000,"industrial":5200000,"agri":3400000,"waste":2600000}'::jsonb, '{"estimatedRemovals":3300000,"registeredProjectsCount":28}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('rn', 'RN', 'Rio Grande do Norte', 'Caatinga, dunas e recuperação de áreas semiáridas.', 'DEFICIT', '{"total":3100000,"industrial":1200000,"agri":1200000,"waste":700000}'::jsonb, '{"estimatedRemovals":950000,"registeredProjectsCount":7}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('ro', 'RO', 'Rondônia', 'Agroflorestas e restauração produtiva na Amazônia.', 'BALANCED', '{"total":6200000,"industrial":600000,"agri":4700000,"waste":900000}'::jsonb, '{"estimatedRemovals":5900000,"registeredProjectsCount":26}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('rr', 'RR', 'Roraima', 'Lavrado, matas de galeria e savanas amazônicas.', 'SURPLUS', '{"total":1900000,"industrial":160000,"agri":1100000,"waste":640000}'::jsonb, '{"estimatedRemovals":3400000,"registeredProjectsCount":11}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('rs', 'RS', 'Rio Grande do Sul', 'Pampa, banhados e Mata Atlântica costeira.', 'BALANCED', '{"total":12800000,"industrial":3900000,"agri":7300000,"waste":1600000}'::jsonb, '{"estimatedRemovals":8900000,"registeredProjectsCount":46}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('sc', 'SC', 'Santa Catarina', 'Mata Atlântica, araucárias e corredores costeiros.', 'SURPLUS', '{"total":6400000,"industrial":2200000,"agri":3300000,"waste":900000}'::jsonb, '{"estimatedRemovals":7100000,"registeredProjectsCount":33}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/'),
  ('se', 'SE', 'Sergipe', 'Caatinga, manguezais e restauração hídrica costeira.', 'DEFICIT', '{"total":2300000,"industrial":800000,"agri":900000,"waste":600000}'::jsonb, '{"estimatedRemovals":780000,"registeredProjectsCount":5}'::jsonb, 'SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/')
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
  ('prod-001', (select id from organizations where external_id = 'prod-001'), 'Produtor SINARCA', 'produtor@sinarca.com.br', '123.456.789-00', 'producer', '$argon2id$v=19$m=65536,t=3,p=4$F3xhYzbhG1RCmCTT5wPqkw$B7h7I4j0Br8j6Dpw74ViN3rIMbs3bZe/WXiZkyuzZbQ', null, null, null),
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
  friendly_id, source_hash, version, name, description, baseline, methodology, methodology_link, status, public_marketplace,
  developer_organization_id, auditor_organization_id, certifier_organization_id, registry_organization_id,
  city, state, state_id, biome, latitude, longitude, svg_x, svg_y, area_hectares, carbon_stock,
  investment_value_brl, vintage, image_url, serial_start, serial_end, contract_address, merkle_root,
  block_height, blockchain_timestamp, timeline, metadata
)
values
  ('PRC-2024-882', '0x7f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f', 'v1.0', 'Reserva Juma', 'Projeto de conservação florestal e redução de emissões em área de alta biodiversidade.', 'Desmatamento projetado de 2.5% ao ano sem intervenção.', 'VM0015 (Verra)', 'https://verra.org/methodology/vm0015', 'RETIRED', false,
    (select id from organizations where external_id = 'dev-001'), (select id from organizations where external_id = 'aud-001'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Novo Aripuanã', 'Amazonas', 'am', 'Amazônia', -7.210000, -60.360000, 180, 160, 12450, 145200, 6534000, '2023',
    'https://images.unsplash.com/photo-1572276596237-5db2c3e16c5d?auto=format&fit=crop&w=800&q=80', 'BR-2024-882-0000001', 'BR-2024-882-1200000', '0x123...abc', '0x999...111', 1829240, '2023-01-10T14:00:00Z',
    '[{"title":"Registro do Projeto","date":"10 Jan 2023","status":"completed","desc":"Submissão inicial realizada."},{"title":"Aposentadoria Total","date":"15 Fev 2025","status":"completed","desc":"Compensação realizada por Banco Futuro."}]'::jsonb,
    jsonb_build_object('source', 'src/data/mrca_db.ts', 'frontendStatus', 'RETIRED')),
  ('PRC-2024-002', '0x8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a', 'v1.0', 'Projeto Carbono Cerrado', 'Recuperação de áreas degradadas no bioma Cerrado com foco em agricultura regenerativa.', 'Área degradada por pastagem intensiva por mais de 10 anos.', 'AR-ACM0003', null, 'AVAILABLE', true,
    (select id from organizations where external_id = 'dev-002'), (select id from organizations where external_id = 'aud-002'), (select id from organizations where external_id = 'std-002'), (select id from organizations where external_id = 'reg-001'),
    'Palmas', 'Tocantins', 'to', 'Cerrado', -10.180000, -48.330000, 375, 280, 5800, 85000, 4250000, '2024',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', 'BR-2024-002-000001', 'BR-2024-002-085000', '0x456...def', '0x888...222', 1830000, '2024-02-15T09:30:00Z',
    '[{"title":"Aprovação Final","date":"25 Fev 2024","status":"completed","desc":"Projeto migrado para status AVAILABLE."}]'::jsonb,
    jsonb_build_object('source', 'legacy-mvp-seed + src/data/mrca_db.ts', 'frontendStatus', 'AVAILABLE')),
  ('PRC-2025-001', '0x1234567890abcdef1234567890abcdef12345678', 'v3.0', 'Recuperação Florestal Amazônia - Fase 3', 'Fase 3 do projeto de recuperação florestal focada em corredores ecológicos.', 'Expansão da fronteira agrícola na região do Xingu.', 'REDD+', null, 'AVAILABLE', true,
    (select id from organizations where external_id = 'dev-005'), (select id from organizations where external_id = 'aud-005'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Altamira', 'Pará', 'pa', 'Amazônia', -3.200000, -52.200000, 325, 125, 15000, 500000, 27500000, '2024',
    'https://images.pexels.com/photos/2739664/pexels-photo-2739664.jpeg?auto=compress&cs=tinysrgb&w=900', 'BR-2025-001-000001', 'BR-2025-001-500000', '0xAAA...BBB', '0xCCC...DDD', 2000000, '2025-01-01T10:00:00Z',
    '[{"title":"Registro","date":"2025-01-01","status":"completed","desc":"Projeto Ativo"}]'::jsonb,
    jsonb_build_object('source', 'src/data/mrca_db.ts', 'frontendStatus', 'AVAILABLE')),
  ('PRC-2025-002', '0x999888777666555444333222111000aaabbbcccdddeeefff', 'v1.0', 'Energia Solar do Agreste', 'Parque solar fotovoltaico substituindo matriz energética fóssil na região.', 'Uso de termelétricas a diesel.', 'ACM0002', null, 'AVAILABLE', true,
    (select id from organizations where external_id = 'dev-002'), (select id from organizations where external_id = 'aud-002'), (select id from organizations where external_id = 'std-002'), (select id from organizations where external_id = 'reg-001'),
    'Caruaru', 'Pernambuco', 'pe', 'Caatinga', -8.280000, -35.970000, 520, 180, 200, 12000, 5000000, '2025',
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80', 'BR-2025-002-000001', 'BR-2025-002-012000', '0xSUN...PWR', '0xEEE...FFF', 2100500, '2025-02-10T08:00:00Z',
    '[{"title":"Conexão à Rede","date":"2025-02-01","status":"completed","desc":"Início da geração."}]'::jsonb,
    jsonb_build_object('source', 'src/data/mrca_db.ts', 'frontendStatus', 'AVAILABLE')),
  ('PRC-2023-555', '0xaaabbbcccdddeeefff111222333444555666777888', 'v2.0', 'Reflorestamento Mata Atlântica Sul', 'Restaurando o habitat natural da Mata Atlântica através do plantio de espécies nativas.', 'Área anteriormente utilizada para pastagem degradada.', 'AR-AMS0007', null, 'AUDITED', false,
    (select id from organizations where external_id = 'dev-001'), (select id from organizations where external_id = 'aud-001'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Joinville', 'Santa Catarina', 'sc', 'Mata Atlântica', -26.300000, -48.840000, 310, 410, 500, 45000, 2000000, '2023',
    'https://images.pexels.com/photos/1438761/pexels-photo-1438761.jpeg?auto=compress&cs=tinysrgb&w=900', 'BR-2023-555-000001', 'BR-2023-555-045000', '0xATL...FOR', '0xGGG...HHH', 1950000, '2023-06-15T11:20:00Z',
    '[{"title":"Auditoria Anual","date":"2024-06-15","status":"completed","desc":"Verificação de crescimento."}]'::jsonb,
    jsonb_build_object('source', 'src/data/mrca_db.ts', 'frontendStatus', 'AUDITED', 'queue', 'certifier')),
  ('PRC-2026-010', 'queue-certifier-seed-2026-010', 'v1.0', 'Restauração Ribeirinha Tocantins', 'Projeto persistido para fila inicial da certificadora.', 'APP degradada aguardando certificação.', 'AR-ACM0003', null, 'CREATED', false,
    (select id from organizations where external_id = 'prod-001'), (select id from organizations where external_id = 'aud-005'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Porto Nacional', 'Tocantins', 'to', 'Cerrado', -10.700000, -48.410000, 392, 292, 1200, 18000, 900000, '2026',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', 'BR-2026-010-000001', 'BR-2026-010-018000', 'pending', 'pending', null, '2026-05-22T09:00:00Z',
    '[{"title":"Submissão","date":"2026-05-22","status":"active","desc":"Projeto enviado à certificadora."}]'::jsonb,
    jsonb_build_object('source', 'frontend CertifierReview queue', 'queue', 'certifier')),
  ('PRC-2026-011', 'queue-auditor-seed-2026-011', 'v1.0', 'Manejo Comunitário Araguaia', 'Projeto persistido para fila inicial de auditoria.', 'Área comunitária certificada aguardando inspeção de campo.', 'VM0015 (Verra)', null, 'AWAITING_AUDIT', false,
    (select id from organizations where external_id = 'prod-001'), (select id from organizations where external_id = 'aud-005'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Caseara', 'Tocantins', 'to', 'Cerrado', -9.270000, -49.950000, 360, 260, 2400, 32000, 1600000, '2026',
    'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=900', 'BR-2026-011-000001', 'BR-2026-011-032000', '0xAUD...QUEUE', '0xAUD...ROOT', null, '2026-05-22T10:00:00Z',
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
  public_marketplace = excluded.public_marketplace,
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

with diversified_demo_projects (
  friendly_id, name, status, city, state, state_id, biome, latitude, longitude, image_url
) as (
values
  ('PRC-2026-008', 'Corredor Araguaia - Santana do Araguaia', 'AWAITING_CERTIFICATION', 'Santana do Araguaia', 'Pará', 'pa', 'Amazônia/Cerrado', -9.330000, -50.350000, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-009', 'Muvuca do Xingu - Canarana', 'AWAITING_CERTIFICATION', 'Canarana', 'Mato Grosso', 'mt', 'Cerrado', -13.550000, -52.270000, 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-010', 'Jalapão Nascentes Protegidas', 'CREATED', 'Ponte Alta do Tocantins', 'Tocantins', 'to', 'Cerrado', -10.750000, -47.540000, 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-011', 'Manejo Comunitário Araguaia', 'AWAITING_AUDIT', 'Caseara', 'Tocantins', 'to', 'Cerrado', -9.270000, -49.950000, 'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-012', 'Baixo Xingu - Corredores Ribeirinhos', 'AWAITING_CERTIFICATION', 'São Félix do Xingu', 'Pará', 'pa', 'Amazônia', -6.640000, -51.990000, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-013', 'Florestas do Futuro - Itu', 'AWAITING_CERTIFICATION', 'Itu', 'São Paulo', 'sp', 'Mata Atlântica', -23.260000, -47.300000, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-014', 'Pontal do Paranapanema - Corredores do Mico-Leão', 'AWAITING_CERTIFICATION', 'Teodoro Sampaio', 'São Paulo', 'sp', 'Mata Atlântica', -22.530000, -52.170000, 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-015', 'Vale do Rio Doce - Instituto Terra', 'ACTIVE', 'Aimorés', 'Minas Gerais', 'mg', 'Mata Atlântica', -19.490000, -41.060000, 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-016', 'Conservador da Mantiqueira - Extrema', 'AWAITING_CERTIFICATION', 'Extrema', 'Minas Gerais', 'mg', 'Mata Atlântica', -22.850000, -46.320000, 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-017', 'Reflorestar Capixaba - Santa Teresa', 'AWAITING_AUDIT', 'Santa Teresa', 'Espírito Santo', 'es', 'Mata Atlântica', -19.930000, -40.600000, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-018', 'Restaura Caatinga - Crato', 'AWAITING_CERTIFICATION', 'Crato', 'Ceará', 'ce', 'Caatinga', -7.230000, -39.410000, 'https://images.unsplash.com/photo-1572276596237-5db2c3e16c5d?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-019', 'Raso da Catarina - Caatingas Vivas', 'ACTIVE', 'Rodelas', 'Bahia', 'ba', 'Caatinga', -8.850000, -38.770000, 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-020', 'Verde Rio Pantanal - Cuiabá', 'AWAITING_CERTIFICATION', 'Barão de Melgaço', 'Mato Grosso', 'mt', 'Pantanal', -16.190000, -55.970000, 'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-021', 'Pantanal Poconé - Baía das Pedras', 'AWAITING_AUDIT', 'Poconé', 'Mato Grosso', 'mt', 'Pantanal', -16.260000, -56.620000, 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-022', 'Miranda Pantanal - Matas de Galeria', 'AWAITING_CERTIFICATION', 'Miranda', 'Mato Grosso do Sul', 'ms', 'Pantanal', -20.240000, -56.370000, 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-023', 'Mosaico Apuí - Regeneração Amazônica', 'ACTIVE', 'Apuí', 'Amazonas', 'am', 'Amazônia', -7.200000, -59.890000, 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-024', 'Aripuanã - Castanhais e Matas Ciliares', 'AWAITING_CERTIFICATION', 'Novo Aripuanã', 'Amazonas', 'am', 'Amazônia', -7.150000, -60.380000, 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-025', 'Tapajós - Floresta em Pé', 'AWAITING_AUDIT', 'Itaituba', 'Pará', 'pa', 'Amazônia', -4.270000, -55.990000, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-026', 'Terra do Meio - Iriri Xingu', 'AWAITING_CERTIFICATION', 'Altamira', 'Pará', 'pa', 'Amazônia', -3.200000, -52.210000, 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-027', 'Paragominas Verde - Reserva Legal', 'ACTIVE', 'Paragominas', 'Pará', 'pa', 'Amazônia', -2.990000, -47.350000, 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-028', 'Ituxi - Sistemas Agroflorestais Comunitários', 'AWAITING_CERTIFICATION', 'Lábrea', 'Amazonas', 'am', 'Amazônia', -7.260000, -64.790000, 'https://images.unsplash.com/photo-1465146633011-14f8e0781093?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-029', 'Xapuri - Castanhais Nativos', 'AWAITING_AUDIT', 'Xapuri', 'Acre', 'ac', 'Amazônia', -10.650000, -68.500000, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-030', 'Bujari - Nascentes Amazônicas', 'AWAITING_CERTIFICATION', 'Bujari', 'Acre', 'ac', 'Amazônia', -9.820000, -67.950000, 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-031', 'Cacoal - Agroflorestas de Baixo Carbono', 'ACTIVE', 'Cacoal', 'Rondônia', 'ro', 'Amazônia', -11.430000, -61.440000, 'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-032', 'Porto Velho - Igarapés Urbanos', 'AWAITING_CERTIFICATION', 'Porto Velho', 'Rondônia', 'ro', 'Amazônia', -8.760000, -63.900000, 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-033', 'Formoso do Araguaia - APPs Alagáveis', 'AWAITING_AUDIT', 'Formoso do Araguaia', 'Tocantins', 'to', 'Cerrado', -11.800000, -49.530000, 'https://images.unsplash.com/photo-1503435980610-a51f3ddfee50?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-034', 'Caseara - Buritizais do Araguaia', 'AWAITING_CERTIFICATION', 'Caseara', 'Tocantins', 'to', 'Cerrado', -9.350000, -49.860000, 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-035', 'Emas - Cerrado de Mineiros', 'ACTIVE', 'Mineiros', 'Goiás', 'go', 'Cerrado', -17.570000, -52.550000, 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-036', 'Chapada dos Veadeiros - Cavalcante', 'AWAITING_CERTIFICATION', 'Cavalcante', 'Goiás', 'go', 'Cerrado', -13.800000, -47.450000, 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-037', 'Mambaí - Veredas do Nordeste Goiano', 'AWAITING_AUDIT', 'Mambaí', 'Goiás', 'go', 'Cerrado', -14.480000, -46.120000, 'https://images.pexels.com/photos/957024/forest-trees-perspective-bright-957024.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-038', 'Peruaçu - Matas Secas de Januária', 'AWAITING_CERTIFICATION', 'Januária', 'Minas Gerais', 'mg', 'Cerrado/Caatinga', -15.490000, -44.360000, 'https://images.pexels.com/photos/167698/pexels-photo-167698.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-039', 'Oeste Baiano - Cerrado de São Desidério', 'ACTIVE', 'São Desidério', 'Bahia', 'ba', 'Cerrado', -12.360000, -44.970000, 'https://images.pexels.com/photos/247600/pexels-photo-247600.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-040', 'Araripe - Reflorestando a Caatinga', 'AWAITING_CERTIFICATION', 'Floresta', 'Pernambuco', 'pe', 'Caatinga', -8.600000, -38.570000, 'https://images.pexels.com/photos/34950/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-041', 'Aiuaba - Nativas da Caatinga', 'AWAITING_CERTIFICATION', 'Aiuaba', 'Ceará', 'ce', 'Caatinga', -6.570000, -40.120000, 'https://images.pexels.com/photos/775201/pexels-photo-775201.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-042', 'Curaçá - Recaatingamento Comunitário', 'AWAITING_CERTIFICATION', 'Curaçá', 'Bahia', 'ba', 'Caatinga', -8.990000, -39.900000, 'https://images.pexels.com/photos/210186/pexels-photo-210186.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-043', 'Cariri - Quintais Produtivos Nativos', 'AWAITING_CERTIFICATION', 'Juazeiro do Norte', 'Ceará', 'ce', 'Caatinga', -7.210000, -39.320000, 'https://images.pexels.com/photos/459225/pexels-photo-459225.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-044', 'Mantiqueira - Itamonte Nascentes', 'AWAITING_AUDIT', 'Itamonte', 'Minas Gerais', 'mg', 'Mata Atlântica', -22.280000, -44.860000, 'https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-045', 'Bocaina - Nascentes de Resende', 'AWAITING_CERTIFICATION', 'Resende', 'Rio de Janeiro', 'rj', 'Mata Atlântica', -22.470000, -44.450000, 'https://images.pexels.com/photos/9754/mountains-clouds-forest-fog.jpg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-046', 'Serra do Mar - Antonina', 'ACTIVE', 'Antonina', 'Paraná', 'pr', 'Mata Atlântica', -25.430000, -48.710000, 'https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-047', 'Morretes - Corredor Guaraqueçaba', 'AWAITING_CERTIFICATION', 'Morretes', 'Paraná', 'pr', 'Mata Atlântica', -25.470000, -48.830000, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-048', 'Babitonga - Restingas de São Francisco', 'AWAITING_CERTIFICATION', 'São Francisco do Sul', 'Santa Catarina', 'sc', 'Mata Atlântica', -26.240000, -48.640000, 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-049', 'Urubici - Araucárias de Altitude', 'AWAITING_CERTIFICATION', 'Urubici', 'Santa Catarina', 'sc', 'Mata Atlântica', -28.010000, -49.590000, 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-050', 'Torres - Restinga Atlântica', 'AWAITING_CERTIFICATION', 'Torres', 'Rio Grande do Sul', 'rs', 'Mata Atlântica', -29.340000, -49.730000, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-051', 'Bagé - Campos Nativos do Pampa', 'AWAITING_CERTIFICATION', 'Bagé', 'Rio Grande do Sul', 'rs', 'Pampa', -31.330000, -54.100000, 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-052', 'Jaguarão - Matas de Galeria do Pampa', 'AWAITING_CERTIFICATION', 'Jaguarão', 'Rio Grande do Sul', 'rs', 'Pampa', -32.560000, -53.380000, 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-053', 'Arroio Pelotas - Corredores do Sul', 'AWAITING_CERTIFICATION', 'Pelotas', 'Rio Grande do Sul', 'rs', 'Pampa', -31.760000, -52.340000, 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-054', 'Silva Jardim - Corredor do Mico-Leão-Dourado', 'AWAITING_CERTIFICATION', 'Silva Jardim', 'Rio de Janeiro', 'rj', 'Mata Atlântica', -22.650000, -42.390000, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-055', 'Guapiaçu - Cachoeiras de Macacu', 'AWAITING_CERTIFICATION', 'Cachoeiras de Macacu', 'Rio de Janeiro', 'rj', 'Mata Atlântica', -22.460000, -42.650000, 'https://images.unsplash.com/photo-1572276596237-5db2c3e16c5d?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-056', 'Cantareira - Nazaré Paulista', 'AWAITING_CERTIFICATION', 'Nazaré Paulista', 'São Paulo', 'sp', 'Mata Atlântica', -23.170000, -46.400000, 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-057', 'Linhares - Corredor Rio Doce', 'AWAITING_CERTIFICATION', 'Linhares', 'Espírito Santo', 'es', 'Mata Atlântica', -19.390000, -40.060000, 'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-058', 'Domingos Martins - Montanhas Capixabas', 'AWAITING_CERTIFICATION', 'Domingos Martins', 'Espírito Santo', 'es', 'Mata Atlântica', -20.360000, -40.660000, 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-059', 'Serra da Bodoquena - Bonito', 'AWAITING_CERTIFICATION', 'Bonito', 'Mato Grosso do Sul', 'ms', 'Cerrado/Pantanal', -21.130000, -56.480000, 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-060', 'Aquidauana - Corredor Pantaneiro', 'AWAITING_CERTIFICATION', 'Aquidauana', 'Mato Grosso do Sul', 'ms', 'Pantanal', -20.470000, -55.790000, 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-061', 'Pirenópolis - Cerrado de Altitude', 'AWAITING_CERTIFICATION', 'Pirenópolis', 'Goiás', 'go', 'Cerrado', -15.850000, -48.960000, 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-062', 'Bico do Papagaio - Corredores do Araguaia', 'AWAITING_CERTIFICATION', 'Araguatins', 'Tocantins', 'to', 'Amazônia/Cerrado', -5.650000, -48.120000, 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-063', 'Chapada das Mesas - Matas Ciliares', 'AWAITING_CERTIFICATION', 'Carolina', 'Maranhão', 'ma', 'Cerrado', -7.330000, -47.470000, 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-064', 'Gurupi - Reservas Legais do Sul Tocantinense', 'AWAITING_CERTIFICATION', 'Gurupi', 'Tocantins', 'to', 'Cerrado', -11.730000, -49.070000, 'https://images.unsplash.com/photo-1465146633011-14f8e0781093?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-065', 'Marajó - Várzeas de Breves', 'AWAITING_CERTIFICATION', 'Breves', 'Pará', 'pa', 'Amazônia', -1.680000, -50.480000, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-066', 'Amapá - Corredor de Biodiversidade', 'AWAITING_CERTIFICATION', 'Macapá', 'Amapá', 'ap', 'Amazônia', 0.040000, -51.060000, 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-067', 'Lavrado de Roraima - Matas de Galeria', 'AWAITING_CERTIFICATION', 'Boa Vista', 'Roraima', 'rr', 'Amazônia/Lavrado', 2.820000, -60.670000, 'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-068', 'Corumbá - Vazantes do Paraguai', 'AWAITING_CERTIFICATION', 'Corumbá', 'Mato Grosso do Sul', 'ms', 'Pantanal', -19.010000, -57.650000, 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-069', 'Chapada Diamantina - Mucugê Nativo', 'AWAITING_CERTIFICATION', 'Mucugê', 'Bahia', 'ba', 'Caatinga/Cerrado', -13.000000, -41.370000, 'https://images.unsplash.com/photo-1503435980610-a51f3ddfee50?auto=format&fit=crop&w=900&q=80'),
  ('PRC-2026-070', 'Lençóis Maranhenses - Restingas e Buritizais', 'AWAITING_CERTIFICATION', 'Barreirinhas', 'Maranhão', 'ma', 'Costeiro/Cerrado', -2.750000, -42.830000, 'https://images.pexels.com/photos/2166711/pexels-photo-2166711.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-071', 'Jequitinhonha - Nascentes e Mata Seca', 'AWAITING_CERTIFICATION', 'Araçuaí', 'Minas Gerais', 'mg', 'Cerrado/Caatinga', -16.850000, -42.070000, 'https://images.pexels.com/photos/2739664/pexels-photo-2739664.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-072', 'Serra Geral - Veredas do Tocantins', 'AWAITING_CERTIFICATION', 'Dianópolis', 'Tocantins', 'to', 'Cerrado', -11.620000, -46.820000, 'https://images.pexels.com/photos/957024/forest-trees-perspective-bright-957024.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-073', 'Parnaíba - Nascentes do Cerrado', 'AWAITING_CERTIFICATION', 'Alto Parnaíba', 'Maranhão', 'ma', 'Cerrado', -9.110000, -45.930000, 'https://images.pexels.com/photos/167698/pexels-photo-167698.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-074', 'Ibitipoca - Corredores da Mantiqueira', 'AWAITING_CERTIFICATION', 'Lima Duarte', 'Minas Gerais', 'mg', 'Mata Atlântica', -21.720000, -43.880000, 'https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-075', 'Serra do Cipó - Campos Rupestres', 'AWAITING_CERTIFICATION', 'Santana do Riacho', 'Minas Gerais', 'mg', 'Cerrado/Mata Atlântica', -19.170000, -43.710000, 'https://images.pexels.com/photos/9754/mountains-clouds-forest-fog.jpg?auto=compress&cs=tinysrgb&w=900'),
  ('PRC-2026-076', 'Delta do Parnaíba - Manguezais e Restingas', 'AWAITING_CERTIFICATION', 'Parnaíba', 'Piauí', 'pi', 'Costeiro/Caatinga', -2.910000, -41.770000, 'https://images.pexels.com/photos/210186/pexels-photo-210186.jpeg?auto=compress&cs=tinysrgb&w=900')
),
expanded_demo_projects as (
  select
    *,
    (300 + (right(friendly_id, 3)::int % 17) * 110)::numeric(14, 2) as seeded_area_hectares,
    case
      when biome ilike '%Amaz%' then 'REDD+ + restauração ativa'
      when biome ilike '%Pantanal%' then 'Restauração ripária Pantanal'
      when biome ilike '%Caatinga%' then 'Restauração florestal Caatinga'
      when biome ilike '%Pampa%' then 'Restauração campestre Pampa'
      when biome ilike '%Mata%' then 'ARR Florestal Nativa'
      else 'APP/RL - Código Florestal'
    end as seeded_methodology
  from diversified_demo_projects
)
insert into projects (
  friendly_id, source_hash, version, name, description, baseline, methodology, methodology_link, status,
  producer_organization_id, developer_organization_id, auditor_organization_id, certifier_organization_id, registry_organization_id,
  city, state, state_id, biome, latitude, longitude, svg_x, svg_y, area_hectares, carbon_stock,
  investment_value_brl, vintage, image_url, serial_start, serial_end, contract_address, merkle_root,
  timeline, metadata
)
select
  friendly_id,
  'demo-diversified-' || lower(friendly_id),
  'v1.0',
  name,
  'Projeto demonstrativo de restauração ambiental em ' || city || ', ' || state || ', para diversificar o catálogo local do SINARCA.',
  'Área de exemplo com passivo de recomposição florestal, conectividade ecológica e monitoramento geoespacial.',
  seeded_methodology,
  null,
  status::project_status,
  (select id from organizations where external_id = 'prod-001'),
  (select id from organizations where external_id = 'dev-001'),
  (select id from organizations where external_id = 'aud-005'),
  (select id from organizations where external_id = 'std-001'),
  (select id from organizations where external_id = 'reg-001'),
  city,
  state,
  state_id,
  biome,
  latitude,
  longitude,
  round((40 + ((longitude + 74.0) / 40.0) * 540)::numeric, 2),
  round((35 + ((5.0 - latitude) / 39.0) * 560)::numeric, 2),
  seeded_area_hectares,
  round(seeded_area_hectares * case when biome ilike '%Amaz%' then 45 when biome ilike '%Mata%' then 54 when biome ilike '%Pantanal%' then 32 when biome ilike '%Pampa%' then 18 else 24 end, 2),
  round(seeded_area_hectares * 2700, 2),
  '2026',
  image_url,
  replace(friendly_id, 'PRC', 'BR') || '-000001',
  replace(friendly_id, 'PRC', 'BR') || '-999999',
  'pending',
  'demo-root-' || lower(friendly_id),
  jsonb_build_array(jsonb_build_object(
    'title', 'Registro demo diversificado',
    'date', '2026-05-26',
    'status', 'active',
    'desc', 'Projeto de exemplo persistido no seed local do SINARCA.'
  )),
  jsonb_build_object(
    'source', 'seed demo diversification',
    'demo_data', true,
    'demo_data_note', 'Registro local diversificado para demonstração; inspirado em áreas e iniciativas públicas de restauração, sem declarar certificação oficial desses projetos.',
    'diversified_at', '2026-05-26'
  )
from expanded_demo_projects
on conflict (friendly_id) do update set
  source_hash = excluded.source_hash,
  version = excluded.version,
  name = excluded.name,
  description = excluded.description,
  baseline = excluded.baseline,
  methodology = excluded.methodology,
  methodology_link = excluded.methodology_link,
  status = excluded.status,
  producer_organization_id = excluded.producer_organization_id,
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
  timeline = excluded.timeline,
  metadata = excluded.metadata,
  updated_at = now();

insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2024-002'), true, '04A224C8D91C90', 'cmac-prc-002-a', -10.171200, -48.339100, 'A', 'ACTIVE', '2024-02-10T08:00:00Z', '2024-02-25T09:30:00Z', jsonb_build_object('source', 'NFC 424 DNA seed')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), true, '04A224C8D91C91', 'cmac-prc-002-b', -10.182500, -48.317800, 'B', 'ACTIVE', '2024-02-10T08:10:00Z', '2024-02-25T09:34:00Z', jsonb_build_object('source', 'NFC 424 DNA seed')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), true, '04A224C8D91C92', 'cmac-prc-002-c', -10.198900, -48.334200, 'C', 'ACTIVE', '2024-02-10T08:20:00Z', '2024-02-25T09:38:00Z', jsonb_build_object('source', 'NFC 424 DNA seed')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), true, '04A224C8D91C93', 'cmac-prc-002-d', -10.184100, -48.352000, 'D', 'ACTIVE', '2024-02-10T08:30:00Z', '2024-02-25T09:42:00Z', jsonb_build_object('source', 'NFC 424 DNA seed'))
on conflict (tag_uid) do update set
  project_id = excluded.project_id,
  has_qtag = excluded.has_qtag,
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
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'S2A_MSIL2A_20240215T133241_N0509_R081_T22LHH', 'baseline-prc-2024-002-cerrado', 5000, 72.400, 0.681, '2024-02-15T13:32:41Z', 's3://sinarca-seed/baselines/PRC-2024-002.json'),
  ((select id from projects where friendly_id = 'PRC-2026-010'), 'S2A_MSIL2A_20260520T133241_N0509_R081_T22LHH', 'baseline-prc-2026-010-certifier-queue', 5000, 58.100, 0.552, '2026-05-20T13:32:41Z', 's3://sinarca-seed/baselines/PRC-2026-010.json'),
  ((select id from projects where friendly_id = 'PRC-2026-011'), 'S2A_MSIL2A_20260521T133241_N0509_R081_T22LHH', 'baseline-prc-2026-011-auditor-queue', 5000, 64.800, 0.604, '2026-05-21T13:32:41Z', 's3://sinarca-seed/baselines/PRC-2026-011.json')
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
  ((select id from projects where friendly_id = 'PRC-2024-002'), (select id from organizations where external_id = 'std-002'), (select id from profiles where external_id = 'std-001-user'), 'AR-ACM0003', 85000, 'APPROVED', 'Certificação inicial consolidada do Carbono Cerrado.', 'sha256-cert-prc-2024-002', '2024-02-25T10:00:00Z'),
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
  ((select id from projects where friendly_id = 'PRC-2024-002'), (select id from organizations where external_id = 'aud-002'), (select id from profiles where external_id = 'aud-005'), 'APPROVED', 'Auditoria aprovada com trilha documental suficiente.', -10.180000, -48.330000, '["https://example.test/evidencia-cerrado.jpg"]'::jsonb, 'assinatura-seed-cerrado', '2024-03-01T14:00:00Z'),
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
  ((select id from projects where friendly_id = 'PRC-2024-002'), '2024', 85000, 84500, 0, 'AVAILABLE', jsonb_build_object('source', 'legacy-mvp-seed + src/data/mrca_db.ts', 'asset', 'Carbono Cerrado'), 'BR-2024-002-000001', 'BR-2024-002-085000'),
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
  ((select id from projects where friendly_id = 'PRC-2024-882'), (select id from organizations where external_id = 'comp-001'), 1200, '{"scope1":400,"scope2":500,"scope3":300,"total":1200}'::jsonb, 'certificate-tx-001-reserva-juma', '0x7f9...e4r5', 's3://sinarca-seed/retirements/tx-001.pdf', 'COMPLETED', 'tx-001', '2026-05-22T10:30:00Z'),
  ((select id from projects where friendly_id = 'PRC-2025-002'), (select id from organizations where external_id = 'comp-001'), 150, '{"scope1":50,"scope2":80,"scope3":20,"total":150}'::jsonb, 'certificate-tx-005-solar', '0x3e4...r5t6', 's3://sinarca-seed/retirements/tx-005.pdf', 'COMPLETED', 'tx-005', '2024-12-20T12:00:00Z')
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
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'TREASURY_LOCK', 'etherfuse', 'etherfuse-seed-prc-2024-002', 'etherfuse-seed-prc-2024-002', 4250000, 'CONFIRMED', jsonb_build_object('source', 'DOCX financeiro', 'provider', 'Etherfuse')),
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'VAULT_LOCK', 'polygon', 'polygon-lock-seed-prc-2024-002', 'polygon-lock-seed-prc-2024-002', 1000, 'RECORDED', jsonb_build_object('source', 'lock-and-mint seed'))
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
  ((select id from projects where friendly_id = 'PRC-2024-002'), 'polygon', '0xVaultSinarcaSeed000000000000000000000002', '0xCreditTokenSeed0000000000000000000000002', 'polygon-lock-seed-prc-2024-002', 'SINARCA-PRC-2024-002-WRAPPED', 'WRAPPED_MINTED', jsonb_build_object('source', 'DOCX-LOCK-AND-MINT', 'network', 'polygon-amoy-seed'))
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
  ((select id from organizations where external_id = 'std-002'), (select id from projects where friendly_id = 'PRC-2024-002'), 'CERTIFICATION_REPORT', 's3://sinarca-seed/documents/prc-2024-002-certification.pdf', 'sha256-cert-prc-2024-002', 'application/pdf', 204800, jsonb_build_object('source', 'certification seed')),
  ((select id from organizations where external_id = 'aud-002'), (select id from projects where friendly_id = 'PRC-2024-002'), 'AUDIT_REPORT', 's3://sinarca-seed/documents/prc-2024-002-audit.pdf', 'sha256-audit-prc-2024-002', 'application/pdf', 307200, jsonb_build_object('source', 'audit seed'))
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
