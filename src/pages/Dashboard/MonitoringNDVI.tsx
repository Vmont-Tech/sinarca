import React, { useState, useEffect } from 'react';
import { 
  Leaf, 
  Satellite, 
  ShieldCheck, 
  AlertCircle, 
  Calendar, 
  ArrowUpRight, 
  History,
  Info,
  Maximize2,
  RefreshCw,
  Fingerprint,
  Navigation
} from 'lucide-react';
import { database, type MonitoringProjectResponse } from '../../services/database';

const MONITORED_PROJECT_ID = 'PRC-2024-002';

const formatDateTime = (value?: string) => {
    if (!value) return 'Sem registro';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

export default function MonitoringNDVI() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<'ndvi' | 'natural' | 'thermal'>('ndvi');
    const [monitoring, setMonitoring] = useState<MonitoringProjectResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const loadMonitoring = async () => {
        const response = await database.getMonitoringProject(MONITORED_PROJECT_ID);
        setMonitoring(response);
    };

    useEffect(() => {
        let mounted = true;
        database.getMonitoringProject(MONITORED_PROJECT_ID)
            .then((response) => {
                if (mounted) setMonitoring(response);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await loadMonitoring();
        } finally {
            setIsRefreshing(false);
        }
    };

    if (loading) return <div className="p-20 text-center text-primary">Carregando monitoramento...</div>;
    if (!monitoring) return <div className="p-20 text-center text-primary">Monitoramento não encontrado no banco.</div>;

    const project = monitoring.project;
    const baseline = monitoring.baseline;
    const protectedProject = !['BLOCKED_AUDIT_REQUIRED', 'SUSPENDED'].includes(project.status);
    const activityItems = monitoring.events.length > 0
        ? monitoring.events.map(event => ({
            id: event.id,
            icon: event.type === 'TRANSFER' ? ArrowUpRight : Satellite,
            title: `${event.type} ${event.chain}`.trim(),
            description: event.hash || event.status,
            date: formatDateTime(event.createdAt),
            color: event.type === 'TRANSFER' ? 'text-blue-400' : 'text-sinarca-neon',
        }))
        : project.timeline.map((item, index) => ({
            id: `${project.friendlyId}-${index}`,
            icon: Info,
            title: item.title,
            description: item.desc,
            date: item.date,
            color: 'text-primary',
        }));
    const metricCards = [
        { label: 'NDVI Atual', val: baseline.ndviMean.toFixed(3), trend: `${baseline.vegetationCoverPct.toFixed(1)}% veg.`, icon: Leaf, color: 'text-sinarca-neon' },
        { label: 'Pontos Analisados', val: baseline.pointsAnalyzed.toLocaleString('pt-BR'), trend: 'Sentinel', icon: Info, color: 'text-blue-400' },
        { label: 'Status Projeto', val: protectedProject ? 'OK' : 'Bloq.', trend: project.status, icon: AlertCircle, color: protectedProject ? 'text-sinarca-neon' : 'text-orange-400' },
        { label: 'Captura Base', val: formatDateTime(baseline.capturedAt), trend: baseline.sentinelSceneId.slice(0, 4), icon: Calendar, color: 'text-primary' },
    ];

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1400px] flex flex-col gap-6 animate-in fade-in duration-700">
            
            {/* 1. HEADER E STATUS RÁPIDO */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sinarca-neon/10 border border-sinarca-neon/20 text-sinarca-neon text-[10px] font-bold uppercase tracking-wider">
                            <Satellite className="w-3 h-3" /> Monitoramento Sentinel-2
                        </span>
                        <span className="text-gray-500 text-xs font-mono">{project.friendlyId}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-1">{project.name}</h1>
                    <p className="text-text-muted flex items-center gap-1 text-sm">
                        <Navigation className="w-3 h-3" /> {project.location.city}, {project.location.state}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-sinarca-deep border border-sinarca-border rounded-xl p-3 flex flex-col items-end">
                        <span className="text-[10px] text-text-muted uppercase font-bold tracking-tighter">Status da Reserva</span>
                        <div className={`flex items-center gap-2 ${protectedProject ? 'text-sinarca-neon' : 'text-orange-400'}`}>
                            <ShieldCheck className="w-5 h-5" />
                            <span className="text-lg font-bold uppercase tracking-widest">{protectedProject ? 'Protegido' : 'Bloqueado'}</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleRefresh}
                        className={`p-4 bg-sinarca-forest border border-sinarca-border rounded-xl text-white hover:bg-white/10 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 2. GRADE PRINCIPAL: MAPA + STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* MAPA PRINCIPAL (8/12) */}
                <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-sinarca-border bg-[#00120b] h-[500px] lg:h-[650px] group shadow-2xl">
                    {/* Imagem do Mapa (Simulada) */}
                    <div className="absolute inset-0">
                        <img 
                            src={project.image}
                            className={`w-full h-full object-cover transition-all duration-1000 ${viewMode === 'ndvi' ? 'hue-rotate-[80deg] saturate-[1.5] brightness-[0.8]' : viewMode === 'thermal' ? 'invert sepia saturate-[2]' : ''}`}
                            alt="Map View"
                        />
                        {/* Overlay de Cerca Virtual */}
                        <div className="absolute inset-0 border-[4px] border-sinarca-neon/30 m-20 rounded-[4rem] shadow-[inset_0_0_100px_rgba(0,255,148,0.2)] flex items-center justify-center">
                            <div className="text-sinarca-neon/50 font-mono text-[8px] flex flex-col items-center">
                                <Maximize2 className="w-4 h-4 mb-1" />
                                ÁREA SOB CUSTÓDIA
                            </div>
                        </div>
                    </div>

                    {/* Controles do Mapa */}
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                        <button 
                            onClick={() => setViewMode('ndvi')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${viewMode === 'ndvi' ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-black/50 text-white border-white/10 backdrop-blur-md'}`}
                        >
                            Índice NDVI
                        </button>
                        <button 
                            onClick={() => setViewMode('natural')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${viewMode === 'natural' ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-black/50 text-white border-white/10 backdrop-blur-md'}`}
                        >
                            Cor Natural
                        </button>
                        <button 
                            onClick={() => setViewMode('thermal')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${viewMode === 'thermal' ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-black/50 text-white border-white/10 backdrop-blur-md'}`}
                        >
                            Térmico
                        </button>
                    </div>

                    {/* Legenda NDVI */}
                    <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl max-w-[200px]">
                        <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold mb-2">
                            <span>Baixa Vegetação</span>
                            <span>Densa</span>
                        </div>
                        <div className="h-2 w-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full mb-3"></div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-white font-mono">Médio: {baseline.ndviMean.toFixed(3)}</span>
                            <span className="text-[10px] text-sinarca-neon font-bold">{baseline.vegetationCoverPct.toFixed(1)}% cobertura</span>
                        </div>
                    </div>

                    {/* Info Satélite */}
                    <div className="absolute top-6 right-6 flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-sinarca-neon animate-pulse"></div>
                        <span className="text-[10px] text-white font-bold uppercase tracking-widest">Sincronizado com Sentinel-2B</span>
                    </div>
                </div>

                {/* SIDEBAR DE STATS (4/12) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    
                    {/* Card de Inviolabilidade (QTAGs) */}
                    <div className="bg-sinarca-deep border border-sinarca-border rounded-3xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                                <Fingerprint className="w-4 h-4 text-sinarca-neon" /> Rede QTAG
                            </h3>
                            <span className="text-[10px] text-sinarca-neon font-bold px-2 py-0.5 rounded bg-sinarca-neon/10">Inviolável</span>
                        </div>
                        <div className="space-y-4">
                            {monitoring.tags.map(tag => (
                                <div key={tag.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sinarca-forest flex items-center justify-center">
                                            <Navigation className="w-4 h-4 text-sinarca-neon" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">{tag.id} ({tag.position})</p>
                                            <p className="text-[10px] text-text-muted">{formatDateTime(tag.lastSeenAt)}</p>
                                        </div>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-sinarca-neon shadow-[0_0_8px_rgba(0,255,148,0.5)]"></div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 border border-sinarca-border rounded-xl text-[10px] font-bold uppercase text-text-muted hover:text-white hover:bg-white/5 transition-all">
                            Validar Presença Física
                        </button>
                    </div>

                    {/* Card de Histórico de Alertas */}
                    <div className="bg-sinarca-deep border border-sinarca-border rounded-3xl p-6 shadow-xl flex-1">
                        <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                            <History className="w-4 h-4 text-primary" /> Atividades Recentes
                        </h3>
                        <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                            {activityItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.id} className="relative pl-8">
                                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-sinarca-deep border border-current flex items-center justify-center z-10 ${item.color}`}>
                                            <Icon className="w-3 h-3" />
                                        </div>
                                        <p className="text-xs font-bold text-white">{item.title}</p>
                                        <p className="text-[10px] text-text-muted mb-1">{item.description}</p>
                                        <span className="text-[9px] text-gray-600 font-mono">{item.date}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. RODAPÉ DE MÉTRICAS DETALHADAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metricCards.map((stat, i) => (
                    <div key={i} className="bg-sinarca-deep border border-sinarca-border rounded-2xl p-6 hover:bg-white/5 transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl bg-white/5 group-hover:scale-110 transition-transform ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded bg-white/5 ${stat.trend.includes('+') ? 'text-green-400' : stat.trend.includes('-') ? 'text-red-400' : 'text-gray-400'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">{stat.label}</p>
                        <p className="text-2xl font-serif font-bold text-white">{stat.val}</p>
                    </div>
                ))}
            </div>

        </div>
    );
}
