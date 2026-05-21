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
    Folder
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import ProjectDotMap from '../../components/maps/ProjectDotMap';

export default function Overview() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [recentProjects, setRecentProjects] = useState<any[]>([]);

    useEffect(() => {
        const loadRecent = async () => {
            try {
                const data = await database.getMarketProjects({ limit: 5 });
                setRecentProjects(data || []);
            } catch (error) {
                console.error("Erro ao carregar projetos:", error);
            }
        };
        loadRecent();
    }, []);

    const isProducer = user?.role === 'producer' || user?.role === 'admin';
    const isCompany = user?.role === 'company';

    if (isProducer) {
        return (
            <div className="flex flex-col gap-8">
                {/* Top Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard 
                        icon={Folder} 
                        label="Total de Projetos" 
                        value="5" 
                        sub="Todos os projetos registrados" 
                        color="text-primary"
                    />
                    <SummaryCard 
                        icon={Leaf} 
                        label="Créditos Ativos" 
                        value="250" 
                        sub="Créditos de carbono ativos" 
                        color="text-primary"
                    />
                    <SummaryCard 
                        icon={ClipboardCheck} 
                        label="Auditorias Pendentes" 
                        value="1" 
                        sub="Aguardando auditoria" 
                        color="text-orange-500"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Recent Projects Table */}
                    <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-black tracking-tight">Projetos Recentes</h3>
                            <div className="flex gap-4">
                                <button onClick={() => navigate('/painel/adicionar-projeto')} className="bg-primary text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg hover:scale-105 transition-all">Adicionar Projeto</button>
                                <button className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">Ver Todos</button>
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
                                    {recentProjects.map((p, i) => (
                                        <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                        <TreePine className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-black">{p.project?.name || 'Projeto Ambiental'}</p>
                                                        <p className="text-[10px] text-gray-400">{p.project?.location || 'Brasil'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                                    p.status === 'Auditado' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="py-4 font-bold text-sm text-black">{p.quantity}</td>
                                            <td className="py-4">
                                                <div className="flex gap-2">
                                                    <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: Map */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-black tracking-tight">Localização dos Projetos</h3>
                            <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-2xl overflow-hidden relative border border-gray-100 min-h-[400px]">
                            <ProjectDotMap />
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
                            value="12.450" 
                            unit="hectares" 
                        />
                        <MetricCard 
                            icon={Zap} 
                            label="CO2 Sequestrado" 
                            value="45.680" 
                            unit="toneladas" 
                        />
                        <MetricCard 
                            icon={DollarSign} 
                            label="Receita Gerada" 
                            value="R$ 2.560.000" 
                            unit="em créditos de carbono" 
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
                            {recentProjects.slice(0, 4).map((p, i) => (
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
                    <button className="text-primary text-xs font-bold uppercase tracking-widest">Ver Todos</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recentProjects.slice(0, 3).map((p, i) => (
                        <div key={i} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm group cursor-pointer hover:shadow-xl transition-all">
                            <div className="h-40 bg-gray-100 relative">
                                <img src={`https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80`} className="w-full h-full object-cover" />
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md text-primary text-[9px] font-bold uppercase tracking-widest">Floresta</span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h4 className="font-bold text-black mb-1">{p.project?.name || 'Reserva Natural'}</h4>
                                <p className="text-[10px] text-gray-400 flex items-center gap-1 mb-4">
                                    <MapPin className="w-3 h-3" /> {p.project?.location || 'Brasil'}
                                </p>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Disponíveis</p>
                                        <p className="text-primary font-bold">{p.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Preço/crédito</p>
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
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-black tracking-tighter">{value}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{sub}</p>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, unit }: any) {
    return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Icon className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
            <span className="text-3xl font-black text-black mb-1">{value}</span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{unit}</p>
        </div>
    );
}

function CompanyMetric({ label, value, icon: Icon }: any) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-primary">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
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
