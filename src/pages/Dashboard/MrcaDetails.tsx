import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    MapPin,
    Calendar,
    Award,
    FileText,
    ArrowLeft,
    Share2,
    Download,
    ExternalLink,
    CheckCircle2,
    Leaf,
    ShieldCheck,
    Trees,
    Activity,
    Info,
    Lock,
    Globe,
    ShoppingCart,
    ArrowRight,
    BarChart3,
    History,
    ShieldAlert,
    ChevronRight,
    Zap,
    Building2,
    BadgeCheck
} from 'lucide-react';
import { getProjectById, type ProjectMRCA } from '../../data/mrca_db';
import LogoLight from '../../assets/sinarca-logo-recortado.svg';

export default function MrcaDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState<ProjectMRCA | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'blockchain' | 'docs' | 'audit'>('overview');

    useEffect(() => {
        if (id) {
            const found = getProjectById(id);
            if (found) {
                setProject(found);
                window.scrollTo(0, 0);
            }
        }
    }, [id]);

    if (!project) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center space-y-6">
                    <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Verificando integridade dos dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfcfc] text-black pb-32">
            {/* Top Navigation */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <img src={LogoLight} alt="Sinarca" className="w-8 h-8 object-contain" />
                    <div className="h-6 w-px bg-gray-100"></div>
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-50 rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="h-6 w-px bg-gray-100"></div>
                    <div>
                        <h2 className="text-sm font-bold text-black uppercase tracking-tight">{project.name}</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">ID: {project.friendlyId} • {project.location.state}, Brasil</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-black transition-all text-[10px] font-bold uppercase tracking-widest">
                        <Share2 className="w-4 h-4" /> Compartilhar
                    </button>
                    <a
                        href={`https://allo.info/tx/${project.blockchain.initialHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-xl"
                    >
                        Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    
                    {/* Left Side: Technical Data */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Hero Image */}
                        <div className="relative h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 group">
                            <img src={project.image} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            <div className="absolute bottom-10 left-10 right-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="px-4 py-1.5 bg-primary text-white rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg">
                                        Certificado {project.entities.certifier.name}
                                    </span>
                                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20">
                                        Vintage {project.metrics.vintage}
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-4 uppercase">
                                    {project.name}
                                </h1>
                                <p className="text-white/60 text-lg font-medium max-w-2xl">
                                    Localizado em {project.location.city}, este projeto garante a preservação de {project.metrics.totalAreaHa.toLocaleString()} hectares de bioma {project.location.bioma}.
                                </p>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex gap-10 border-b border-gray-100 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'overview', label: 'Análise Técnica', icon: FileText },
                                { id: 'blockchain', label: 'Evidência On-Chain', icon: Globe },
                                { id: 'docs', label: 'Documentação', icon: ShieldCheck },
                                { id: 'audit', label: 'Histórico de Auditoria', icon: History }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`pb-6 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-all relative ${
                                        activeTab === tab.id ? 'text-primary' : 'text-gray-400 hover:text-black'
                                    }`}
                                >
                                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : 'text-gray-300'}`} />
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full animate-in fade-in slide-in-from-bottom-2"></div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="min-h-[400px]">
                            {activeTab === 'overview' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <Info className="w-4 h-4 text-primary" /> Descritivo Técnico
                                            </h3>
                                            <p className="text-gray-500 text-sm leading-relaxed font-medium">
                                                {project.description} Este projeto utiliza metodologia {project.methodology} para garantir o sequestro de carbono a longo prazo, protegendo a fauna e flora locais através de monitoramento via satélite e biometria de campo.
                                            </p>
                                        </div>
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-primary" /> Metodologia Aplicada
                                            </h3>
                                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                                                    <Award className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-black uppercase">{project.methodology}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Padrão Internacional</p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6 leading-relaxed">
                                                O projeto segue os critérios do {project.entities.certifier.name}, com auditoria independente de terceira parte.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                                        <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-10">Cronograma de Validação</h3>
                                        <div className="space-y-10">
                                            {project.timeline.map((event, i) => (
                                                <div key={i} className="flex gap-8 group">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-xl ${
                                                            event.status === 'completed' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                                                        }`}>
                                                            {event.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 bg-current rounded-full" />}
                                                        </div>
                                                        {i < project.timeline.length - 1 && <div className="w-0.5 h-12 bg-gray-100 my-2"></div>}
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{event.date}</span>
                                                        <h4 className="text-lg font-bold text-black tracking-tight mt-1">{event.title}</h4>
                                                        <p className="text-sm text-gray-400 mt-1">{event.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'blockchain' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-black p-10 rounded-[3rem] text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -mr-40 -mt-40"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-4 mb-10">
                                                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-primary backdrop-blur-xl">
                                                    <Lock className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold tracking-tight">Registro Imutável em Blockchain</h3>
                                                    <p className="text-xs text-white/40 font-medium uppercase tracking-widest mt-1">Smart Contract: {project.blockchain.contractAddress.substring(0, 16)}...</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all group">
                                                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-3">ID do Ativo (On-Chain)</p>
                                                    <p className="font-mono text-xs text-primary break-all leading-relaxed">{project.blockchain.initialHash}</p>
                                                </div>
                                                <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all group">
                                                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-3">Raiz de Árvore Merkle</p>
                                                    <p className="font-mono text-xs text-white break-all leading-relaxed">{project.blockchain.merkleRoot}</p>
                                                </div>
                                            </div>

                                            <div className="mt-10 p-6 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <Globe className="w-6 h-6 text-primary" />
                                                    <div>
                                                        <p className="text-xs font-bold uppercase">Rede Pública Algorand</p>
                                                        <p className="text-[10px] text-white/40 font-bold uppercase mt-0.5">Protocolo PPoS - Carbono Negativo</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1 bg-primary text-white rounded-full text-[9px] font-bold uppercase tracking-widest">
                                                    <Activity className="w-3 h-3" /> Transação Auditada
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'docs' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-8">Documentação Técnica e Jurídica</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { name: 'Documento de Design do Projeto (PDD)', size: '2.4 MB', type: 'PDF' },
                                            { name: 'Relatório de Validação e Verificação', size: '1.8 MB', type: 'PDF' },
                                            { name: 'Certidão de Posse da Terra', size: '850 KB', type: 'PDF' },
                                            { name: 'Relatório de Monitoramento Anual', size: '3.1 MB', type: 'PDF' },
                                        ].map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl hover:border-primary/40 hover:shadow-xl transition-all group cursor-pointer">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-black tracking-tight">{doc.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{doc.type} • {doc.size}</p>
                                                    </div>
                                                </div>
                                                <Download className="w-5 h-5 text-gray-300 group-hover:text-black transition-all" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'audit' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-6 mb-12">
                                            <div className="w-20 h-20 rounded-[2rem] bg-gray-50 flex items-center justify-center text-primary shadow-inner border border-gray-100">
                                                <ShieldCheck className="w-10 h-10" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold tracking-tight">VVB Responsável</h3>
                                                <p className="text-sm text-gray-400 font-medium">{project.entities.auditor.name}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-bold uppercase tracking-widest">Credenciamento Ativo</div>
                                                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase tracking-widest">ISO 14065</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <Activity className="w-5 h-5 text-primary" />
                                                    <span className="text-xs font-bold uppercase text-gray-600">Última Inspeção Biométrica</span>
                                                </div>
                                                <span className="text-sm font-bold text-black">15 Out 2024</span>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <Zap className="w-5 h-5 text-primary" />
                                                    <span className="text-xs font-bold uppercase text-gray-600">Verificação de Adicionalidade</span>
                                                    <BadgeCheck className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="text-sm font-bold text-black">Conforme</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Sticky Action Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-28 space-y-8">
                            
                            {/* Main Purchase Card */}
                            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
                                
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Leaf className="w-5 h-5" />
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Disponibilidade</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-bold uppercase tracking-widest animate-pulse">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div> Em Aberto
                                    </div>
                                </div>

                                <div className="space-y-2 mb-10">
                                    <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">Estoque Certificado</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-black tracking-tighter">{project.metrics.carbonStock.toLocaleString()}</span>
                                        <span className="text-xl font-bold text-primary">tCO2e</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full mt-4 overflow-hidden">
                                        <div className="h-full bg-primary w-[85%] rounded-full shadow-[0_0_15px_rgba(22,163,74,0.3)]"></div>
                                    </div>
                                    <p className="text-[10px] text-right text-gray-400 font-bold uppercase mt-2">85% Disponível para compensação</p>
                                </div>

                                <div className="space-y-4 mb-10 pt-10 border-t border-gray-50">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-widest">Preço Sugerido</span>
                                        <span className="text-black font-black">R$ 55,00 <span className="text-[9px] text-gray-400">/ton</span></span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-widest">Taxa de Liquidação</span>
                                        <span className="text-black font-black">0.5%</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => alert('Direcionando para o Gateway de Pagamento Blockchain...')}
                                    className="w-full py-5 bg-black text-white hover:bg-primary rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3"
                                >
                                    <ShoppingCart className="w-5 h-5" /> Adquirir Créditos
                                </button>
                                
                                <p className="text-[9px] text-gray-400 font-bold uppercase text-center mt-6 leading-relaxed px-4">
                                    Ao clicar em Adquirir, você será direcionado para o fluxo de pagamento e emissão do certificado.
                                </p>
                            </div>

                            {/* Trust Entities Summary */}
                            <div className="bg-[#050a06] p-10 rounded-[3rem] text-white">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-8 text-white/40">Selo de Integridade</h4>
                                <div className="space-y-8">
                                    <div className="flex items-center gap-5">
                                        <Building2 className="w-6 h-6 text-primary" />
                                        <div>
                                            <p className="text-[10px] text-white/40 font-bold uppercase">Desenvolvedor</p>
                                            <p className="text-sm font-bold">{project.entities.developer.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <ShieldCheck className="w-6 h-6 text-primary" />
                                        <div>
                                            <p className="text-[10px] text-white/40 font-bold uppercase">Custódia Registral</p>
                                            <p className="text-sm font-bold">SINARCA Registry</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <BadgeCheck className="w-6 h-6 text-primary" />
                                        <div>
                                            <p className="text-[10px] text-white/40 font-bold uppercase">Certificação</p>
                                            <p className="text-sm font-bold">{project.entities.certifier.name} Standard</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
