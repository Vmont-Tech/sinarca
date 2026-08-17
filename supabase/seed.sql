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
    jsonb_build_object('source', 'frontend AuditorReview queue', 'queue', 'auditor')),
  ('PRC-2026-077', 'infoterras-relatorio-mg-3126000-4a5f440a95394810a3531aeb447bcbab', 'v1.0', 'Projeto Florestal MG – Mata Atlântica',
    'Projeto ambiental localizado no município de Florestal, Minas Gerais, em propriedade rural com área total de aproximadamente 186,5 hectares, inserida predominantemente no bioma Mata Atlântica. A área apresenta aproximadamente 79 hectares de formação florestal, além de áreas de pastagem e mosaico de usos, e possui cerca de 42 hectares destinados à Reserva Legal. O projeto tem como objetivo promover a conservação e o monitoramento da cobertura vegetal, garantindo rastreabilidade das informações ambientais e acompanhamento contínuo da área por dados geoespaciais.',
    'Imóvel rural com 42% de cobertura de vegetação nativa (Formação Florestal), 38% de pastagem e 17% de mosaico de usos (MapBiomas 2024); sem desmatamento relevante recente e sem embargos ambientais. Reserva Legal proposta de 42 ha (22,8%) aguardando averbação no CAR.',
    'ARR Florestal Nativa', null, 'CREATED', false,
    (select id from organizations where external_id = 'prod-001'), (select id from organizations where external_id = 'aud-005'), (select id from organizations where external_id = 'std-001'), (select id from organizations where external_id = 'reg-001'),
    'Florestal', 'Minas Gerais', 'mg', 'Mata Atlântica', -19.913490, -44.515100, 438.06, 392.73, 186.50, 35000.00, 1750000.00, '2026',
    '/seed-images/prc-2026-077-florestal-mg.jpg', 'BR-2026-077-000001', 'BR-2026-077-035000', 'pending', 'pending', null, '2026-08-10T14:00:00Z',
    '[{"title":"Diagnóstico territorial recebido","date":"2026-08-10","status":"completed","desc":"Relatório INFOTERRAS (Geoportal Rural MG) com análise territorial, ambiental, fundiária e logística do imóvel."},{"title":"Cadastro no SINARCA","date":"2026-08-16","status":"active","desc":"Projeto registrado para estruturação e futura quantificação de carbono."}]'::jsonb,
    jsonb_build_object(
      'source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB (emitido 10/08/2026)',
      'frontendStatus', 'CREATED',
      'car_code', 'MG-3126000-4A5F440A95394810A3531AEB447BCBAB',
      'reserva_legal_ha', 42,
      'formacao_florestal_ha', 79,
      'pastagem_ha', 71,
      'app_ha', 4.22,
      'carbon_potential_note', 'Potencial inicial de 35.000 tCO2e é uma estimativa preliminar para fins de estruturação do projeto; deverá ser validado por metodologia de quantificação de carbono, inventário florestal e processo de certificação.',
      'attention_flags', jsonb_build_array('minerarios_anm_3_processos'),
      'image_note', 'Foto real do imóvel (plantio de eucalipto), servida como asset estático do frontend em public/seed-images/ para sobreviver a supabase db reset — não depende de upload no Supabase Storage.'
    ))
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
on conflict (tag_uid) where tag_uid is not null do update set
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

-- PRC-2026-077 (Projeto Florestal MG – Mata Atlântica) vertices come from the
-- INFOTERRAS geoportal report, not physical NFC QTags, so there is no natural
-- tag_uid to upsert on. Delete-then-insert keeps this idempotent across
-- repeated seed runs, mirroring the certifications delete-then-insert below.
delete from project_tags
where project_id = (select id from projects where friendly_id = 'PRC-2026-077');

insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.903226, -44.518613, 'A', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.906689, -44.519208, 'B', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.908847, -44.517904, 'C', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.913721, -44.520879, 'D', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.919421, -44.521757, 'E', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.921445, -44.523287, 'F', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.921871, -44.522550, 'G', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.920886, -44.520794, 'H', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.920833, -44.517026, 'I', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.919847, -44.513173, 'J', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.916917, -44.509660, 'K', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.912735, -44.506488, 'L', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.910977, -44.507337, 'M', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.908394, -44.511870, 'N', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB')),
  ((select id from projects where friendly_id = 'PRC-2026-077'), false, null, null, -19.907302, -44.511814, 'O', 'ACTIVE', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', jsonb_build_object('source', 'INFOTERRAS relatório MG-3126000-4A5F440A95394810A3531AEB447BCBAB'));

-- Vertices sintéticos para os projetos do seed que ainda não tinham QTAGs/geofence
-- (todos exceto PRC-2024-002 e PRC-2026-077). Gerados deterministicamente a partir
-- do centroide (latitude/longitude) já seedado de cada projeto: polígono irregular
-- de 4 a 7 vértices, ângulo-ordenado (garante geometria simples/não-autointersectante),
-- com raio limitado a 40% da distância ao vizinho mais próximo entre TODOS os projetos
-- (existentes + novos) -- garante matematicamente que nenhum par de geofences se
-- sobrepõe, mesmo quando isso significa não atingir a área alvo de `seeded_area_hectares`
-- (ex.: PRC-2024-882/Novo Aripuanã fica perto de PRC-2026-024, mesma cidade).
-- Sem tag_uid (sem NFC físico), mesmo padrão de PRC-2026-077.
delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2023-555');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2023-555'), false, null, null, -26.294478, -48.831953, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2023-555'), false, null, null, -26.306959, -48.834903, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2023-555'), false, null, null, -26.308803, -48.845465, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2023-555'), false, null, null, -26.299007, -48.850622, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2023-555'), false, null, null, -26.291615, -48.844353, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2024-882');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2024-882'), false, null, null, -7.189051, -60.351359, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2024-882'), false, null, null, -7.200716, -60.342805, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2024-882'), false, null, null, -7.224862, -60.342688, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2024-882'), false, null, null, -7.226625, -60.375104, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2024-882'), false, null, null, -7.194260, -60.379609, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2025-001');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2025-001'), false, null, null, -3.196073, -52.199394, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-001'), false, null, null, -3.200135, -52.196632, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-001'), false, null, null, -3.203347, -52.198558, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-001'), false, null, null, -3.202988, -52.202386, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-001'), false, null, null, -3.200414, -52.203481, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2025-002');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2025-002'), false, null, null, -8.274708, -35.969806, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-002'), false, null, null, -8.276868, -35.965349, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-002'), false, null, null, -8.279619, -35.964562, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-002'), false, null, null, -8.285278, -35.968525, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-002'), false, null, null, -8.284700, -35.972554, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-002'), false, null, null, -8.280457, -35.975865, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2025-002'), false, null, null, -8.275456, -35.973555, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-008');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-008'), false, null, null, -9.317348, -50.344813, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-008'), false, null, null, -9.328153, -50.333687, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-008'), false, null, null, -9.344105, -50.346012, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-008'), false, null, null, -9.329221, -50.363839, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-009');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-009'), false, null, null, -13.533643, -52.265650, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-009'), false, null, null, -13.544048, -52.257395, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-009'), false, null, null, -13.561863, -52.276402, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-009'), false, null, null, -13.557024, -52.285241, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-010');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-010'), false, null, null, -10.731833, -47.535876, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-010'), false, null, null, -10.741229, -47.529213, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-010'), false, null, null, -10.752906, -47.523046, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-010'), false, null, null, -10.764528, -47.534836, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-010'), false, null, null, -10.762791, -47.546537, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-010'), false, null, null, -10.758268, -47.556862, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-010'), false, null, null, -10.742657, -47.552392, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-011');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-011'), false, null, null, -9.267464, -49.932663, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-011'), false, null, null, -9.282794, -49.941389, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-011'), false, null, null, -9.278424, -49.962493, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-011'), false, null, null, -9.268024, -49.966406, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-011'), false, null, null, -9.251160, -49.951299, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-012');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-012'), false, null, null, -6.641046, -51.974876, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-012'), false, null, null, -6.652079, -51.981409, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-012'), false, null, null, -6.654425, -51.993716, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-012'), false, null, null, -6.641320, -52.006133, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-012'), false, null, null, -6.624757, -51.991738, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-013');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-013'), false, null, null, -23.240571, -47.293436, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-013'), false, null, null, -23.253232, -47.282722, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-013'), false, null, null, -23.261898, -47.282789, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-013'), false, null, null, -23.279047, -47.294968, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-013'), false, null, null, -23.274971, -47.314425, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-013'), false, null, null, -23.258795, -47.321172, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-013'), false, null, null, -23.248296, -47.314663, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-014');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-014'), false, null, null, -22.511657, -52.169266, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-014'), false, null, null, -22.516169, -52.156199, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-014'), false, null, null, -22.534836, -52.149338, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-014'), false, null, null, -22.546082, -52.165899, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-014'), false, null, null, -22.542584, -52.180743, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-014'), false, null, null, -22.530144, -52.188017, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-014'), false, null, null, -22.521339, -52.185786, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-015');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-015'), false, null, null, -19.480778, -41.044514, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-015'), false, null, null, -19.507275, -41.050045, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-015'), false, null, null, -19.505167, -41.071227, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-015'), false, null, null, -19.490967, -41.081729, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-015'), false, null, null, -19.474850, -41.067384, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-016');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-016'), false, null, null, -22.846626, -46.298269, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-016'), false, null, null, -22.855694, -46.301271, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-016'), false, null, null, -22.871944, -46.327192, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-016'), false, null, null, -22.855889, -46.343753, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-016'), false, null, null, -22.839065, -46.334223, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-016'), false, null, null, -22.828436, -46.322508, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-017');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-017'), false, null, null, -19.922698, -40.599509, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-017'), false, null, null, -19.927408, -40.593476, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-017'), false, null, null, -19.932667, -40.593274, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-017'), false, null, null, -19.937813, -40.602518, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-017'), false, null, null, -19.933408, -40.607501, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-017'), false, null, null, -19.928333, -40.607218, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-018');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-018'), false, null, null, -7.222501, -39.407105, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-018'), false, null, null, -7.230820, -39.399825, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-018'), false, null, null, -7.238775, -39.407609, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-018'), false, null, null, -7.237175, -39.413411, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-018'), false, null, null, -7.230550, -39.417781, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-019');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-019'), false, null, null, -8.849030, -38.758957, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-019'), false, null, null, -8.859108, -38.768613, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-019'), false, null, null, -8.846556, -38.778130, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-019'), false, null, null, -8.838723, -38.772037, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-020');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-020'), false, null, null, -16.186091, -55.959947, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-020'), false, null, null, -16.195619, -55.959129, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-020'), false, null, null, -16.199850, -55.968316, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-020'), false, null, null, -16.197843, -55.975092, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-020'), false, null, null, -16.190239, -55.980342, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-020'), false, null, null, -16.182427, -55.977946, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-020'), false, null, null, -16.178109, -55.972610, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-021');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-021'), false, null, null, -16.257508, -56.606747, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-021'), false, null, null, -16.270666, -56.615892, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-021'), false, null, null, -16.262465, -56.632664, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-021'), false, null, null, -16.246828, -56.623716, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-022');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-022'), false, null, null, -20.227254, -56.366117, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-022'), false, null, null, -20.237102, -56.355967, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-022'), false, null, null, -20.249849, -56.358439, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-022'), false, null, null, -20.252802, -56.368939, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-022'), false, null, null, -20.246006, -56.383824, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-022'), false, null, null, -20.235388, -56.384302, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-023');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-023'), false, null, null, -7.186679, -59.884692, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-023'), false, null, null, -7.199036, -59.878027, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-023'), false, null, null, -7.213312, -59.882827, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-023'), false, null, null, -7.197561, -59.903705, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-024');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-024'), false, null, null, -7.136927, -60.378435, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-024'), false, null, null, -7.145476, -60.368565, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-024'), false, null, null, -7.155440, -60.367483, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-024'), false, null, null, -7.161122, -60.371193, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-024'), false, null, null, -7.163877, -60.384251, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-024'), false, null, null, -7.155033, -60.394244, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-024'), false, null, null, -7.139424, -60.388696, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-025');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-025'), false, null, null, -4.258115, -55.979198, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-025'), false, null, null, -4.275230, -55.974438, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-025'), false, null, null, -4.282623, -55.986991, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-025'), false, null, null, -4.282524, -55.997461, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-025'), false, null, null, -4.275432, -56.004181, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-025'), false, null, null, -4.260069, -56.003419, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-025'), false, null, null, -4.256695, -55.993656, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-026');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-026'), false, null, null, -3.196159, -52.209472, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-026'), false, null, null, -3.199324, -52.206469, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-026'), false, null, null, -3.201529, -52.207435, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-026'), false, null, null, -3.203368, -52.208787, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-026'), false, null, null, -3.200590, -52.213627, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-026'), false, null, null, -3.199205, -52.213607, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-027');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-027'), false, null, null, -2.983816, -47.337037, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-027'), false, null, null, -2.998607, -47.334880, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-027'), false, null, null, -3.007420, -47.347286, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-027'), false, null, null, -3.004111, -47.362283, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-027'), false, null, null, -2.999096, -47.366416, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-027'), false, null, null, -2.982426, -47.367324, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-027'), false, null, null, -2.972341, -47.353885, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-028');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-028'), false, null, null, -7.243231, -64.788561, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-028'), false, null, null, -7.251745, -64.775797, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-028'), false, null, null, -7.262458, -64.774939, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-028'), false, null, null, -7.271691, -64.781444, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-028'), false, null, null, -7.275570, -64.800293, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-028'), false, null, null, -7.264962, -64.808842, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-028'), false, null, null, -7.253418, -64.804754, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-029');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-029'), false, null, null, -10.634984, -68.495357, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-029'), false, null, null, -10.647628, -68.485190, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-029'), false, null, null, -10.656192, -68.483018, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-029'), false, null, null, -10.669867, -68.498180, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-029'), false, null, null, -10.656824, -68.515742, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-029'), false, null, null, -10.637811, -68.510807, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-030');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-030'), false, null, null, -9.822896, -67.931891, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-030'), false, null, null, -9.833556, -67.942384, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-030'), false, null, null, -9.809675, -67.967104, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-030'), false, null, null, -9.803497, -67.957981, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-031');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-031'), false, null, null, -11.436133, -61.420199, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-031'), false, null, null, -11.447142, -61.435158, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-031'), false, null, null, -11.436028, -61.455863, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-031'), false, null, null, -11.411807, -61.447106, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-032');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-032'), false, null, null, -8.743002, -63.892227, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-032'), false, null, null, -8.750408, -63.884737, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-032'), false, null, null, -8.769191, -63.884812, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-032'), false, null, null, -8.775094, -63.908750, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-032'), false, null, null, -8.744826, -63.916604, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-033');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-033'), false, null, null, -11.786164, -49.513466, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-033'), false, null, null, -11.806283, -49.508203, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-033'), false, null, null, -11.816695, -49.526668, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-033'), false, null, null, -11.813149, -49.541039, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-033'), false, null, null, -11.799198, -49.549426, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-033'), false, null, null, -11.788176, -49.543392, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-033'), false, null, null, -11.782917, -49.532957, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-034');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-034'), false, null, null, -9.351112, -49.853043, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-034'), false, null, null, -9.356833, -49.858975, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-034'), false, null, null, -9.346258, -49.867750, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-034'), false, null, null, -9.341477, -49.860375, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-035');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-035'), false, null, null, -17.566619, -52.540546, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-035'), false, null, null, -17.576391, -52.542447, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-035'), false, null, null, -17.577344, -52.551064, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-035'), false, null, null, -17.575715, -52.556078, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-035'), false, null, null, -17.565502, -52.556488, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-035'), false, null, null, -17.562125, -52.552484, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-036');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-036'), false, null, null, -13.798342, -47.441572, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-036'), false, null, null, -13.807014, -47.443705, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-036'), false, null, null, -13.806474, -47.455636, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-036'), false, null, null, -13.796177, -47.458909, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-036'), false, null, null, -13.790904, -47.453724, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-037');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-037'), false, null, null, -14.470847, -46.115241, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-037'), false, null, null, -14.477412, -46.109844, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-037'), false, null, null, -14.490157, -46.118562, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-037'), false, null, null, -14.482072, -46.131655, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-038');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-038'), false, null, null, -15.485262, -44.349652, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-038'), false, null, null, -15.495341, -44.348547, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-038'), false, null, null, -15.502297, -44.354704, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-038'), false, null, null, -15.500474, -44.363688, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-038'), false, null, null, -15.489965, -44.370362, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-038'), false, null, null, -15.481030, -44.366320, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-038'), false, null, null, -15.477333, -44.361735, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-039');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-039'), false, null, null, -12.361301, -44.955010, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-039'), false, null, null, -12.370527, -44.964937, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-039'), false, null, null, -12.371448, -44.977820, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-039'), false, null, null, -12.355431, -44.980924, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-039'), false, null, null, -12.349824, -44.973866, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-040');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-040'), false, null, null, -8.588122, -38.565982, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-040'), false, null, null, -8.592871, -38.559562, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-040'), false, null, null, -8.613909, -38.562705, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-040'), false, null, null, -8.610216, -38.575636, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-040'), false, null, null, -8.590915, -38.581845, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-041');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-041'), false, null, null, -6.556159, -40.118327, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-041'), false, null, null, -6.567145, -40.104247, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-041'), false, null, null, -6.579986, -40.107521, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-041'), false, null, null, -6.584404, -40.125503, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-041'), false, null, null, -6.568517, -40.132740, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-042');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-042'), false, null, null, -8.976481, -39.897935, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-042'), false, null, null, -8.981899, -39.887272, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-042'), false, null, null, -9.000244, -39.887633, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-042'), false, null, null, -9.004281, -39.899794, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-042'), false, null, null, -8.996010, -39.912944, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-042'), false, null, null, -8.982286, -39.915480, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-043');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-043'), false, null, null, -7.191824, -39.319075, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-043'), false, null, null, -7.200283, -39.306778, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-043'), false, null, null, -7.216322, -39.306379, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-043'), false, null, null, -7.227543, -39.316196, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-043'), false, null, null, -7.224548, -39.328221, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-043'), false, null, null, -7.216971, -39.332156, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-043'), false, null, null, -7.201167, -39.332335, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-044');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-044'), false, null, null, -22.278119, -44.840714, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-044'), false, null, null, -22.289457, -44.843225, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-044'), false, null, null, -22.296338, -44.866477, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-044'), false, null, null, -22.270241, -44.872479, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-044'), false, null, null, -22.263562, -44.866010, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-045');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-045'), false, null, null, -22.450453, -44.448033, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-045'), false, null, null, -22.479502, -44.431567, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-045'), false, null, null, -22.485858, -44.454911, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-045'), false, null, null, -22.460773, -44.466881, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-046');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-046'), false, null, null, -25.420919, -48.694459, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-046'), false, null, null, -25.435411, -48.692451, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-046'), false, null, null, -25.449103, -48.702688, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-046'), false, null, null, -25.448550, -48.714710, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-046'), false, null, null, -25.438853, -48.727577, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-046'), false, null, null, -25.418994, -48.721826, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-046'), false, null, null, -25.414090, -48.711197, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-047');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-047'), false, null, null, -25.454723, -48.828282, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-047'), false, null, null, -25.462893, -48.812453, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-047'), false, null, null, -25.479666, -48.814213, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-047'), false, null, null, -25.486358, -48.823457, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-047'), false, null, null, -25.476533, -48.847075, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-047'), false, null, null, -25.458775, -48.849487, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-048');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-048'), false, null, null, -26.222731, -48.637285, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-048'), false, null, null, -26.237159, -48.617793, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-048'), false, null, null, -26.258943, -48.650665, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-048'), false, null, null, -26.248022, -48.660701, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-049');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-049'), false, null, null, -27.997727, -49.576453, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-049'), false, null, null, -28.017944, -49.568579, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-049'), false, null, null, -28.025866, -49.585143, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-049'), false, null, null, -28.028695, -49.600859, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-049'), false, null, null, -28.013232, -49.611319, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-049'), false, null, null, -28.000926, -49.609259, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-049'), false, null, null, -27.989592, -49.595799, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-050');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-050'), false, null, null, -29.320111, -49.727728, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-050'), false, null, null, -29.330310, -49.713649, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-050'), false, null, null, -29.346094, -49.708615, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-050'), false, null, null, -29.359373, -49.728328, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-050'), false, null, null, -29.348495, -49.752189, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-050'), false, null, null, -29.330856, -49.753672, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-051');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-051'), false, null, null, -31.329509, -54.091855, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-051'), false, null, null, -31.337084, -54.097321, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-051'), false, null, null, -31.331479, -54.109195, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-051'), false, null, null, -31.322987, -54.101673, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-052');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-052'), false, null, null, -32.553730, -53.371730, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-052'), false, null, null, -32.560579, -53.371089, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-052'), false, null, null, -32.568234, -53.373886, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-052'), false, null, null, -32.565714, -53.385733, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-052'), false, null, null, -32.564305, -53.390239, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-052'), false, null, null, -32.556848, -53.388418, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-052'), false, null, null, -32.552250, -53.380922, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-053');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-053'), false, null, null, -31.751583, -52.339872, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-053'), false, null, null, -31.755252, -52.329586, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-053'), false, null, null, -31.762522, -52.329302, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-053'), false, null, null, -31.769337, -52.335409, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-053'), false, null, null, -31.766891, -52.347363, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-053'), false, null, null, -31.763864, -52.352712, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-053'), false, null, null, -31.753724, -52.349914, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-054');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-054'), false, null, null, -22.640963, -42.387635, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-054'), false, null, null, -22.643633, -42.378696, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-054'), false, null, null, -22.657861, -42.379422, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-054'), false, null, null, -22.657174, -42.399434, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-054'), false, null, null, -22.647252, -42.399754, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-055');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-055'), false, null, null, -22.449840, -42.649875, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-055'), false, null, null, -22.456751, -42.637510, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-055'), false, null, null, -22.468877, -42.643667, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-055'), false, null, null, -22.468215, -42.656638, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-055'), false, null, null, -22.452082, -42.659565, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-056');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-056'), false, null, null, -23.157639, -46.399604, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-056'), false, null, null, -23.158779, -46.391316, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-056'), false, null, null, -23.170746, -46.383966, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-056'), false, null, null, -23.180325, -46.395672, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-056'), false, null, null, -23.180418, -46.404155, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-056'), false, null, null, -23.170356, -46.414263, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-056'), false, null, null, -23.161038, -46.408678, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-057');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-057'), false, null, null, -19.393332, -40.047574, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-057'), false, null, null, -19.402962, -40.063489, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-057'), false, null, null, -19.387049, -40.076070, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-057'), false, null, null, -19.376803, -40.067673, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-058');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-058'), false, null, null, -20.356921, -40.645229, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-058'), false, null, null, -20.363684, -40.646488, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-058'), false, null, null, -20.375703, -40.656002, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-058'), false, null, null, -20.371462, -40.671591, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-058'), false, null, null, -20.350588, -40.669055, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-058'), false, null, null, -20.347345, -40.664479, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-059');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-059'), false, null, null, -21.119677, -56.469076, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-059'), false, null, null, -21.134890, -56.463877, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-059'), false, null, null, -21.143685, -56.484787, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-059'), false, null, null, -21.139710, -56.492652, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-059'), false, null, null, -21.121929, -56.492199, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-059'), false, null, null, -21.114469, -56.486180, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-060');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-060'), false, null, null, -20.459163, -55.781329, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-060'), false, null, null, -20.474557, -55.776334, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-060'), false, null, null, -20.482351, -55.781878, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-060'), false, null, null, -20.484454, -55.800587, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-060'), false, null, null, -20.474354, -55.804655, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-060'), false, null, null, -20.463471, -55.807222, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-060'), false, null, null, -20.455847, -55.790004, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-061');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-061'), false, null, null, -15.832211, -48.956167, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-061'), false, null, null, -15.841727, -48.947244, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-061'), false, null, null, -15.850680, -48.944086, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-061'), false, null, null, -15.862630, -48.950180, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-061'), false, null, null, -15.863671, -48.967674, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-061'), false, null, null, -15.850949, -48.978246, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-061'), false, null, null, -15.835205, -48.972112, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-062');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-062'), false, null, null, -5.640145, -48.109102, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-062'), false, null, null, -5.662115, -48.109005, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-062'), false, null, null, -5.667877, -48.124608, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-062'), false, null, null, -5.651781, -48.134230, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-062'), false, null, null, -5.635821, -48.123451, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-063');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-063'), false, null, null, -7.321661, -47.454731, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-063'), false, null, null, -7.344448, -47.461577, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-063'), false, null, null, -7.345848, -47.477319, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-063'), false, null, null, -7.326060, -47.485794, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-063'), false, null, null, -7.313983, -47.474000, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-064');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-064'), false, null, null, -11.732811, -49.048788, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-064'), false, null, null, -11.747757, -49.070137, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-064'), false, null, null, -11.720349, -49.088615, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-064'), false, null, null, -11.710175, -49.076462, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-065');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-065'), false, null, null, -1.687209, -50.462670, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-065'), false, null, null, -1.696494, -50.476307, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-065'), false, null, null, -1.679371, -50.500168, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-065'), false, null, null, -1.663480, -50.484576, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-066');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-066'), false, null, null, 0.041800, -51.040144, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-066'), false, null, null, 0.026307, -51.045145, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-066'), false, null, null, 0.021313, -51.071956, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-066'), false, null, null, 0.049539, -51.078097, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-066'), false, null, null, 0.060652, -51.063933, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-067');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-067'), false, null, null, 2.841000, -60.663906, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-067'), false, null, null, 2.831926, -60.657224, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-067'), false, null, null, 2.812207, -60.650587, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-067'), false, null, null, 2.802646, -60.655906, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-067'), false, null, null, 2.807101, -60.682141, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-067'), false, null, null, 2.815861, -60.692050, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-067'), false, null, null, 2.838058, -60.683404, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-068');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-068'), false, null, null, -19.007410, -57.643028, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-068'), false, null, null, -19.010492, -57.641491, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-068'), false, null, null, -19.016328, -57.647176, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-068'), false, null, null, -19.016106, -57.654814, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-068'), false, null, null, -19.011222, -57.657269, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-068'), false, null, null, -19.003330, -57.655969, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-068'), false, null, null, -19.003170, -57.651805, 'G', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-069');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-069'), false, null, null, -12.999351, -41.361044, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-069'), false, null, null, -13.004381, -41.363475, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-069'), false, null, null, -13.006890, -41.376236, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-069'), false, null, null, -12.999586, -41.378261, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-069'), false, null, null, -12.991836, -41.373511, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-070');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-070'), false, null, null, -2.743139, -42.824101, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-070'), false, null, null, -2.754686, -42.821644, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-070'), false, null, null, -2.759798, -42.832689, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-070'), false, null, null, -2.755516, -42.839754, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-070'), false, null, null, -2.742603, -42.836224, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-070'), false, null, null, -2.739879, -42.833469, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-071');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-071'), false, null, null, -16.840479, -42.068908, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-071'), false, null, null, -16.842479, -42.063236, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-071'), false, null, null, -16.855040, -42.061964, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-071'), false, null, null, -16.859667, -42.071196, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-071'), false, null, null, -16.855848, -42.078498, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-071'), false, null, null, -16.847788, -42.080942, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-072');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-072'), false, null, null, -11.607745, -46.815995, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-072'), false, null, null, -11.615396, -46.810898, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-072'), false, null, null, -11.626136, -46.810471, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-072'), false, null, null, -11.626464, -46.829066, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-072'), false, null, null, -11.615842, -46.832234, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-073');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-073'), false, null, null, -9.096774, -45.926132, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-073'), false, null, null, -9.104236, -45.918599, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-073'), false, null, null, -9.117740, -45.920867, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-073'), false, null, null, -9.123929, -45.931503, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-073'), false, null, null, -9.117036, -45.940089, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-073'), false, null, null, -9.105153, -45.940152, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-074');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-074'), false, null, null, -21.706093, -43.879732, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-074'), false, null, null, -21.716459, -43.865157, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-074'), false, null, null, -21.732015, -43.869445, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-074'), false, null, null, -21.731659, -43.888740, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-074'), false, null, null, -21.713654, -43.892314, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-075');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-075'), false, null, null, -19.169130, -43.692682, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-075'), false, null, null, -19.182299, -43.705182, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-075'), false, null, null, -19.176695, -43.721016, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-075'), false, null, null, -19.166924, -43.722935, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-075'), false, null, null, -19.158464, -43.713552, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

delete from project_tags where project_id = (select id from projects where friendly_id = 'PRC-2026-076');
insert into project_tags (project_id, has_qtag, tag_uid, cmac, latitude, longitude, vertex_label, status, first_seen_at, last_seen_at, metadata)
values
  ((select id from projects where friendly_id = 'PRC-2026-076'), false, null, null, -2.901697, -41.755268, 'A', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-076'), false, null, null, -2.920881, -41.757674, 'B', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-076'), false, null, null, -2.923228, -41.768712, 'C', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-076'), false, null, null, -2.919786, -41.779259, 'D', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-076'), false, null, null, -2.905504, -41.785127, 'E', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)')),
  ((select id from projects where friendly_id = 'PRC-2026-076'), false, null, null, -2.896146, -41.771223, 'F', 'ACTIVE', '2026-08-17T00:00:00Z', '2026-08-17T00:00:00Z', jsonb_build_object('source', 'seed synthetic geofence (nearest-neighbor safe radius)'));

-- Phase 04.1 / GEOF-02: `npx supabase db reset` applies every migration in
-- supabase/migrations/ BEFORE running this seed file, so the backfill
-- migration (202608150004_backfill_declared_boundaries.sql) runs against an
-- empty project_tags table on a fresh local reset and backfills 0 rows.
-- Re-running the exact same idempotent (upsert on project_id) backfill body
-- here, after project_tags is seeded, guarantees PRC-2024-002 ends up with a
-- declared_boundary row on every fresh reset, matching the migration's own
-- ordering/coordinate-order/geography-cast logic exactly. Safe to re-run any
-- number of times (on conflict do update), including in non-local environments
-- where the migration already backfilled real project_tags data.
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

delete from certifications
where project_id in (
  select id from projects where friendly_id in ('PRC-2024-002', 'PRC-2026-010', 'PRC-2026-011')
);

insert into certifications (project_id, certifier_organization_id, certifier_profile_id, methodology, credit_potential, decision, notes, signed_document_hash, signed_at)
values
  ((select id from projects where friendly_id = 'PRC-2024-002'), (select id from organizations where external_id = 'std-002'), (select id from profiles where external_id = 'std-001-user'), 'AR-ACM0003', 85000, 'APPROVED', 'Certificação inicial consolidada do Carbono Cerrado.', 'sha256-cert-prc-2024-002', '2024-02-25T10:00:00Z'),
  ((select id from projects where friendly_id = 'PRC-2026-010'), (select id from organizations where external_id = 'std-001'), (select id from profiles where external_id = 'std-001-user'), 'AR-ACM0003', 18000, 'PENDING', 'Fila inicial da certificadora para validação de UI.', null, null),
  ((select id from projects where friendly_id = 'PRC-2026-011'), (select id from organizations where external_id = 'std-001'), (select id from profiles where external_id = 'std-001-user'), 'VM0015 (Verra)', 32000, 'APPROVED', 'Certificação aprovada; aguardando auditoria.', 'sha256-cert-prc-2026-011', '2026-05-22T10:00:00Z');

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
  ((select id from organizations where external_id = 'aud-002'), (select id from projects where friendly_id = 'PRC-2024-002'), 'AUDIT_REPORT', 's3://sinarca-seed/documents/prc-2024-002-audit.pdf', 'sha256-audit-prc-2024-002', 'application/pdf', 307200, jsonb_build_object('source', 'audit seed')),
  ((select id from organizations where external_id = 'prod-001'), (select id from projects where friendly_id = 'PRC-2026-010'), 'LEGAL_OWNERSHIP', 's3://sinarca-seed/documents/prc-2026-010-legal.pdf', 'sha256-legal-prc-2026-010', 'application/pdf', 102400, jsonb_build_object('source', 'dossie minimo seed', 'filename', 'matricula.pdf')),
  ((select id from organizations where external_id = 'prod-001'), (select id from projects where friendly_id = 'PRC-2026-010'), 'FOREST_INVENTORY', 's3://sinarca-seed/documents/prc-2026-010-inventario.pdf', 'sha256-inventario-prc-2026-010', 'application/pdf', 153600, jsonb_build_object('source', 'dossie minimo seed', 'filename', 'inventario.pdf')),
  ((select id from organizations where external_id = 'prod-001'), (select id from projects where friendly_id = 'PRC-2026-011'), 'LEGAL_OWNERSHIP', 's3://sinarca-seed/documents/prc-2026-011-legal.pdf', 'sha256-legal-prc-2026-011', 'application/pdf', 102400, jsonb_build_object('source', 'dossie minimo seed', 'filename', 'matricula.pdf')),
  ((select id from organizations where external_id = 'prod-001'), (select id from projects where friendly_id = 'PRC-2026-011'), 'FOREST_INVENTORY', 's3://sinarca-seed/documents/prc-2026-011-inventario.pdf', 'sha256-inventario-prc-2026-011', 'application/pdf', 153600, jsonb_build_object('source', 'dossie minimo seed', 'filename', 'inventario.pdf')),
  ((select id from organizations where external_id = 'prod-001'), (select id from projects where friendly_id = 'PRC-2026-077'), 'GEOSPATIAL_DIAGNOSTIC_REPORT', 's3://sinarca-seed/documents/prc-2026-077-infoterras-relatorio.pdf', 'sha256-infoterras-prc-2026-077', 'application/pdf', 5242880, jsonb_build_object('source', 'INFOTERRAS - Geoportal Rural MG', 'report_code', 'INF-0DRC7B9-20260810', 'issued_at', '2026-08-10', 'filename', 'relatorio_MG-3126000-4A5F440A95394810A3531AEB447BCBAB_2026-08-10.pdf'))
on conflict (project_id, document_type, sha256_hash) do update set
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
