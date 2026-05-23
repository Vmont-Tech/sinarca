import { useEffect, useMemo, useState } from 'react';
import {
    Search,
    TreePine,
    Coins,
    Cloud,
    Network,
    Grid,
    TreeDeciduous,
    Zap,
    Droplets,
    FlaskConical,
    Check,
    ShieldCheck,
    ClipboardCheck,
    Landmark,
    Users,
    Map,
    History,
    ArrowRight,
    Plus,
    Minus,
    Focus,
    X
} from 'lucide-react';

import type { ProjectMRCA } from '../../data/mrca_db';
import { database, type TransactionRecord } from '../../services/database';

const formatNumber = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const formatDate = (value?: string) => {
    if (!value) return 'Sem data';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR');
};

const statusLabel = (status: string) => ({
    AVAILABLE: 'Disponível',
    ACTIVE: 'Ativo',
    AUDITED: 'Auditado',
    CREATED: 'Registrado',
    RETIRED: 'Aposentado',
    SUSPENDED: 'Suspenso',
    AWAITING_AUDIT: 'Em auditoria',
    AWAITING_CERTIFICATION: 'Em certificação',
}[status] || status);

export default function ProjectNetwork() {
    const [projects, setProjects] = useState<ProjectMRCA[]>([]);
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadNetwork = async () => {
            setLoading(true);
            setError('');
            try {
                const [loadedProjects, loadedTransactions] = await Promise.all([
                    database.getRawMarketProjects(),
                    database.getTransactions(),
                ]);
                setProjects(loadedProjects);
                setTransactions(loadedTransactions);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Não foi possível carregar a rede de projetos.');
            } finally {
                setLoading(false);
            }
        };
        loadNetwork();
    }, []);

    const visibleProjects = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return projects;
        return projects.filter((project) =>
            project.name.toLowerCase().includes(normalized) ||
            project.friendlyId.toLowerCase().includes(normalized) ||
            project.location.state.toLowerCase().includes(normalized) ||
            project.entities.certifier.name.toLowerCase().includes(normalized)
        );
    }, [projects, query]);

    const selectedProject = visibleProjects[0] || projects[0];
    const relatedTransactions = useMemo(() => {
        if (!selectedProject) return [];
        return transactions.filter((transaction) =>
            transaction.asset === selectedProject.name ||
            transaction.asset.toLowerCase().includes(selectedProject.name.toLowerCase().split(' ')[0])
        ).slice(0, 4);
    }, [selectedProject, transactions]);

    const stats = useMemo(() => {
        const activeProjects = projects.filter((project) => ['ACTIVE', 'AVAILABLE', 'AUDITED'].includes(project.status)).length;
        const totalCredits = projects.reduce((sum, project) => sum + project.metrics.carbonStock, 0);
        const totalArea = projects.reduce((sum, project) => sum + project.metrics.totalAreaHa, 0);
        const connectedOrganizations = new Set(projects.flatMap((project) => [
            project.entities.developer.id,
            project.entities.auditor.id,
            project.entities.certifier.id,
            project.entities.registry.id,
        ])).size;
        return { activeProjects, totalCredits, totalArea, connectedOrganizations };
    }, [projects]);

    if (loading) {
        return <div className="min-h-[calc(100vh-64px)] bg-[#0e160d] flex items-center justify-center text-sinarca-neon">Carregando rede...</div>;
    }

    if (error) {
        return <div className="min-h-[calc(100vh-64px)] bg-[#0e160d] flex items-center justify-center text-red-300">{error}</div>;
    }

    if (!selectedProject) {
        return <div className="min-h-[calc(100vh-64px)] bg-[#0e160d] flex items-center justify-center text-[#a0ba9c]">Nenhum projeto registrado no banco.</div>;
    }

    const primaryTransaction = relatedTransactions[0];
    const lastUpdated = formatDate(selectedProject.blockchain.timestamp);

    return (
        <div className="flex flex-col w-full h-full relative bg-[#0e160d] overflow-hidden min-h-[calc(100vh-64px)]">
            <div className="flex flex-col flex-1">
                <div className="px-6 md:px-12 py-6 border-b border-[#2a3928] bg-[#132210]">
                    <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-end max-w-[1600px] mx-auto w-full">
                        <div className="flex flex-col gap-2 max-w-2xl">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sinarca-neon text-xs font-bold uppercase tracking-wider border border-sinarca-neon/30 px-2 py-0.5 rounded">Rastreabilidade</span>
                                <span className="text-[#a0ba9c] text-xs font-medium px-2 py-0.5">Atualizado: {lastUpdated}</span>
                            </div>
                            <h1 className="text-white text-4xl md:text-5xl font-serif font-bold leading-tight tracking-tight">Rede de Projetos</h1>
                            <p className="text-[#a0ba9c] text-base md:text-lg font-normal leading-relaxed mt-2">
                                Explore a interconexão entre projetos ambientais, auditores e fluxos de créditos no ecossistema SINARCA.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full xl:w-auto">
                            <div className="flex flex-col gap-1 rounded-lg p-4 bg-[#1a2c17] border border-[#2a3928]">
                                <div className="flex items-center gap-2">
                                    <TreePine className="text-[#a0ba9c] w-4 h-4" />
                                    <p className="text-[#a0ba9c] text-xs font-medium uppercase">Projetos Ativos</p>
                                </div>
                                <p className="text-white text-2xl font-bold">{formatNumber(stats.activeProjects)}</p>
                                <p className="text-sinarca-neon text-xs font-medium">Persistidos no banco</p>
                            </div>
                            <div className="flex flex-col gap-1 rounded-lg p-4 bg-[#1a2c17] border border-[#2a3928]">
                                <div className="flex items-center gap-2">
                                    <Coins className="text-[#a0ba9c] w-4 h-4" />
                                    <p className="text-[#a0ba9c] text-xs font-medium uppercase">Créditos</p>
                                </div>
                                <p className="text-white text-2xl font-bold">{formatNumber(stats.totalCredits)}</p>
                                <p className="text-sinarca-neon text-xs font-medium">tCO2e</p>
                            </div>
                            <div className="flex flex-col gap-1 rounded-lg p-4 bg-[#1a2c17] border border-[#2a3928]">
                                <div className="flex items-center gap-2">
                                    <Cloud className="text-[#a0ba9c] w-4 h-4" />
                                    <p className="text-[#a0ba9c] text-xs font-medium uppercase">Área</p>
                                </div>
                                <p className="text-white text-2xl font-bold">{formatNumber(stats.totalArea)}</p>
                                <p className="text-sinarca-neon text-xs font-medium">hectares</p>
                            </div>
                            <div className="flex flex-col gap-1 rounded-lg p-4 bg-[#1a2c17] border border-[#2a3928]">
                                <div className="flex items-center gap-2">
                                    <Network className="text-[#a0ba9c] w-4 h-4" />
                                    <p className="text-[#a0ba9c] text-xs font-medium uppercase">Entidades</p>
                                </div>
                                <p className="text-white text-2xl font-bold">{formatNumber(stats.connectedOrganizations)}</p>
                                <p className="text-sinarca-neon text-xs font-medium">conectadas</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 md:px-12 py-4 bg-[#121811] border-b border-[#2a3928]">
                    <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="w-full md:w-1/3">
                            <div className="flex w-full items-center rounded-lg bg-[#1a2c17] border border-[#2a3928] focus-within:border-sinarca-neon transition-colors h-10">
                                <div className="text-[#a0ba9c] flex items-center justify-center pl-3">
                                    <Search className="w-5 h-5" />
                                </div>
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    className="w-full bg-transparent border-none text-white focus:ring-0 placeholder:text-[#a0ba9c]/70 text-sm h-full px-3"
                                    placeholder="Buscar ID do projeto, empresa ou certificadora..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
                            {[
                                { label: 'Todos', icon: Grid, value: '' },
                                { label: 'Reflorestamento', icon: TreeDeciduous, value: 'florest' },
                                { label: 'Energia Renovável', icon: Zap, value: 'solar' },
                                { label: 'Água Potável', icon: Droplets, value: 'água' },
                                { label: 'Captura de Carbono', icon: FlaskConical, value: 'carbono' },
                            ].map((chip) => {
                                const Icon = chip.icon;
                                return (
                                    <button
                                        key={chip.label}
                                        onClick={() => setQuery(chip.value)}
                                        className={`flex items-center gap-2 px-3 h-8 rounded-full text-xs whitespace-nowrap transition-all ${query === chip.value ? 'bg-sinarca-neon text-[#121811] font-bold' : 'bg-[#1a2c17] border border-[#2a3928] text-[#a0ba9c] hover:text-white hover:border-sinarca-neon/50 font-medium'}`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {chip.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative bg-[#0e160d] overflow-hidden min-h-[600px] w-full">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#40f320 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            <defs>
                                <linearGradient id="grad1" x1="0%" x2="100%" y1="0%" y2="0%">
                                    <stop offset="0%" style={{ stopColor: '#2a3928', stopOpacity: 1 }}></stop>
                                    <stop offset="100%" style={{ stopColor: '#40f320', stopOpacity: 0.6 }}></stop>
                                </linearGradient>
                                <marker id="arrow" markerHeight="10" markerUnits="strokeWidth" markerWidth="10" orient="auto" refX="20" refY="3">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#40f320"></path>
                                </marker>
                            </defs>
                            <line stroke="url(#grad1)" strokeWidth="1.5" x1="50%" x2="75%" y1="50%" y2="25%"></line>
                            <line stroke="#2a3928" strokeDasharray="5,5" strokeWidth="2" x1="50%" x2="25%" y1="50%" y2="30%"></line>
                            <line markerEnd="url(#arrow)" stroke="#40f320" strokeWidth="2" x1="50%" x2="30%" y1="50%" y2="70%"></line>
                            <line stroke="#2a3928" strokeWidth="1" x1="50%" x2="70%" y1="50%" y2="65%"></line>
                            <line stroke="#2a3928" strokeWidth="1" x1="75%" x2="85%" y1="25%" y2="15%"></line>
                            <line opacity="0.3" stroke="#40f320" strokeWidth="1" x1="25%" x2="15%" y1="30%" y2="40%"></line>
                        </svg>

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 group cursor-pointer">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-[#121811] border-2 border-sinarca-neon shadow-[0_0_30px_rgba(64,243,32,0.3)] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                    <TreePine className="text-sinarca-neon w-8 h-8" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-sinarca-neon rounded-full flex items-center justify-center text-[#121811] font-bold text-xs border-2 border-[#121811]">
                                    <Check className="w-3 h-3" />
                                </div>
                            </div>
                            <div className="bg-[#121811]/80 backdrop-blur px-3 py-1 rounded-full border border-sinarca-neon/30 max-w-[260px]">
                                <p className="text-white text-sm font-bold whitespace-nowrap truncate">{selectedProject.name}</p>
                            </div>
                        </div>

                        <div className="absolute top-[25%] left-[75%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full bg-[#1a2c17] border border-[#a0ba9c] flex items-center justify-center">
                                <ShieldCheck className="text-[#a0ba9c] w-6 h-6" />
                            </div>
                            <span className="text-[#a0ba9c] text-xs font-medium max-w-[160px] truncate">{selectedProject.entities.certifier.name}</span>
                        </div>
                        <div className="absolute top-[30%] left-[25%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full bg-[#1a2c17] border border-[#a0ba9c] border-dashed flex items-center justify-center">
                                <ClipboardCheck className="text-[#a0ba9c] w-6 h-6" />
                            </div>
                            <span className="text-[#a0ba9c] text-xs font-medium max-w-[160px] truncate">{selectedProject.entities.auditor.name}</span>
                        </div>
                        <div className="absolute top-[70%] left-[30%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer opacity-90 hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-[#1a2c17] border border-sinarca-neon flex items-center justify-center shadow-[0_0_15px_rgba(64,243,32,0.1)]">
                                <Landmark className="text-sinarca-neon w-6 h-6" />
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-white text-xs font-medium max-w-[160px] truncate">{primaryTransaction?.entities.to || selectedProject.entities.developer.name}</span>
                                <span className="text-sinarca-neon text-[10px]">Carteira</span>
                            </div>
                        </div>
                        <div className="absolute top-[65%] left-[70%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-[#1a2c17] border border-[#a0ba9c] flex items-center justify-center">
                                <Users className="text-[#a0ba9c] w-5 h-5" />
                            </div>
                            <span className="text-[#a0ba9c] text-xs font-medium max-w-[160px] truncate">{selectedProject.entities.registry.name}</span>
                        </div>

                        <div className="absolute right-4 top-4 bottom-4 w-80 lg:w-96 bg-[#1a2c17]/70 backdrop-blur-md border border-[#a0ba9c]/10 rounded-xl flex flex-col overflow-hidden shadow-2xl z-20">
                            <div className="p-5 border-b border-[#a0ba9c]/10 bg-[#1a2c17]/50">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-0.5 rounded bg-sinarca-neon/20 text-sinarca-neon text-[10px] font-bold uppercase tracking-wider">{statusLabel(selectedProject.status)}</span>
                                    <button className="text-[#a0ba9c] hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{selectedProject.friendlyId}</h3>
                                <p className="text-[#a0ba9c] text-sm">{selectedProject.location.city}, {selectedProject.location.state}</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                <div className="w-full h-40 rounded-lg bg-[#2a3928] overflow-hidden relative group">
                                    <img src={selectedProject.image} alt={selectedProject.name} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white backdrop-blur-sm">
                                        Blockchain: {formatDate(selectedProject.blockchain.timestamp)}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#121811] p-3 rounded border border-[#2a3928]">
                                        <p className="text-[#a0ba9c] text-xs mb-1">Volume Total</p>
                                        <p className="text-white font-bold">{formatNumber(selectedProject.metrics.carbonStock)} t</p>
                                    </div>
                                    <div className="bg-[#121811] p-3 rounded border border-[#2a3928]">
                                        <p className="text-[#a0ba9c] text-xs mb-1">Investimento</p>
                                        <p className="text-white font-bold">{formatCurrency(selectedProject.metrics.investmentValue)}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <History className="text-sinarca-neon w-4 h-4" />
                                        Rastreabilidade
                                    </h4>
                                    <div className="relative pl-4 border-l border-[#2a3928] space-y-6">
                                        {selectedProject.timeline.map((item, index) => (
                                            <div className="relative" key={`${item.title}-${index}`}>
                                                <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-[#121811] ${index === 0 ? 'bg-sinarca-neon' : 'bg-[#2a3928]'}`}></div>
                                                <p className="text-xs text-[#a0ba9c]">{item.date}</p>
                                                <p className="text-sm text-white font-medium">{item.title}</p>
                                                <p className="text-xs text-[#a0ba9c] mt-1">{item.desc}</p>
                                            </div>
                                        ))}
                                        {relatedTransactions.map((transaction) => (
                                            <div className="relative" key={transaction.id}>
                                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-sinarca-neon ring-4 ring-[#121811]"></div>
                                                <p className="text-xs text-[#a0ba9c]">{transaction.date}</p>
                                                <p className="text-sm text-white font-medium">{transaction.entities.from} → {transaction.entities.to}</p>
                                                <p className="text-xs text-sinarca-neon mt-1">{transaction.amount} {transaction.unit}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t border-[#a0ba9c]/10 bg-[#1a2c17]/50 mt-auto">
                                <button onClick={() => window.location.href = `/painel/mrca/${selectedProject.friendlyId}`} className="w-full flex items-center justify-center gap-2 rounded-lg h-10 bg-sinarca-neon hover:bg-sinarca-neon/90 text-[#121811] text-sm font-bold transition-all">
                                    Ver Detalhes Completos
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="absolute bottom-6 left-6 z-10 flex gap-2">
                            <button className="w-10 h-10 rounded bg-[#1a2c17] border border-[#2a3928] text-white flex items-center justify-center hover:bg-[#2a3928]">
                                <Plus className="w-5 h-5" />
                            </button>
                            <button className="w-10 h-10 rounded bg-[#1a2c17] border border-[#2a3928] text-white flex items-center justify-center hover:bg-[#2a3928]">
                                <Minus className="w-5 h-5" />
                            </button>
                            <button className="w-10 h-10 rounded bg-[#1a2c17] border border-[#2a3928] text-white flex items-center justify-center hover:bg-[#2a3928]">
                                <Focus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="absolute top-6 left-6 z-10 bg-[#121811]/80 backdrop-blur border border-[#2a3928] p-3 rounded-lg">
                            <p className="text-xs font-bold text-white mb-2 uppercase tracking-wide">Legenda</p>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-sinarca-neon"></div>
                                    <span className="text-[10px] text-[#a0ba9c]">Projeto</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full border border-[#a0ba9c]"></div>
                                    <span className="text-[10px] text-[#a0ba9c]">Entidade</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-[2px] bg-sinarca-neon"></div>
                                    <span className="text-[10px] text-[#a0ba9c]">Fluxo de Crédito</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-[2px] border-t border-dashed border-[#a0ba9c]"></div>
                                    <span className="text-[10px] text-[#a0ba9c]">Relação Operacional</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
