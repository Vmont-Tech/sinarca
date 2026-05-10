// src/pages/Dashboard/Feed.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map as MapIcon, Search, Filter } from 'lucide-react';
import { ProjectCardMRCA } from '../../components/ProjectCardMRCA';
import { StatsCards } from '../../components/StatsCards';
import { database } from '../../services/database';

export const Feed: React.FC = () => {
    const [mrcas, setMrcas] = useState<any[]>([]);
    const [stats, setStats] = useState({ compensated: 0, active: 0, audited: 0, anomalies: 0 });
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadStats = async () => {
            try {
                const allProjects = await database.getMarketProjects({ limit: 1000, type: 'all' });
                const comp = allProjects.reduce((acc: number, curr: any) =>
                    curr.type === 'compensado' ? acc + (curr.quantity || 0) : acc, 0);
                const active = allProjects.filter((p: any) => p.status.includes('Disponível') || p.status.includes('Ativo')).length;
                const audited = allProjects.filter((p: any) => p.type === 'auditado').length;
                const anomalies = allProjects.filter((p: any) => p.status.includes('Suspenso')).length;

                setStats({ compensated: comp, active: active, audited: audited, anomalies: anomalies });
            } catch (err) {
                console.error("Failed to load global stats", err);
            }
        };
        loadStats();
    }, []);

    useEffect(() => {
        loadMRCAs();
    }, [filter]);

    const loadMRCAs = async () => {
        setLoading(true);
        try {
            const data = await database.getMRCAs({ type: filter });
            setMrcas(data);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight">Marketplace de Ativos</h1>
                    <p className="text-sm text-gray-400">Explore e adquira créditos de carbono verificados via blockchain.</p>
                </div>
                <button
                    onClick={() => navigate('/painel/mapa-projetos')}
                    className="bg-black text-white px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-primary transition-all shadow-lg shadow-black/5"
                >
                    <MapIcon className="w-4 h-4" />
                    Exploração Geográfica
                </button>
            </div>

            {/* Stats */}
            <StatsCards
                totalCompensated={stats.compensated}
                activeProjects={stats.active}
                auditedProjects={stats.audited}
                anomalies={stats.anomalies}
                onCardClick={setFilter}
            />

            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input 
                        type="text" 
                        placeholder="Buscar por bioma, tecnologia ou ID do MRCA..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-primary/30 transition-all text-sm"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 border border-gray-100 rounded-xl text-xs font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-all">
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : mrcas.length > 0 ? (
                    mrcas.map(mrca => (
                        <ProjectCardMRCA key={mrca.id} data={mrca} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Nenhum ativo disponível no momento</p>
                    </div>
                )}
            </div>
        </div>
    );
};
