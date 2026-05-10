import { PROJECTS_DB, CERTIFIERS_DB, AUDITORS_DB, COMPANIES_DB, INVENTORY_DB } from '../data/mrca_db';

export const database = {
    // === CERTIFICADORAS ===
    getCertifiers: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return CERTIFIERS_DB;
    },

    // === AUDITORES ===
    getAuditors: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return AUDITORS_DB;
    },

    // === EMPRESAS ===
    getCompanies: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return COMPANIES_DB;
    },

    // === CONTA DE MERCADO (VOLUNTÁRIO) ===
    // Retorna apenas PROJETOS (PROJECT). Nunca Inventário.
    getMarketProjects: async ({ type = 'all', state = 'all', limit = 20 }: any) => {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simula network delay

        // 1. Base Source: PROJECTS_DB only
        let data = PROJECTS_DB.map(proj => {
            // Mapping to Feed Item format
            let statusIcon = "Ativo";
            let typeKey = "novo"; // default

            if (proj.status === 'AVAILABLE') { statusIcon = "Disponível"; typeKey = "novo"; }
            if (proj.status === 'AUDITED') { statusIcon = "Auditado"; typeKey = "auditado"; }
            if (proj.status === 'RETIRED') { statusIcon = "Aposentado"; typeKey = "compensado"; }

            return {
                id: proj.id,
                projectId: proj.id,
                friendlyId: proj.friendlyId,
                type: typeKey, // For filter compatibility
                status: statusIcon,
                institution: proj.entities.developer,
                quantity: proj.metrics.carbonStock,
                unit: "tCO₂e",
                period: proj.metrics.vintage,
                project: {
                    name: proj.name,
                    location: `${proj.location.city}, ${proj.location.state}`,
                    methodology: proj.methodology,
                    image: proj.image,
                    description: proj.description,
                    lifecycleStatus: proj.status
                },
                chain: {
                    emitter: { name: proj.entities.certifier.name },
                    auditor: { name: proj.entities.auditor.name },
                },
                timestamp: proj.blockchain.timestamp
            };
        });

        // 2. Mock Market Events (Only for Private Projects)
        // Ignoring the old "Governo do Paraná" mock since it's now forbidden in this layer.

        // 3. Filters
        if (state !== 'all') {
            data = data.filter(m => m.project.location.includes(state));
        }

        if (type !== 'all') {
            data = data.filter(m => m.type === type);
        }

        // 4. Sort
        data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return data.slice(0, limit);
    },

    // Retorna dados BRUTOS para o Mapa (precisa de coords, metrics detalhadas)
    getRawMarketProjects: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return PROJECTS_DB;
    },

    // === BUSCA UNIFICADA (COM CONTEXTO) ===
    search: async (query: string) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        const q = query.toLowerCase();

        // Só busca em PROJETOS para o Feed.
        const allProjects = await database.getMarketProjects({});
        return allProjects.filter((m: any) =>
            m.projectId.toLowerCase().includes(q) ||
            m.institution.name.toLowerCase().includes(q) ||
            m.project.name.toLowerCase().includes(q)
        );
    },

    // Get Project by ID (Market Only)
    getProjectById: async (id: string) => {
        const all = await database.getMarketProjects({ limit: 100 });
        return all.find((m: any) => m.id === id || m.friendlyId === id);
    },

    getInstitution: async (cnpj: string) => {
        // Mock Institution
        return {
            name: "Banco Futuro",
            cnpj: cnpj,
            type: "empresa",
            emissions: { 2024: { scope1: 5000, scope2: 15000, scope3: 25000, compensated: 12450 } },
            contact: "esg@bancofuturo.com"
        };
    },

    // === INVENTÁRIO GOVERNAMENTAL ===
    getInventoryData: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return INVENTORY_DB;
    },


    // LEGACY REDIRECT: getMRCAs agora aponta para MarketProjects para compatibilidade
    getMRCAs: async (params: any) => {
        return database.getMarketProjects(params);
    }
};
