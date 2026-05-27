import { type ProjectMRCA, type InventoryItem } from '../data/mrca_db';
import { apiGet, apiPatch } from './api';

export type ProjectsResponse = {
    success: boolean;
    total: number;
    projects: ProjectMRCA[];
};

export type ProjectResponse = {
    success: boolean;
    project: ProjectMRCA;
};

type ProjectApiOptions = {
    publicMarketplaceOnly?: boolean;
    ownedOnly?: boolean;
    portfolioOnly?: boolean;
};

const PROJECT_STATUS_PRESENTATION: Record<string, { label: string; type: string }> = {
    ACTIVE: { label: 'Ativo', type: 'novo' },
    AVAILABLE: { label: 'Disponível', type: 'novo' },
    AWAITING_AUDIT: { label: 'Em auditoria', type: 'auditado' },
    AUDITED: { label: 'Auditado', type: 'auditado' },
    BLOCKED_AUDIT_REQUIRED: { label: 'Auditoria pendente', type: 'auditado' },
    RETIRED: { label: 'Aposentado', type: 'compensado' },
    SUSPENDED: { label: 'Suspenso', type: 'bloqueado' },
    CREATED: { label: 'Em cadastro', type: 'cadastro' },
    REGISTERED: { label: 'Registrado', type: 'cadastro' },
    BASELINE_PENDING: { label: 'Baseline pendente', type: 'cadastro' },
    AWAITING_CERTIFICATION: { label: 'Em certificação', type: 'certificacao' },
    CERTIFIED_AWAITING_TREASURY: { label: 'Tesouraria pendente', type: 'certificacao' },
    TOKENIZED_LOCKED: { label: 'Tokenizado bloqueado', type: 'bloqueado' },
    RECALCULATION_REQUIRED: { label: 'Recálculo pendente', type: 'bloqueado' },
};

export type MarketplaceResponse = {
    success: boolean;
    total: number;
    credits: ProjectMRCA[];
};

export type QueueResponse<T = ProjectMRCA> = {
    success: boolean;
    total: number;
    projects: T[];
};

export type CatalogEntity = {
    id: string;
    name: string;
    role?: string;
    verified?: boolean;
    authorized?: boolean;
    [key: string]: any;
};

export type CatalogResponse<T = CatalogEntity> = {
    success: boolean;
    certifiers?: T[];
    auditors?: T[];
    companies?: T[];
    producers?: T[];
};

export type TransactionRecord = {
    id: string;
    type: string;
    asset: string;
    amount: string;
    unit: string;
    date: string;
    createdAt?: string;
    status: string;
    hash: string;
    projectId?: string | null;
    buyer?: string | null;
    entities: {
        from: string;
        to: string;
    };
};

export type TransactionsResponse = {
    success: boolean;
    transactions: TransactionRecord[];
};

export type TransactionResponse = {
    success: boolean;
    transaction: TransactionRecord;
};

export type TransactionFilters = {
    projectId?: string;
    hash?: string;
    type?: string;
    buyer?: string;
    status?: string;
    limit?: number;
};

export type ProjectPublicDossier = {
    success: boolean;
    project: ProjectMRCA;
    tags: Array<Record<string, any>>;
    baseline: Record<string, any> | null;
    certifications: Array<Record<string, any>>;
    audits: Array<Record<string, any>>;
    documents: ProjectDossierDocument[];
    credits: Array<Record<string, any>>;
    transactions: TransactionRecord[];
    chainEvents: Array<Record<string, any>>;
};

export type ProjectDossierDocument = {
    id: string;
    type: string;
    storageBucket: string;
    storageObjectPath?: string | null;
    storagePath: string;
    sha256Hash: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
    metadata?: Record<string, any>;
};

export type PublicProfileResponse = {
    success: boolean;
    profile: Record<string, any>;
};

export type MonitoringProjectResponse = {
    success: boolean;
    project: ProjectMRCA;
    baseline: {
        sentinelSceneId: string;
        baselineHash: string;
        pointsAnalyzed: number;
        vegetationCoverPct: number;
        ndviMean: number;
        capturedAt: string;
        evidenceUri?: string;
    };
    tags: Array<{
        id: string;
        position: string;
        status: string;
        lastSeenAt?: string;
        latitude: number;
        longitude: number;
    }>;
    events: Array<{
        id: string;
        type: string;
        chain: string;
        hash?: string;
        status: string;
        amount?: number;
        createdAt: string;
    }>;
};

export type InventoryResponse = {
    success: boolean;
    inventory: InventoryItem[];
};

const asArray = <T,>(value: any, key: string, defaultValue: T[]): T[] => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.[key])) return value[key];
    if (Array.isArray(value?.data)) return value.data;
    return defaultValue;
};

const getProjectsFromApi = async (options: ProjectApiOptions = {}): Promise<ProjectMRCA[]> => {
    const params = new URLSearchParams();
    params.set('limit', '1000');
    if (options.publicMarketplaceOnly) params.set('public_marketplace', 'true');
    if (options.ownedOnly) params.set('scope', 'mine');
    if (options.portfolioOnly) params.set('portfolio_only', 'true');
    const response = await apiGet<ProjectsResponse>(`/projects?${params.toString()}`);
    // Se a API retornar no shape esperado, usamos; se não, a UI precisa tratar.
    if (!response) return [];
    const projects = response?.projects;
    if (!Array.isArray(projects)) {
        throw new Error('Resposta inválida da API: esperado campo "projects" como array');
    }
    return projects as ProjectMRCA[];
};

const mapProjectToFeedItem = (proj: ProjectMRCA) => {
    const presentation = PROJECT_STATUS_PRESENTATION[proj.status] || { label: 'Em análise', type: 'analise' };

    return {
        id: proj.id,
        projectId: proj.friendlyId,
        friendlyId: proj.friendlyId,
        type: presentation.type,
        status: presentation.label,
        institution: proj.entities.developer,
        quantity: proj.metrics.carbonStock,
        unit: 'tCO₂e',
        period: proj.metrics.vintage,
        project: {
            name: proj.name,
            location: `${proj.location.city}, ${proj.location.state}`,
            stateId: proj.location.stateId,
            methodology: proj.methodology,
            image: proj.image,
            description: proj.description,
            lifecycleStatus: proj.status,
        },
        chain: {
            emitter: { name: proj.entities.certifier.name },
            auditor: { name: proj.entities.auditor.name },
        },
        timestamp: proj.blockchain.timestamp,
        raw: proj,
    };
};

export const database = {
    // === CERTIFICADORAS ===
    getCertifiers: async () => {
        const response = await apiGet<CatalogResponse>('/certifiers');
        return asArray(response, 'certifiers', []);
    },

    // === AUDITORES ===
    getAuditors: async () => {
        const response = await apiGet<CatalogResponse>('/auditors');
        return asArray(response, 'auditors', []);
    },

    // === EMPRESAS ===
    getCompanies: async () => {
        const response = await apiGet<CatalogResponse>('/companies');
        return asArray(response, 'companies', []);
    },

    getProducers: async () => {
        const response = await apiGet<CatalogResponse>('/producers');
        return asArray(response, 'producers', []);
    },

    // === CONTA DE MERCADO VOLUNTÁRIO ===
    getMarketProjects: async ({ type = 'all', state = 'all', limit = 20, publicMarketplaceOnly = false, ownedOnly = false, portfolioOnly = false }: any) => {
        const projects = await getProjectsFromApi({ publicMarketplaceOnly, ownedOnly, portfolioOnly });
        let data = projects.map(mapProjectToFeedItem);

        if (state !== 'all') {
            const normalized = String(state).toLowerCase();
            data = data.filter((m: any) =>
                m.project.location.toLowerCase().includes(normalized) ||
                m.project.stateId?.toLowerCase() === normalized
            );
        }

        if (type !== 'all') {
            data = data.filter((m: any) => m.type === type);
        }

        data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return data.slice(0, limit);
    },

    // Retorna dados brutos para mapas e detalhes.
    getRawMarketProjects: async (options: ProjectApiOptions = {}) => {
        return getProjectsFromApi(options);
    },

    getRawProjectById: async (id: string): Promise<ProjectMRCA | undefined> => {
        const response = await apiGet<ProjectResponse>(`/projects/${encodeURIComponent(id)}`);
        return response?.project;
    },

    updateProject: async (projectId: string, payload: Record<string, any>): Promise<ProjectMRCA> => {
        const response = await apiPatch<ProjectResponse>(`/projects/${encodeURIComponent(projectId)}`, payload);
        if (!response?.project) {
            throw new Error('Projeto não atualizado pela API');
        }
        return response.project;
    },

    getProjectPublicDossier: async (id: string): Promise<ProjectPublicDossier> => {
        const response = await apiGet<ProjectPublicDossier>(`/projects/${encodeURIComponent(id)}/public-dossier`);
        if (!response?.project) {
            throw new Error('Dossiê público não encontrado na API');
        }
        return response;
    },

    // === BUSCA UNIFICADA ===
    search: async (query: string) => {
        const q = query.toLowerCase();
        const allProjects = await database.getMarketProjects({ limit: 1000 });
        return allProjects.filter((m: any) =>
            m.projectId.toLowerCase().includes(q) ||
            m.friendlyId?.toLowerCase().includes(q) ||
            m.institution.name.toLowerCase().includes(q) ||
            m.project.name.toLowerCase().includes(q)
        );
    },

    getProjectById: async (id: string) => {
        const all = await database.getMarketProjects({ limit: 1000 });
        return all.find((m: any) => m.id === id || m.friendlyId === id);
    },

    getInstitution: async (cnpj: string) => {
        const companies = await database.getCompanies();
        return companies.find((company: any) => company.document === cnpj || company.id === cnpj || company.name === cnpj);
    },

    // === INVENTÁRIO GOVERNAMENTAL ===
    getInventoryData: async (): Promise<InventoryItem[]> => {
        const response = await apiGet<InventoryResponse>('/inventory');
        return asArray<InventoryItem>(response, 'inventory', []);
    },

    getTransactions: async (filters: TransactionFilters = {}): Promise<TransactionRecord[]> => {
        const params = new URLSearchParams();
        if (filters.projectId) params.set('project_id', filters.projectId);
        if (filters.hash) params.set('hash', filters.hash);
        if (filters.type && filters.type !== 'all') params.set('type', filters.type);
        if (filters.buyer) params.set('buyer', filters.buyer);
        if (filters.status && filters.status !== 'all') params.set('status', filters.status);
        if (filters.limit) params.set('limit', String(filters.limit));
        const response = await apiGet<TransactionsResponse>(`/transactions${params.toString() ? `?${params}` : ''}`);
        return asArray<TransactionRecord>(response, 'transactions', []);
    },

    getTransactionByHash: async (hash: string): Promise<TransactionRecord | null> => {
        const response = await apiGet<TransactionResponse>(`/transactions/${encodeURIComponent(hash)}`);
        return response?.transaction || null;
    },

    getPublicProfile: async (id: string): Promise<Record<string, any> | null> => {
        const response = await apiGet<PublicProfileResponse>(`/profiles/${encodeURIComponent(id)}`);
        return response?.profile || null;
    },

    getMonitoringProject: async (id: string): Promise<MonitoringProjectResponse> => {
        const response = await apiGet<MonitoringProjectResponse>(`/monitoring/projects/${encodeURIComponent(id)}`);
        if (!response?.project || !response?.baseline) {
            throw new Error('Resposta inválida da API de monitoramento');
        }
        return response;
    },

    // LEGACY REDIRECT: getMRCAs aponta para MarketProjects para compatibilidade.
    getMRCAs: async (params: any) => {
        return database.getMarketProjects(params);
    },
};
