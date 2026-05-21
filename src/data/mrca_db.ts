
// DOMAIN TYPES - CANONICAL

// 1. PROJECT (Mercado Voluntário)
// Entidade privada, auditada, gera CRÉDITOS.
export type ProjectStatus = 'CREATED' | 'AUDITED' | 'AVAILABLE' | 'RESERVED' | 'TRANSFERRED' | 'RETIRED' | 'SUSPENDED';

export interface ParticipatingEntity {
    id: string;
    name: string;
    role: 'Certifier' | 'Auditor' | 'Compensator' | 'Developer' | 'Registry';
    verified: boolean;
}

export interface Coordinates {
    lat: number;
    lng: number;
    svgX: number;
    svgY: number;
}

export interface BlockchainData {
    initialHash: string;
    contractAddress: string;
    merkleRoot: string;
    blockHeight: number;
    timestamp: string;
    serialRange: {
        start: string;
        end: string;
    }
}

export interface ProjectMRCA {
    type: 'PROJECT'; // CANONICAL DISCRIMINATOR
    id: string;
    friendlyId: string;
    version: string;
    name: string;
    location: {
        city: string;
        state: string;
        stateId: string;
        bioma: string;
        coordinates: Coordinates;
    };
    status: ProjectStatus;
    metrics: {
        totalAreaHa: number;
        carbonStock: number; // Volume de Créditos Potenciais/Gerados
        investmentValue: number; // Valor investido no projeto (BRL)
        vintage: string;
    };
    description: string;
    baseline: string;
    methodology: string; // Ex: Verra VM0015, Gold Standard
    methodology_link?: string;
    image: string;
    entities: {
        developer: ParticipatingEntity;
        auditor: ParticipatingEntity;
        certifier: ParticipatingEntity;
        registry: ParticipatingEntity;
    };
    blockchain: BlockchainData;
    timeline: Array<{
        title: string;
        date: string;
        status: 'completed' | 'active' | 'pending';
        desc: string;
    }>;
}

// ... INVENTORY DEFINITIONS KEEP AS IS ...

export const PROJECTS_DB: ProjectMRCA[] = [
    {
        type: 'PROJECT',
        id: '0x7f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
        friendlyId: 'PRC-2024-882',
        version: 'v1.0',
        name: 'Reserva Juma',
        location: {
            city: 'Novo Aripuanã',
            state: 'Amazonas',
            stateId: 'am',
            bioma: 'Amazônia',
            coordinates: { lat: -7.21, lng: -60.36, svgX: 180, svgY: 160 }
        },
        status: 'RETIRED',
        metrics: { totalAreaHa: 12450, carbonStock: 145200, investmentValue: 6534000, vintage: '2023' }, // ~45 BRL/ton
        description: 'Projeto de conservação florestal e redução de emissões em área de alta biodiversidade.',
        baseline: 'Desmatamento projetado de 2.5% ao ano sem intervenção.',
        methodology: 'VM0015 (Verra)',
        methodology_link: 'https://verra.org/methodology/vm0015',
        image: 'https://images.unsplash.com/photo-1572276596237-5db2c3e16c5d?auto=format&fit=crop&w=800&q=80',
        entities: {
            developer: { id: 'dev-001', name: 'Carbon Green', role: 'Developer', verified: true },
            auditor: { id: 'aud-001', name: 'GreenCheck Auditores', role: 'Auditor', verified: true },
            certifier: { id: 'std-001', name: 'Verra', role: 'Certifier', verified: true },
            registry: { id: 'reg-001', name: 'SINARCA', role: 'Registry', verified: true }
        },
        blockchain: {
            initialHash: '0x7f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
            contractAddress: '0x123...abc',
            merkleRoot: '0x999...111',
            blockHeight: 1829240,
            timestamp: '2023-01-10T14:00:00Z',
            serialRange: { start: 'BR-2024-882-0000001', end: 'BR-2024-882-1200000' }
        },
        timeline: [
            { title: 'Registro do Projeto', date: '10 Jan 2023', status: 'completed', desc: 'Submissão inicial realizada.' },
            { title: 'Aposentadoria Total', date: '15 Fev 2025', status: 'completed', desc: 'Compensação realizada por Banco Futuro.' }
        ]
    },
    {
        type: 'PROJECT',
        id: '0x8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
        friendlyId: 'PRC-2024-002',
        version: 'v1.0',
        name: 'Projeto Carbono Cerrado',
        location: {
            city: 'Palmas',
            state: 'Tocantins',
            stateId: 'to',
            bioma: 'Cerrado',
            coordinates: { lat: -10.18, lng: -48.33, svgX: 375, svgY: 280 }
        },
        status: 'AVAILABLE',
        metrics: { totalAreaHa: 5800, carbonStock: 85000, investmentValue: 4250000, vintage: '2024' }, // ~50 BRL/ton
        description: 'Recuperação de áreas degradadas no bioma Cerrado com foco em agricultura regenerativa.',
        baseline: 'Área degradada por pastagem intensiva por >10 anos.',
        methodology: 'AR-ACM0003',
        image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
        entities: {
            developer: { id: 'dev-002', name: 'AgroSustentável', role: 'Developer', verified: true },
            auditor: { id: 'aud-002', name: 'EcoVerify Global', role: 'Auditor', verified: true },
            certifier: { id: 'std-002', name: 'Gold Standard', role: 'Certifier', verified: true },
            registry: { id: 'reg-001', name: 'SINARCA', role: 'Registry', verified: true }
        },
        blockchain: {
            initialHash: '0x8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
            contractAddress: '0x456...def',
            merkleRoot: '0x888...222',
            blockHeight: 1830000,
            timestamp: '2024-02-15T09:30:00Z',
            serialRange: { start: 'BR-2024-002-000001', end: 'BR-2024-002-085000' }
        },
        timeline: [
            { title: 'Aprovação Final', date: '25 Fev 2024', status: 'completed', desc: 'Projeto migrado para status AVAILABLE.' }
        ]
    },
    {
        type: 'PROJECT',
        id: '0x1234567890abcdef1234567890abcdef12345678',
        friendlyId: 'PRC-2025-001',
        version: 'v3.0',
        name: 'Recuperação Florestal Amazônia - Fase 3',
        location: {
            city: 'Altamira',
            state: 'Pará',
            stateId: 'pa',
            bioma: 'Amazônia',
            coordinates: { lat: -3.20, lng: -52.20, svgX: 325, svgY: 125 }
        },
        status: 'AVAILABLE',
        metrics: { totalAreaHa: 15000, carbonStock: 500000, investmentValue: 27500000, vintage: '2024' }, // ~55 BRL/ton
        description: 'Fase 3 do projeto de recuperação florestal focada em corredores ecológicos.',
        baseline: 'Expansão da fronteira agrícola na região do Xingu.',
        methodology: 'REDD+',
        image: 'https://images.unsplash.com/photo-1596395817818-b271d44093df?auto=format&fit=crop&w=800&q=80',
        entities: {
            developer: { id: 'dev-005', name: 'BioGreen', role: 'Developer', verified: true },
            auditor: { id: 'aud-005', name: 'Vinícius Monteiro', role: 'Auditor', verified: true },
            certifier: { id: 'std-001', name: 'Verra', role: 'Certifier', verified: true },
            registry: { id: 'reg-001', name: 'SINARCA', role: 'Registry', verified: true }
        },
        blockchain: {
            initialHash: '0x1234567890abcdef1234567890abcdef12345678',
            contractAddress: '0xAAA...BBB',
            merkleRoot: '0xCCC...DDD',
            blockHeight: 2000000,
            timestamp: '2025-01-01T10:00:00Z',
            serialRange: { start: 'BR-2025-001-000001', end: 'BR-2025-001-500000' }
        },
        timeline: [{ title: 'Registro', date: '2025-01-01', status: 'completed', desc: 'Projeto Ativo' }]
    },
    {
        type: 'PROJECT',
        id: '0x999888777666555444333222111000aaabbbcccdddeeefff',
        friendlyId: 'PRC-2025-002',
        version: 'v1.0',
        name: 'Energia Solar do Agreste',
        location: {
            city: 'Caruaru',
            state: 'Pernambuco',
            stateId: 'pe',
            bioma: 'Caatinga',
            coordinates: { lat: -8.28, lng: -35.97, svgX: 520, svgY: 180 }
        },
        status: 'AVAILABLE',
        metrics: { totalAreaHa: 200, carbonStock: 12000, investmentValue: 5000000, vintage: '2025' },
        description: 'Parque solar fotovoltaico substituindo matriz energética fóssil na região.',
        baseline: 'Uso de termelétricas a diesel.',
        methodology: 'ACM0002',
        image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80',
        entities: {
            developer: { id: 'dev-002', name: 'AgroSustentável', role: 'Developer', verified: true },
            auditor: { id: 'aud-002', name: 'EcoVerify Global', role: 'Auditor', verified: true },
            certifier: { id: 'std-002', name: 'Gold Standard', role: 'Certifier', verified: true },
            registry: { id: 'reg-001', name: 'SINARCA', role: 'Registry', verified: true }
        },
        blockchain: {
            initialHash: '0x999888777666555444333222111000aaabbbcccdddeeefff',
            contractAddress: '0xSUN...PWR',
            merkleRoot: '0xEEE...FFF',
            blockHeight: 2100500,
            timestamp: '2025-02-10T08:00:00Z',
            serialRange: { start: 'BR-2025-002-000001', end: 'BR-2025-002-012000' }
        },
        timeline: [{ title: 'Conexão à Rede', date: '2025-02-01', status: 'completed', desc: 'Início da geração.' }]
    },
    {
        type: 'PROJECT',
        id: '0xaaabbbcccdddeeefff111222333444555666777888',
        friendlyId: 'PRC-2023-555',
        name: 'Reflorestamento Mata Atlântica Sul',
        version: 'v2.0',
        location: {
            city: 'Joinville',
            state: 'Santa Catarina',
            stateId: 'sc',
            bioma: 'Mata Atlântica',
            coordinates: { lat: -26.30, lng: -48.84, svgX: 310, svgY: 410 }
        },
        status: 'AUDITED',
        metrics: { totalAreaHa: 500, carbonStock: 45000, investmentValue: 2000000, vintage: '2023' },
        description: 'Restaurando o habitat natural da Mata Atlântica através do plantio de espécies nativas.',
        baseline: 'Área anteriormente utilizada para pastagem degradada.',
        methodology: 'AR-AMS0007',
        image: 'https://images.unsplash.com/photo-1448375240586-dfd8f3793371?auto=format&fit=crop&w=800&q=80',
        entities: {
            developer: { id: 'dev-001', name: 'Carbon Green', role: 'Developer', verified: true },
            auditor: { id: 'aud-001', name: 'GreenCheck Auditores', role: 'Auditor', verified: true },
            certifier: { id: 'std-001', name: 'Verra', role: 'Certifier', verified: true },
            registry: { id: 'reg-001', name: 'SINARCA', role: 'Registry', verified: true }
        },
        blockchain: {
            initialHash: '0xaaabbbcccdddeeefff111222333444555666777888',
            contractAddress: '0xATL...FOR',
            merkleRoot: '0xGGG...HHH',
            blockHeight: 1950000,
            timestamp: '2023-06-15T11:20:00Z',
            serialRange: { start: 'BR-2023-555-000001', end: 'BR-2023-555-045000' }
        },
        timeline: [{ title: 'Auditoria Anual', date: '2024-06-15', status: 'completed', desc: 'Verificação de crescimento.' }]
    }
];

export const CERTIFIERS_DB = [
    { id: 'std-001', name: 'Verra', role: 'Certifier', website: 'https://verra.org', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Verra_logo.png/640px-Verra_logo.png', authorized: true },
    { id: 'std-002', name: 'Gold Standard', role: 'Certifier', website: 'https://www.goldstandard.org', logo: 'https://www.goldstandard.org/sites/default/files/gold-standard-logo.png', authorized: true },
    { id: 'std-003', name: 'Cercarbono', role: 'Certifier', website: 'https://cercarbono.com', logo: '', authorized: true }
];

export const AUDITORS_DB = [
    { id: 'aud-001', name: 'GreenCheck Auditores', role: 'Auditor', verified: true, projects_audited: 12, rating: 4.9 },
    { id: 'aud-002', name: 'EcoVerify Global', role: 'Auditor', verified: true, projects_audited: 8, rating: 4.7 },
    { id: 'aud-005', name: 'GlobalTrust Auditors', role: 'Auditor', verified: true, projects_audited: 15, rating: 5.0 }
];

export const COMPANIES_DB = [
    { id: 'dev-001', name: 'Carbon Green', role: 'Developer', projects: 5, total_impact: 145200 },
    { id: 'dev-002', name: 'AgroSustentável', role: 'Developer', projects: 2, total_impact: 85000 },
    { id: 'dev-005', name: 'BioGreen', role: 'Developer', projects: 1, total_impact: 500000 },
    { id: 'comp-001', name: 'Banco Futuro', role: 'Compensator', projects: 0, total_impact: 0 }
];

export const getProjectById = (id: string) => {
    const project = PROJECTS_DB.find(p => p.id === id);
    if (project) return project;
    return PROJECTS_DB.find(p => p.friendlyId === id);
};

// --- INVENTORY DATA (GOVERNMENT SECTOR) ---

export interface InventoryItem {
    id: string;
    uf: string;
    name: string;
    description: string;
    status: 'SURPLUS' | 'BALANCED' | 'DEFICIT';
    emissions: {
        total: number;
        industrial: number;
        agri: number;
        waste: number;
    };
    localContributions: {
        estimatedRemovals: number;
        registeredProjectsCount: number;
    };
    source: string;
}

export const INVENTORY_DB: InventoryItem[] = [
    {
        id: 'am',
        uf: 'AM',
        name: 'Amazonas',
        description: 'Maior reserva de biomas tropicais.',
        status: 'SURPLUS',
        emissions: { total: 4500000, industrial: 800000, agri: 1200000, waste: 500000 },
        localContributions: { estimatedRemovals: 12000000, registeredProjectsCount: 154 },
        source: 'MCTI / SEEG 2024'
    },
    {
        id: 'pa',
        uf: 'PA',
        name: 'Pará',
        description: 'Fronteira ativa de preservação.',
        status: 'DEFICIT',
        emissions: { total: 12000000, industrial: 2000000, agri: 8500000, waste: 1500000 },
        localContributions: { estimatedRemovals: 9500000, registeredProjectsCount: 88 },
        source: 'MCTI / SEEG 2024'
    },
    {
        id: 'mt',
        uf: 'MT',
        name: 'Mato Grosso',
        description: 'Potência agro-ambiental.',
        status: 'BALANCED',
        emissions: { total: 18000000, industrial: 1500000, agri: 14000000, waste: 2500000 },
        localContributions: { estimatedRemovals: 18200000, registeredProjectsCount: 112 },
        source: 'MCTI / SEEG 2024'
    },
    {
        id: 'sp',
        uf: 'SP',
        name: 'São Paulo',
        description: 'Centro industrial e tecnológico.',
        status: 'DEFICIT',
        emissions: { total: 25000000, industrial: 12000000, agri: 8000000, waste: 5000000 },
        localContributions: { estimatedRemovals: 5000000, registeredProjectsCount: 45 },
        source: 'MCTI / SEEG 2024'
    },
    {
        id: 'pr',
        uf: 'PR',
        name: 'Paraná',
        description: 'Excelência em conservação de bacias.',
        status: 'SURPLUS',
        emissions: { total: 7500000, industrial: 2000000, agri: 4500000, waste: 1000000 },
        localContributions: { estimatedRemovals: 9800000, registeredProjectsCount: 67 },
        source: 'MCTI / SEEG 2024'
    },
    {
        id: 'to',
        uf: 'TO',
        name: 'Tocantins',
        description: 'Coração do Matopiba.',
        status: 'BALANCED',
        emissions: { total: 3500000, industrial: 500000, agri: 2500000, waste: 500000 },
        localContributions: { estimatedRemovals: 3600000, registeredProjectsCount: 12 },
        source: 'MCTI / SEEG 2024'
    }
];
