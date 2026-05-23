
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

// Dados de domínio devem vir do backend_app/Postgres. Este módulo só mantém tipos.

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
