import React, { useState, useEffect } from 'react';
import {
    ArrowRight,
    Building2,
    Leaf,
    ShieldCheck,
    History,
    Map as MapIcon,
    ChevronDown,
    Zap,
    Scale,
    Eye,
    Globe,
    MapPin,
    TreePine,
    TrendingUp,
    DollarSign,
    Users,
    ClipboardCheck,
    Folder,
    Pencil,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import ProjectDotMap from '../../components/maps/ProjectDotMap';

const PROJECTS_PER_PAGE = 5;
const AUDIT_PENDING_STATUSES = new Set([
    'AWAITING_AUDIT',
    'BLOCKED_AUDIT_REQUIRED',
    'RECALCULATION_REQUIRED',
]);

const asFiniteNumber = (...values: unknown[]) => {
    for (const value of values) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
};

const projectLifecycleStatus = (project: any) => String(
    project?.raw?.status ||
    project?.project?.lifecycleStatus ||
    project?.currentLifecycleStage?.projectStatus ||
    project?.currentLifecycleStage?.code ||
    ''
).toUpperCase();

const projectCredits = (project: any) => asFiniteNumber(
    project?.quantity,
    project?.raw?.metrics?.carbonStock,
    project?.raw?.carbonStock
);

const projectArea = (project: any) => asFiniteNumber(
    project?.raw?.metrics?.totalAreaHa,
    project?.raw?.area_hectares,
    project?.metrics?.totalAreaHa
);

const projectCarbonStock = (project: any) => asFiniteNumber(
    project?.raw?.metrics?.carbonStock,
    project?.quantity,
    project?.raw?.carbonStock
);

const projectFinancialValue = (project: any) => asFiniteNumber(
    project?.raw?.metrics?.investmentValue,
    project?.raw?.investment_value_brl,
    project?.metrics?.investmentValue
);

const formatDashboardNumber = (value: number) =>
    value.toLocaleString('pt-BR', { maximumFractionDigits: value % 1 === 0 ? 0 : 2 });

const formatDashboardCurrency = (value: number) =>
    value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    });

const buildProducerDashboardMetrics = (projects: any[]) => {
    const activeCredits = projects.reduce((sum, project) => sum + projectCredits(project), 0);
    const pendingAudits = projects.filter((project) => AUDIT_PENDING_STATUSES.has(projectLifecycleStatus(project))).length;
    const totalArea = projects.reduce((sum, project) => sum + projectArea(project), 0);
    const co2Sequestered = projects.reduce((sum, project) => sum + projectCarbonStock(project), 0);
    const generatedRevenue = projects.reduce((sum, project) => sum + projectFinancialValue(project), 0);

    return {
        activeCredits: formatDashboardNumber(activeCredits),
        pendingAudits: pendingAudits.toLocaleString('pt-BR'),
        totalArea: formatDashboardNumber(totalArea),
        co2Sequestered: formatDashboardNumber(co2Sequestered),
        generatedRevenue: formatDashboardCurrency(generatedRevenue),
    };
};

export default function Overview() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dashboardProjects, setDashboardProjects] = useState<any[]>([]);
    const [projectPage, setProjectPage] = useState(1);
    const isProducerAccount = user?.role === 'producer';

    useEffect(() => {
        const loadRecent = async () => {
            try {
                const data = await database.getMarketProjects({
                    limit: 1000,
                    ownedOnly: isProducerAccount,
                    // portfolio_only excludes pre-certification statuses (CREATED, REGISTERED, ...)
                    // by API contract; producers need to see their own projects at every stage here
                    // (same fix as Feed.tsx's loadStats/loadMRCAs).
                    portfolioOnly: false,
                });
                const savedProjects = (data || []).filter((item: any) =>
                    (item.friendlyId || item.projectId) &&
                    item.project?.lifecycleStatus !== 'DRAFT' &&
                    item.raw?.status !== 'DRAFT'
                );
                setDashboardProjects(savedProjects);
                setProjectPage(1);
            } catch (error) {
                console.error("Erro ao carregar projetos:", error);
            }
        };
        loadRecent();
    }, [isProducerAccount]);

    const isProducer = user?.role === 'producer' || user?.role === 'admin';
    const isCompany = user?.role === 'company';
    const projectTotal = dashboardProjects.length;
    const producerDashboardMetrics = buildProducerDashboardMetrics(dashboardProjects);
    const totalProjectPages = Math.max(1, Math.ceil(projectTotal / PROJECTS_PER_PAGE));
    const firstProjectIndex = projectTotal === 0 ? 0 : (projectPage - 1) * PROJECTS_PER_PAGE + 1;
    const lastProjectIndex = Math.min(projectPage * PROJECTS_PER_PAGE, projectTotal);
    const paginatedProjects = dashboardProjects.slice((projectPage - 1) * PROJECTS_PER_PAGE, projectPage * PROJECTS_PER_PAGE);
    const projectTargetId = (project: any) => project?.friendlyId || project?.projectId || project?.id;
    const openProject = (project: any) => {
        const targetId = projectTargetId(project);
        if (targetId) navigate(`/painel/mrca/${targetId}`);
    };
    const editProject = (project: any) => {
        const targetId = projectTargetId(project);
        if (targetId) navigate(`/painel/mrca/${targetId}/editar`);
    };

    if (isProducer) {
        return (
            <div className="flex flex-col gap-8">
                {/* Top Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard 
                        icon={Folder} 
                        label="Total de Projetos" 
                        value={projectTotal.toLocaleString('pt-BR')}
                        sub="Projetos salvos vinculados"
                        color="text-emerald-700"
                    />
                    <SummaryCard 
                        icon={Leaf} 
                        label="Créditos Ativos" 
                        value={producerDashboardMetrics.activeCredits}
                        sub="Créditos vinculados aos projetos"
                        color="text-emerald-700"
                    />
                    <SummaryCard 
                        icon={ClipboardCheck} 
                        label="Auditorias Pendentes" 
                        value={producerDashboardMetrics.pendingAudits}
                        sub="Projetos aguardando auditoria"
                        color="text-orange-500"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Recent Projects Table */}
                    <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-black tracking-tight">Projetos Recentes</h3>
                                <p className="mt-1 text-xs font-medium text-gray-600">
                                    {projectTotal.toLocaleString('pt-BR')} projeto(s) salvo(s), 5 por página.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => navigate('/painel/adicionar-projeto')} className="bg-primary text-black text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg hover:bg-primary-hover hover:scale-105 transition-all">Adicionar Projeto</button>
                                <button onClick={() => navigate('/painel/projetos')} className="text-emerald-700 text-xs font-bold uppercase tracking-widest underline-offset-4 hover:text-emerald-800 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-700/20 rounded-lg px-2 py-1">Ver Todos</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-50 text-left">
                                        <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Nome do Projeto</th>
                                        <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Status</th>
                                        <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Créditos</th>
                                        <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedProjects.map((p, i) => (
                                        <tr key={p.friendlyId || p.projectId || p.id || i} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
                                                        <TreePine className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-black">{p.project?.name || 'Projeto Ambiental'}</p>
                                                        <p className="text-[11px] font-medium text-gray-600">{p.project?.location || 'Brasil'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                                    p.status === 'Auditado' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="py-4 font-bold text-sm text-black">{p.quantity}</td>
                                            <td className="py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openProject(p)}
                                                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                                                        aria-label={`Ver projeto ${p.project?.name || p.friendlyId || p.projectId || ''}`.trim()}
                                                        title="Ver projeto"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => editProject(p)}
                                                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                                                        aria-label={`Editar projeto ${p.project?.name || p.friendlyId || p.projectId || ''}`.trim()}
                                                        title="Editar projeto"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedProjects.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-10 text-center text-xs font-bold uppercase tracking-widest text-gray-500">
                                                Nenhum projeto salvo encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex flex-col gap-3 border-t border-gray-50 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs font-semibold text-gray-600">
                                Mostrando {firstProjectIndex}-{lastProjectIndex} de {projectTotal.toLocaleString('pt-BR')} projeto(s)
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setProjectPage((page) => Math.max(1, page - 1))}
                                    disabled={projectPage === 1}
                                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Página anterior de projetos"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="min-w-32 rounded-xl bg-gray-50 px-4 py-3 text-center text-xs font-bold text-gray-700">
                                    Página {projectPage} de {totalProjectPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setProjectPage((page) => Math.min(totalProjectPages, page + 1))}
                                    disabled={projectPage === totalProjectPages}
                                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Próxima página de projetos"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Map */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-black tracking-tight">Localização dos Projetos</h3>
                            <MapPin className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-2xl overflow-hidden relative border border-gray-100 min-h-[400px]">
                            <ProjectDotMap ownedOnly={isProducerAccount} />
                        </div>
                    </div>
                </div>

                {/* Main Metrics (Bottom) */}
                <div>
                    <h3 className="text-xl font-bold text-black tracking-tight mb-8">Métricas Principais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MetricCard 
                            icon={Globe} 
                            label="Área Total" 
                            value={producerDashboardMetrics.totalArea}
                            unit="hectares" 
                        />
                        <MetricCard 
                            icon={Zap} 
                            label="CO2 Sequestrado" 
                            value={producerDashboardMetrics.co2Sequestered}
                            unit="toneladas" 
                        />
                        <MetricCard 
                            icon={DollarSign} 
                            label="Receita Gerada" 
                            value={producerDashboardMetrics.generatedRevenue}
                            unit="valor registrado nos projetos"
                        />
                    </div>
                </div>
            </div>
        );
    }

    const isAuditor = user?.role === 'auditor';

    if (isAuditor) {
        return (
            <div className="flex flex-col gap-8">
                {/* Top Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard 
                        icon={ShieldCheck} 
                        label="Pendentes" 
                        value="12" 
                        sub="Projetos aguardando vistoria" 
                        color="text-orange-500"
                    />
                    <SummaryCard 
                        icon={ClipboardCheck} 
                        label="Realizadas" 
                        value="843" 
                        sub="Certificações concluídas" 
                        color="text-primary"
                    />
                    <SummaryCard 
                        icon={Scale} 
                        label="Precisão Técnica" 
                        value="99.9" 
                        sub="Conformidade de dados" 
                        color="text-primary"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Active Inspection Queue */}
                    <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-black tracking-tight">Fila de Inspeção</h3>
                            <button onClick={() => navigate('/painel/auditoria')} className="bg-primary text-white px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform">Iniciar Vistoria</button>
                        </div>
                        <div className="space-y-4">
                            {dashboardProjects.slice(0, 4).map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 hover:border-primary/20 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                                            <MapIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-black">{p.project?.name || 'Área de Preservação'}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{p.project?.location || 'Pará, BR'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Impacto Potencial</p>
                                            <p className="text-sm font-bold text-black">{p.quantity} tCO2e</p>
                                        </div>
                                        <button className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-primary transition-colors">
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Performance Info */}
                    <div className="bg-primary rounded-3xl p-8 text-white flex flex-col justify-between overflow-hidden relative">
                        <div className="absolute -right-10 -top-10 opacity-10">
                            <ShieldCheck className="w-64 h-64" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-white/60">Performance Auditor</p>
                            <h4 className="text-3xl font-bold font-display uppercase tracking-tighter leading-tight mb-4">
                                Integridade <br />é o nosso Ativo.
                            </h4>
                            <p className="text-sm text-white/70 font-light leading-relaxed mb-8">
                                Sua validação biométrica e NFC garante a imutabilidade do crédito no mercado voluntário.
                            </p>
                        </div>
                        <div className="relative z-10 pt-8 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-widest">Nível de Confiança</span>
                                <span className="text-xs font-bold">98%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-white w-[98%] rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Company Dashboard View
    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-black tracking-tight">Gestão de Ativos Ambientais</h2>
                    <p className="text-sm text-gray-400">Visão consolidada do seu inventário e impacto</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/painel/inventario')}
                        className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary transition-all shadow-xl"
                    >
                        Declarar Inventário
                    </button>
                    <div className="bg-white border border-gray-100 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresa Compradora</p>
                            <p className="text-sm font-bold text-black">Green Future Ltda.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <CompanyMetric label="Créditos Adquiridos" value="150" icon={Leaf} />
                    <CompanyMetric label="Créditos Utilizados" value="45" icon={History} />
                    <CompanyMetric label="Créditos Disponíveis" value="105" icon={ShieldCheck} />
                    <CompanyMetric label="CO2e Compensado" value="45" icon={Zap} />
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-black mb-6">Meu Portfólio</h3>
                    <div className="aspect-square relative flex items-center justify-center">
                        <div className="w-full h-full rounded-full border-[16px] border-primary/20 border-t-primary border-r-primary/60"></div>
                        <div className="absolute text-center">
                            <p className="text-3xl font-bold text-black">150</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Total de Créditos</p>
                        </div>
                    </div>
                    <div className="mt-8 space-y-3">
                        <PortfolioLegend color="bg-primary" label="Amazônia Conservada" percent="40%" />
                        <PortfolioLegend color="bg-primary/60" label="Energia Eólica" percent="30%" />
                        <PortfolioLegend color="bg-primary/20" label="Manguezais" percent="20%" />
                    </div>
                </div>
            </div>

            {/* Featured Projects */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-black tracking-tight">Projetos em Destaque</h3>
                    <button onClick={() => navigate('/painel/projetos')} className="text-emerald-700 text-xs font-bold uppercase tracking-widest underline-offset-4 hover:text-emerald-800 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-700/20 rounded-lg px-2 py-1">Ver Todos</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {dashboardProjects.slice(0, 3).map((p, i) => (
                        <div key={i} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm group cursor-pointer hover:shadow-xl transition-all">
                            <div className="h-40 bg-gray-100 relative">
                                <img src={`https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80`} className="w-full h-full object-cover" />
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 rounded-full bg-emerald-100 backdrop-blur-md text-emerald-800 text-[9px] font-bold uppercase tracking-widest">Floresta</span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h4 className="font-bold text-black mb-1">{p.project?.name || 'Reserva Natural'}</h4>
                                <p className="text-[11px] font-medium text-gray-600 flex items-center gap-1 mb-4">
                                    <MapPin className="w-3 h-3" /> {p.project?.location || 'Brasil'}
                                </p>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Disponíveis</p>
                                        <p className="text-emerald-700 font-bold">{p.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Preço/crédito</p>
                                        <p className="text-black font-bold">R$ 28,50</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, sub, color }: any) {
    return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center ${color}`}>
                    <Icon className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-black tracking-tighter">{value}</span>
                    </div>
                    <p className="text-[11px] font-medium text-gray-600">{sub}</p>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, unit }: any) {
    return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 mb-6">
                <Icon className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">{label}</p>
            <span className="text-3xl font-black text-black mb-1">{value}</span>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{unit}</p>
        </div>
    );
}

function CompanyMetric({ label, value, icon: Icon }: any) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black text-black tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function PortfolioLegend({ color, label, percent }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                <p className="text-xs font-medium text-gray-600">{label}</p>
            </div>
            <p className="text-xs font-bold text-black">{percent}</p>
        </div>
    );
}
