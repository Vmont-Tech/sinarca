import React, { useState, useEffect } from 'react';
import {
    Trophy,
    Building2,
    Verified,
    List,
    ChevronRight,
    ShieldCheck,
    UserCheck,
    Cloud,
    TreePine,
    DollarSign,
    TrendingUp,
    PlusCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../services/database';
import Logo from '../../assets/logo.png';

interface Leader {
    id: string;
    name: string;
    sector: string;
    totalImpact: number;
    secondaryMetric: number; // e.g. Investment, Projects Count
    status: string;
    rank: number;
    logoColor: string;
    initials: string;
    type: 'company' | 'certifier' | 'auditor';
}

const LOGO_COLORS: Record<string, string> = {
    'TechGlobal': 'bg-gradient-to-br from-green-100 to-green-300',
    'Banco Futuro': 'bg-gradient-to-br from-gray-200 to-gray-400',
    'AgroSustentável': 'bg-gradient-to-br from-orange-100 to-orange-200',
    'default': 'bg-gradient-to-br from-blue-100 to-blue-200'
};

export default function ImpactLeaders() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'companies' | 'certifiers' | 'auditors'>('companies');
    const [leaders, setLeaders] = useState<Leader[]>([]);
    const [stats, setStats] = useState({
        totalCompensated: 0,
        activeProjects: 0,
        totalInvested: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch RAW Data Sources
                const rawProjects = await database.getMarketProjects({ limit: 1000 });
                const companies = await database.getCompanies();
                const certifiers = await database.getCertifiers();
                const auditors = await database.getAuditors();

                // 2. Calculate Rankings based on Active Tab
                let rankingData: Leader[] = [];

                if (activeTab === 'companies') {
                    // Rank Companies by Total Impact (Credits Purchased/Retired + Developed)
                    // Note: Ideally we sum from projects where company is Developer or Compensator
                    // For now using the pre-aggregated 'total_impact' from COMPANIES_DB as it is the canonical source for this mock
                    // But let's verify if we can aggregate from projects to be "real"
                    // Aggregation from projects:
                    rankingData = companies.map((comp: any) => {
                        // Calculate real impact from projects if possible, else use db value
                        const developedProjects = rawProjects.filter((p: any) => p.institution.name === comp.name);
                        const developedImpact = developedProjects.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);

                        // Use calculated developedImpact strictly to ensure consistency with profile views
                        const finalImpact = developedImpact;

                        return {
                            id: comp.id,
                            name: comp.name,
                            sector: comp.role === 'Developer' ? 'Desenvolvedor' : 'Compensador',
                            totalImpact: finalImpact,
                            secondaryMetric: developedProjects.length, // Projects count
                            status: 'Ativo',
                            rank: 0,
                            logoColor: LOGO_COLORS['default'],
                            initials: comp.name.substring(0, 2).toUpperCase(),
                            type: 'company' as const
                        };
                    }).sort((a: any, b: any) => b.totalImpact - a.totalImpact);

                } else if (activeTab === 'certifiers') {
                    // Rank Certifiers by Credits Generated (Sum of projects)
                    rankingData = certifiers.map((cert: any) => {
                        const certProjects = rawProjects.filter((p: any) => p.chain.emitter.name === cert.name);
                        const impact = certProjects.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);

                        return {
                            id: cert.id,
                            name: cert.name,
                            sector: 'Certificadora',
                            totalImpact: impact,
                            secondaryMetric: certProjects.length,
                            status: cert.authorized ? 'Autorizada' : 'Pendente',
                            rank: 0,
                            logoColor: LOGO_COLORS['default'],
                            initials: cert.name.substring(0, 2).toUpperCase(),
                            type: 'certifier' as const
                        };
                    }).sort((a: any, b: any) => b.totalImpact - a.totalImpact);

                } else if (activeTab === 'auditors') {
                    // Rank Auditors by Volume Audited (Sum of projects)
                    rankingData = auditors.map((aud: any) => {
                        const audProjects = rawProjects.filter((p: any) => p.chain.auditor.name === aud.name);
                        const volume = audProjects.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);

                        return {
                            id: aud.id,
                            name: aud.name,
                            sector: 'Auditoria',
                            totalImpact: volume,
                            secondaryMetric: aud.projects_audited, // Or audProjects.length
                            status: aud.verified ? 'Credenciado' : 'Pendente',
                            rank: 0,
                            logoColor: LOGO_COLORS['default'],
                            initials: aud.name.substring(0, 2).toUpperCase(),
                            type: 'auditor' as const
                        };
                    }).sort((a: any, b: any) => b.totalImpact - a.totalImpact);
                }

                // Assign Ranks
                rankingData = rankingData.map((item, index) => ({ ...item, rank: index + 1 }));
                setLeaders(rankingData);

                // 3. Global Stats
                const totalManaged = rawProjects.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);
                // Investment roughly 45 BRL per ton if not specified
                // Using rawProjects mostly comes with no investment data in list view, but let's assume average
                const totalInvested = totalManaged * 45;
                const activeCount = rawProjects.length;

                setStats({
                    totalCompensated: totalManaged,
                    activeProjects: activeCount,
                    totalInvested: totalInvested
                });

            } catch (error) {
                console.error("Failed to load leaders data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [activeTab]);

    const formatNumber = (num: number) => num.toLocaleString('pt-BR');
    const formatCurrency = (num: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact" }).format(num);
    const formatCompact = (num: number) => new Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(num);

    const getProfileLink = (leader: Leader) => {
        if (leader.type === 'certifier') return `/painel/certificadoras/${leader.id}`;
        if (leader.type === 'auditor') return `/painel/auditores/${leader.id}`;
        return `/painel/empresas/${leader.id}`;
    };

    if (loading) return <div className="min-h-screen bg-[#121811] flex items-center justify-center text-sinarca-neon">Carregando dados de impacto...</div>;

    const top1 = leaders[0];
    const top2 = leaders[1];
    const top3 = leaders[2];
    const rest = leaders.slice(3);

    return (
        <div className="flex flex-col w-full min-h-full bg-[#121811] text-white">
            {/* Hero Section */}
            <section className="relative w-full shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#121811]/90 via-[#121811]/70 to-[#121811] z-10"></div>

                <div className="relative z-20 flex flex-col items-center px-4 py-12 md:py-20 text-center max-w-[960px] mx-auto">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sinarca-neon/30 bg-sinarca-neon/10 px-4 py-1.5 backdrop-blur-md">
                        <Trophy className="text-sinarca-neon w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-sinarca-neon">Ecossistema SINARCA 2025</span>
                    </div>
                    <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight tracking-tight text-white mb-6">
                        Líderes de <span className="text-sinarca-neon italic">Impacto</span>
                    </h1>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl mt-8">
                        <div className="flex flex-col gap-1 rounded-xl p-6 bg-[#2a3928]/80 backdrop-blur-sm border border-white/5 hover:border-sinarca-neon/30 transition-all group">
                            <div className="flex items-center gap-2 text-[#a0ba9c] mb-2">
                                <img src={Logo} className="w-5 h-5 object-contain opacity-50 group-hover:opacity-100 transition-opacity" alt="Sinarca" />
                                <p className="text-sm font-medium uppercase tracking-wider">tCO2e Geridos</p>
                            </div>
                            <p className="text-white font-sans text-3xl font-bold">{formatCompact(stats.totalCompensated)}</p>
                            <p className="text-sinarca-neon text-sm font-medium mt-1 inline-flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" /> Real Time
                            </p>
                        </div>
                        <div className="flex flex-col gap-1 rounded-xl p-6 bg-[#2a3928]/80 backdrop-blur-sm border border-white/5 hover:border-sinarca-neon/30 transition-all group">
                            <div className="flex items-center gap-2 text-[#a0ba9c] mb-2">
                                <img src={Logo} className="w-5 h-5 object-contain opacity-50 group-hover:opacity-100 transition-opacity" alt="Sinarca" />
                                <p className="text-sm font-medium uppercase tracking-wider">Projetos Ativos</p>
                            </div>
                            <p className="text-white font-sans text-3xl font-bold">{stats.activeProjects}</p>
                            <p className="text-sinarca-neon text-sm font-medium mt-1 inline-flex items-center gap-1">
                                <PlusCircle className="w-4 h-4" /> Auditados
                            </p>
                        </div>
                        <div className="flex flex-col gap-1 rounded-xl p-6 bg-[#2a3928]/80 backdrop-blur-sm border border-white/5 hover:border-sinarca-neon/30 transition-all group">
                            <div className="flex items-center gap-2 text-[#a0ba9c] mb-2">
                                <img src={Logo} className="w-5 h-5 object-contain opacity-50 group-hover:opacity-100 transition-opacity" alt="Sinarca" />
                                <p className="text-sm font-medium uppercase tracking-wider">Valor Investido</p>
                            </div>
                            <p className="text-white font-sans text-3xl font-bold">{formatCurrency(stats.totalInvested)}</p>
                            <p className="text-sinarca-neon text-sm font-medium mt-1 inline-flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" /> Estimado
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="flex-1 w-full max-w-[1200px] mx-auto px-4 md:px-8 pb-20">
                {/* Tabs */}
                <div className="mb-12 border-b border-[#2a3928]">
                    <div className="flex justify-center gap-8 overflow-x-auto pb-px">
                        <button
                            onClick={() => setActiveTab('companies')}
                            className={`flex items-center gap-2 border-b-2 pb-3 px-4 transition-colors cursor-pointer ${activeTab === 'companies' ? 'border-sinarca-neon text-white' : 'border-transparent text-[#a0ba9c] hover:text-white'}`}
                        >
                            <Building2 className="w-5 h-5" />
                            <span className="text-sm font-bold tracking-wide">Empresas</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('certifiers')}
                            className={`flex items-center gap-2 border-b-2 pb-3 px-4 transition-colors cursor-pointer ${activeTab === 'certifiers' ? 'border-sinarca-neon text-white' : 'border-transparent text-[#a0ba9c] hover:text-white'}`}
                        >
                            <ShieldCheck className="w-5 h-5" />
                            <span className="text-sm font-bold tracking-wide">Certificadoras</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('auditors')}
                            className={`flex items-center gap-2 border-b-2 pb-3 px-4 transition-colors cursor-pointer ${activeTab === 'auditors' ? 'border-sinarca-neon text-white' : 'border-transparent text-[#a0ba9c] hover:text-white'}`}
                        >
                            <UserCheck className="w-5 h-5" />
                            <span className="text-sm font-bold tracking-wide">Auditores</span>
                        </button>
                    </div>
                </div>

                {/* Podium View */}
                {leaders.length > 0 && (
                    <div className="mb-16">
                        <h2 className="font-serif text-2xl text-white font-bold text-center mb-10">
                            {activeTab === 'companies' ? 'Maiores Desenvolvedores & Compensadores' :
                                activeTab === 'certifiers' ? 'Maiores Emissores de Crédito' : 'Auditores Mais Ativos'}
                        </h2>

                        <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-8 h-auto md:h-[450px]">
                            {/* 2nd Place */}
                            {top2 && (
                                <div className="order-2 md:order-1 w-full md:w-1/3 flex flex-col items-center group cursor-pointer" onClick={() => navigate(getProfileLink(top2))}>
                                    <div className="relative w-full bg-[#2a3928] rounded-t-xl p-6 pt-12 flex flex-col items-center border-t-4 border-[#C0C0C0]">
                                        <div className="absolute -top-10">
                                            <div className="size-20 rounded-full border-4 border-[#121811] bg-white flex items-center justify-center overflow-hidden">
                                                <div className={`w-full h-full ${top2.logoColor} flex items-center justify-center text-[#121811] font-bold text-xl`}>{top2.initials}</div>
                                            </div>
                                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#C0C0C0] text-[#121811] size-8 rounded-full flex items-center justify-center font-serif font-bold border-4 border-[#121811]">2</div>
                                        </div>
                                        <h3 className="text-lg font-bold mt-4 text-center group-hover:text-sinarca-neon transition-colors">{top2.name}</h3>
                                        <p className="text-[#a0ba9c] text-sm mb-4">{top2.sector}</p>
                                        <div className="bg-[#121811] rounded-lg p-3 w-full text-center">
                                            <p className="text-xs text-[#a0ba9c] uppercase">{activeTab === 'companies' ? 'Impacto Total' : 'Volume Gerido'}</p>
                                            <p className="text-xl font-bold text-[#C0C0C0]">{formatCompact(top2.totalImpact)} tCO2e</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-[#1e2b1d] h-4 md:h-24 rounded-b-xl opacity-50"></div>
                                </div>
                            )}

                            {/* 1st Place */}
                            {top1 && (
                                <div className="order-1 md:order-2 w-full md:w-1/3 flex flex-col items-center z-10 cursor-pointer" onClick={() => navigate(getProfileLink(top1))}>
                                    <div className="relative w-full bg-[#2a3928] rounded-t-xl p-8 pt-16 flex flex-col items-center border-t-4 border-sinarca-neon scale-105 transform">
                                        <div className="absolute -top-12">
                                            <div className="size-24 rounded-full border-4 border-[#121811] bg-white flex items-center justify-center overflow-hidden relative">
                                                <div className={`w-full h-full ${top1.logoColor} flex items-center justify-center text-[#121811] font-bold text-2xl`}>{top1.initials}</div>
                                                <div className="absolute bottom-0 right-0 bg-[#121811] rounded-full p-1 border border-sinarca-neon">
                                                    <img src={Logo} className="w-4 h-4 object-contain" alt="Verified" />
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-sinarca-neon text-[#121811] size-10 rounded-full flex items-center justify-center font-serif font-bold text-xl border-4 border-[#121811]">1</div>
                                        </div>
                                        <h3 className="text-xl font-bold mt-2 text-center text-white">{top1.name}</h3>
                                        <p className="text-[#a0ba9c] text-sm mb-6">{top1.sector}</p>
                                        <div className="bg-[#121811] rounded-lg p-4 w-full text-center border border-sinarca-neon/20">
                                            <p className="text-xs text-[#a0ba9c] uppercase mb-1">{activeTab === 'companies' ? 'Impacto Total' : 'Volume Gerido'}</p>
                                            <p className="text-3xl font-bold text-sinarca-neon font-sans">{formatCompact(top1.totalImpact)} <span className="text-base font-normal text-white">tCO2e</span></p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-[#233522] h-4 md:h-36 rounded-b-xl opacity-80"></div>
                                </div>
                            )}

                            {/* 3rd Place */}
                            {top3 && (
                                <div className="order-3 md:order-3 w-full md:w-1/3 flex flex-col items-center group cursor-pointer" onClick={() => navigate(getProfileLink(top3))}>
                                    <div className="relative w-full bg-[#2a3928] rounded-t-xl p-6 pt-12 flex flex-col items-center border-t-4 border-[#CD7F32]">
                                        <div className="absolute -top-10">
                                            <div className="size-20 rounded-full border-4 border-[#121811] bg-white flex items-center justify-center overflow-hidden">
                                                <div className={`w-full h-full ${top3.logoColor} flex items-center justify-center text-[#121811] font-bold text-xl`}>{top3.initials}</div>
                                            </div>
                                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#CD7F32] text-[#121811] size-8 rounded-full flex items-center justify-center font-serif font-bold border-4 border-[#121811]">3</div>
                                        </div>
                                        <h3 className="text-lg font-bold mt-4 text-center group-hover:text-sinarca-neon transition-colors">{top3.name}</h3>
                                        <p className="text-[#a0ba9c] text-sm mb-4">{top3.sector}</p>
                                        <div className="bg-[#121811] rounded-lg p-3 w-full text-center">
                                            <p className="text-xs text-[#a0ba9c] uppercase">{activeTab === 'companies' ? 'Impacto Total' : 'Volume Gerido'}</p>
                                            <p className="text-xl font-bold text-[#CD7F32]">{formatCompact(top3.totalImpact)} tCO2e</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-[#1e2b1d] h-4 md:h-16 rounded-b-xl opacity-50"></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Full List */}
                <div className="bg-[#2a3928] rounded-xl overflow-hidden border border-[#3e543b]/50">
                    <div className="flex items-center justify-between p-6 border-b border-[#3e543b]/50 bg-[#1f2b1e]">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <List className="text-sinarca-neon w-5 h-5" />
                            Ranking Completo
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#3e543b]/50 text-xs text-[#a0ba9c] uppercase tracking-wider">
                                    <th className="p-4 pl-6 font-medium">Rank</th>
                                    <th className="p-4 font-medium">Organização</th>
                                    <th className="p-4 font-medium hidden sm:table-cell">Setor</th>
                                    <th className="p-4 font-medium text-right">Volume (tCO2e)</th>
                                    <th className="p-4 font-medium text-right hidden md:table-cell">
                                        {activeTab === 'companies' ? 'Projetos' : (activeTab === 'certifiers' ? 'Registros' : 'Auditorias')}
                                    </th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                    <th className="p-4 pr-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#3e543b]/30">
                                {rest.map((leader) => (
                                    <tr
                                        key={leader.id}
                                        onClick={() => navigate(getProfileLink(leader))}
                                        className="group hover:bg-[#354733] transition-colors cursor-pointer"
                                    >
                                        <td className="p-4 pl-6 font-serif font-bold text-lg text-white/50 group-hover:text-sinarca-neon transition-colors">0{leader.rank}</td>
                                        <td className="p-4">
                                            <div>
                                                <p className="text-sm font-bold text-white">{leader.name}</p>
                                                <p className="text-xs text-[#a0ba9c] sm:hidden">{leader.sector}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-[#a0ba9c] hidden sm:table-cell">{leader.sector}</td>
                                        <td className="p-4 text-sm font-bold text-white text-right">{formatNumber(leader.totalImpact)}</td>
                                        <td className="p-4 text-sm text-[#a0ba9c] text-right hidden md:table-cell">{leader.secondaryMetric}</td>
                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-700/50">
                                                {leader.status}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <ChevronRight className="text-[#a0ba9c] group-hover:text-sinarca-neon transition-colors w-5 h-5 inline" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
