import { type ProjectMRCA, type InventoryItem } from '../data/mrca_db';
import { apiGet } from './api';

export type ProjectsResponse = {
    success: boolean;
    total: number;
    projects: ProjectMRCA[];
};

export type ProjectResponse = {
    success: boolean;
    project: ProjectMRCA;
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

export type CatalogResponse<T = any> = {
    success: boolean;
    certifiers?: T[];
    auditors?: T[];
    companies?: T[];
};

export type TransactionRecord = {
    id: string;
    type: string;
    asset: string;
    amount: string;
    unit: string;
    date: string;
    status: string;
    hash: string;
    entities: {
        from: string;
        to: string;
    };
};

export type TransactionsResponse = {
    success: boolean;
    transactions: TransactionRecord[];
};

const asArray = <T,>(value: any, key: string, fallback: T[]): T[] => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.[key])) return value[key];
    if (Array.isArray(value?.data)) return value.data;
    return fallback;
};

const getProjectsFromApi = async (): Promise<ProjectMRCA[]> => {
    const response = await apiGet<ProjectsResponse>('/projects?limit=1000');
    // Se a API retornar no shape esperado, usamos; se não, a UI precisa tratar.
    if (!response) return [];
    const projects = response?.projects;
    if (!Array.isArray(projects)) {
        throw new Error('Resposta inválida da API: esperado campo "projects" como array');
    }
    return projects as ProjectMRCA[];
};

const mapProjectToFeedItem = (proj: ProjectMRCA) => {
    let statusIcon = 'Ativo';
    let typeKey = 'novo';

    if (proj.status === 'AVAILABLE') { statusIcon = 'Disponível'; typeKey = 'novo'; }
    if (proj.status === 'AUDITED') { statusIcon = 'Auditado'; typeKey = 'auditado'; }
    if (proj.status === 'RETIRED') { statusIcon = 'Aposentado'; typeKey = 'compensado'; }
    if (proj.status === 'SUSPENDED') { statusIcon = 'Suspenso'; typeKey = 'bloqueado'; }

    return {
        id: proj.id,
        projectId: proj.id,
        friendlyId: proj.friendlyId,
        type: typeKey,
        status: statusIcon,
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

    // === CONTA DE MERCADO VOLUNTÁRIO ===
    getMarketProjects: async ({ type = 'all', state = 'all', limit = 20 }: any) => {
        const projects = await getProjectsFromApi();
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
    getRawMarketProjects: async () => {
        return getProjectsFromApi();
    },

    getRawProjectById: async (id: string): Promise<ProjectMRCA | undefined> => {
        const response = await apiGet<ProjectResponse>(`/projects/${encodeURIComponent(id)}`);
        return response?.project;
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
        const response = await apiGet<any>('/inventory');
        return asArray<InventoryItem>(response, 'inventory', []);
    },

    // LEGACY REDIRECT: getMRCAs aponta para MarketProjects para compatibilidade.
    getMRCAs: async (params: any) => {
        return database.getMarketProjects(params);
    },
};
