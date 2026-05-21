import {
    PROJECTS_DB,
    CERTIFIERS_DB,
    AUDITORS_DB,
    COMPANIES_DB,
    INVENTORY_DB,
    type ProjectMRCA,
    type InventoryItem,
} from '../data/mrca_db';
import { apiGet } from './api';

const delay = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms));

const asArray = <T,>(value: any, key: string, fallback: T[]): T[] => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.[key])) return value[key];
    if (Array.isArray(value?.data)) return value.data;
    return fallback;
};

const getProjectsFromApi = async (): Promise<ProjectMRCA[]> => {
    try {
        const response = await apiGet<any>('/projects?limit=1000');
        return asArray<ProjectMRCA>(response, 'projects', PROJECTS_DB);
    } catch (error) {
        console.warn('[SINARCA] API indisponível; usando PROJECTS_DB mockado.', error);
        await delay(150);
        return PROJECTS_DB;
    }
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
        try {
            const response = await apiGet<any>('/certifiers');
            return asArray(response, 'certifiers', CERTIFIERS_DB);
        } catch (error) {
            console.warn('[SINARCA] API indisponível; usando CERTIFIERS_DB.', error);
            await delay();
            return CERTIFIERS_DB;
        }
    },

    // === AUDITORES ===
    getAuditors: async () => {
        try {
            const response = await apiGet<any>('/auditors');
            return asArray(response, 'auditors', AUDITORS_DB);
        } catch (error) {
            console.warn('[SINARCA] API indisponível; usando AUDITORS_DB.', error);
            await delay();
            return AUDITORS_DB;
        }
    },

    // === EMPRESAS ===
    getCompanies: async () => {
        try {
            const response = await apiGet<any>('/companies');
            return asArray(response, 'companies', COMPANIES_DB);
        } catch (error) {
            console.warn('[SINARCA] API indisponível; usando COMPANIES_DB.', error);
            await delay();
            return COMPANIES_DB;
        }
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
        try {
            const response = await apiGet<any>(`/projects/${encodeURIComponent(id)}`);
            if (response?.project) return response.project;
        } catch (error) {
            console.warn('[SINARCA] Falha ao buscar projeto na API; usando mock local.', error);
        }

        return PROJECTS_DB.find(p => p.id === id || p.friendlyId === id);
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
        return {
            name: 'Banco Futuro',
            cnpj,
            type: 'empresa',
            emissions: { 2024: { scope1: 5000, scope2: 15000, scope3: 25000, compensated: 12450 } },
            contact: 'esg@bancofuturo.com',
        };
    },

    // === INVENTÁRIO GOVERNAMENTAL ===
    getInventoryData: async (): Promise<InventoryItem[]> => {
        try {
            const response = await apiGet<any>('/inventory');
            return asArray<InventoryItem>(response, 'inventory', INVENTORY_DB);
        } catch (error) {
            console.warn('[SINARCA] API indisponível; usando INVENTORY_DB.', error);
            await delay();
            return INVENTORY_DB;
        }
    },

    // LEGACY REDIRECT: getMRCAs aponta para MarketProjects para compatibilidade.
    getMRCAs: async (params: any) => {
        return database.getMarketProjects(params);
    },
};
