import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import BrazilNetwork from './assets/brazil-network.png';
import { SinarcaImpactCalculator } from './components/calculator/SinarcaImpactCalculator';
import { PublicMapExperience } from './components/PublicMapExperience';
import NationalMap from './components/maps/NationalMap';
import Header from './components/Header';
import Footer from './components/Footer';
import { database } from './services/database';
import { type ProjectMRCA } from './data/mrca_db';
import { 
  Search, 
  ArrowRight, 
  ArrowUpRight, 
  Map as MapIcon, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  Eye, 
  Share2, 
  Building2, 
  MapPin, 
  BadgeCheck,
  Coins,
  ShoppingCart,
  Wallet,
  Flame,
  ChevronRight,
  Landmark,
  Trees
} from 'lucide-react';

// --- Assets Refined to Match Original Design ---
const IMAGES = {
  hero_bg: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=2544&auto=format&fit=crop", // Misty Forest (Alive)
  security_chip: BrazilNetwork, // Tech Chip / Map
};

type LandingStats = {
  registered: number;
  compensated: number;
  projects: number;
};

const formatTons = (value: number) => `${Math.round(value).toLocaleString('pt-BR')} tCO2e`;

const projectStatusLabel = (status: string) => ({
  ACTIVE: 'Ativo',
  AVAILABLE: 'Disponível',
  AUDITED: 'Auditado',
  RETIRED: 'Compensado',
  SUSPENDED: 'Suspenso',
  BLOCKED_AUDIT_REQUIRED: 'Bloqueado',
  AWAITING_CERTIFICATION: 'Em certificação',
}[status] || status);

// --- Helper Components ---
const Typewriter = ({ words }: { words: string[] }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  // Typing effect
  useEffect(() => {
    if (subIndex === words[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 1000);
      return;
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, Math.max(reverse ? 50 : subIndex === words[index].length ? 1000 : 100, parseInt((Math.random() * 50).toString())));

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words]);

  // Blink cursor
  useEffect(() => {
    const timeout2 = setTimeout(() => {
      setBlink((prev) => !prev);
    }, 500);
    return () => clearTimeout(timeout2);
  }, [blink]);

  return (
    <span className="text-primary">
      {words[index].substring(0, subIndex)}
      <span className={`${blink ? 'opacity-100' : 'opacity-0'} transition-opacity`}>|</span>
    </span>
  );
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [featuredProjects, setFeaturedProjects] = useState<ProjectMRCA[]>([]);
  const [publicDataError, setPublicDataError] = useState('');

  useEffect(() => {
    // Handle hash scroll on mount
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }

  }, []);

  useEffect(() => {
    let active = true;

    const loadPublicData = async () => {
      try {
        const [projects, transactions] = await Promise.all([
          database.getRawMarketProjects(),
          database.getTransactions(),
        ]);
        if (!active) return;

        const registered = projects.reduce((sum, project) => sum + Number(project.metrics?.carbonStock || 0), 0);
        const compensated = transactions
          .filter((transaction) => transaction.type === 'retired')
          .reduce((sum, transaction) => sum + Math.abs(Number(String(transaction.amount).replace(',', '.')) || 0), 0);

        setStats({ registered, compensated, projects: projects.length });
        setFeaturedProjects(projects.slice(0, 3));
        setPublicDataError('');
      } catch (error) {
        if (!active) return;
        setStats(null);
        setFeaturedProjects([]);
        setPublicDataError(error instanceof Error ? error.message : 'API pública indisponível');
      }
    };

    loadPublicData();

    return () => {
      active = false;
    };
  }, []);

  const shareProject = async (project: ProjectMRCA) => {
    const url = `${window.location.origin}/projeto/${encodeURIComponent(project.friendlyId)}`;
    if (navigator.share) {
      await navigator.share({ title: project.name, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
  };

  return (
    <div className="bg-[#050a05] text-white font-sans selection:bg-primary selection:text-white overflow-x-hidden">
      <Header isHome={true} />

      {/* 2. HERO SECTION */}
      <section className="relative pt-40 pb-20 lg:pt-52 lg:pb-32 min-h-screen flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          <img src={IMAGES.hero_bg} className="w-full h-full object-cover opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050a05]/90 via-[#050a05]/40 to-[#050a05]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <div className="mb-8">
            <span className="inline-block py-2 px-8 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-md">
              SISTEMA NACIONAL DE REGISTRO DE CARBONO
            </span>
          </div>

          <h1 className="font-bold text-4xl md:text-7xl lg:text-8xl text-white mb-8 tracking-tighter leading-[0.9] max-w-6xl mx-auto uppercase">
            Ativos Ambientais <br className="hidden md:block" /> <Typewriter words={['VERIFICÁVEIS', 'AUDITÁVEIS', 'IMUTÁVEIS', 'RASTREÁVEIS']} />
          </h1>

          <p className="text-gray-400 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            A infraestrutura nacional definitiva para custódia e transparência absoluta de ativos ambientais brasileiros.
          </p>

          <button
            onClick={() => navigate('/consulta')}
            className="px-12 py-5 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all transform hover:scale-105 flex items-center gap-4 mx-auto shadow-2xl shadow-primary/20"
          >
            <Search className="w-4 h-4" /> Consultar Registros Públicos
          </button>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-32 border-t border-white/5 pt-16 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="text-6xl font-bold text-white mb-2 tracking-tighter">
                {stats ? formatTons(stats.registered) : 'Carregando'}
              </div>
              <div className="text-primary text-[10px] font-bold uppercase tracking-widest mb-1">tCO2e Registrados</div>
              <div className="text-gray-500 text-[10px] uppercase font-bold opacity-60">Dados da API pública</div>
            </div>
            <div className="text-center group border-l-0 md:border-l border-r-0 md:border-r border-white/5">
              <div className="text-6xl font-bold text-white mb-2 tracking-tighter">
                {stats ? formatTons(stats.compensated) : 'Carregando'}
              </div>
              <div className="text-primary text-[10px] font-bold uppercase tracking-widest mb-1">tCO2e Compensados</div>
              <div className="text-gray-500 text-[10px] uppercase font-bold opacity-60">Ledger persistido</div>
            </div>
            <div className="text-center group">
              <div className="text-6xl font-bold text-white mb-2 tracking-tighter">
                {stats ? stats.projects.toLocaleString('pt-BR') : 'Carregando'}
              </div>
              <div className="text-primary text-[10px] font-bold uppercase tracking-widest mb-1">Projetos no Registro</div>
              <div className="text-gray-500 text-[10px] uppercase font-bold opacity-60">Base persistida</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TOOLS SECTION */}
      <section className="py-24 relative bg-[#050a05]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
          {/* Card 1: Mapa */}
          <div onClick={() => navigate('/mapa-brasil')} className="group relative h-[450px] rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-700 cursor-pointer shadow-2xl">
            <div className="absolute inset-0 z-0">
              <img
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop"
                className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-all duration-1000"
                alt="Global Map"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050a05] via-[#050a05]/20 to-transparent"></div>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between p-12">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                <MapIcon className="w-7 h-7 text-primary" />
              </div>

              <div>
                <h3 className="text-4xl font-bold text-white uppercase tracking-tighter mb-4 leading-none">
                  Inteligência <br />Geográfica
                </h3>
                <p className="text-gray-400 text-sm font-medium max-w-sm mb-8">
                  Rastreabilidade completa de zonas de preservação e custódia de ativos em tempo real.
                </p>
                <div className="inline-flex items-center gap-3 text-primary text-[10px] font-bold uppercase tracking-widest">
                  Explorar Mapa Interativo <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Ranking */}
          <div onClick={() => navigate('/rankings')} className="group relative h-[450px] rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-700 cursor-pointer shadow-2xl">
            <div className="absolute inset-0 z-0">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop"
                className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-all duration-1000"
                alt="Impact Ranking"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050a05] via-[#050a05]/20 to-transparent"></div>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between p-12">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>

              <div>
                <h3 className="text-4xl font-bold text-white uppercase tracking-tighter mb-4 leading-none">
                  Liderança de <br />Transparência
                </h3>
                <p className="text-gray-400 text-sm font-medium max-w-sm mb-8">
                  Data-driven insights sobre os principais entes públicos e privados em governança climática.
                </p>
                <div className="inline-flex items-center gap-3 text-primary text-[10px] font-bold uppercase tracking-widest">
                  Ver Rankings de Impacto <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-20">
          <SinarcaImpactCalculator />
        </div>
      </section>

      {/* 4. INTERACTIVE MAP EXPERIENCE */}
      <div id="map-experience">
        <PublicMapExperience />
      </div>

      {/* 5. PUBLIC CONSULTATION SECTION */}
      <section className="py-32 bg-[#050a05] border-t border-white/5" id="explore">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <span className="text-primary text-[10px] font-bold uppercase tracking-widest">Registros Oficiais</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tighter leading-none mb-6">
                Consulta <span className="text-gray-600">Pública</span>
              </h2>
              <p className="text-gray-400 text-lg font-medium leading-relaxed">
                Rastreabilidade absoluta de cada ativo em nossa infraestrutura. Transparência para o mercado e segurança para o planeta.
              </p>
            </div>
            <button
              onClick={() => navigate('/consulta')}
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-3 group"
            >
              Explorar Ativos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {featuredProjects.map((p) => (
              <div key={p.friendlyId} className="group bg-white/5 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all duration-500 overflow-hidden flex flex-col shadow-2xl">
                <div className="h-64 overflow-hidden relative">
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={p.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050a05] via-transparent to-transparent"></div>
                  <div className="absolute top-6 left-6">
                    <span className="bg-primary/20 backdrop-blur-xl border border-primary/30 text-primary text-[9px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                      {projectStatusLabel(p.status)}
                    </span>
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <h4 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{p.name}</h4>
                  <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">
                    <MapPin className="w-3 h-3 text-primary" /> {p.location.city}, {p.location.state}
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8 pt-8 border-t border-white/5">
                    <div>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Volume</p>
                      <p className="text-white font-bold">{formatTons(p.metrics.carbonStock)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Identificador</p>
                      <p className="text-primary font-mono text-[10px] font-bold">{p.friendlyId}</p>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-white/5 flex justify-between gap-4">
                    <button onClick={() => navigate(`/projeto/${p.friendlyId}`)} className="flex-1 py-3 rounded-xl bg-white/5 text-[9px] font-bold uppercase text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" /> Detalhes
                    </button>
                    <button onClick={() => shareProject(p)} className="flex-1 py-3 rounded-xl bg-white/5 text-[9px] font-bold uppercase text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2">
                      <Share2 className="w-4 h-4" /> Compartilhar
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {featuredProjects.length === 0 && (
              <div className="md:col-span-3 rounded-[2.5rem] border border-white/5 bg-white/5 p-10 text-center text-gray-400">
                {publicDataError ? `API pública indisponível: ${publicDataError}` : 'Carregando projetos públicos da API.'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. GOVERNMENT ECOSYSTEM */}
      <section id="government-map" className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="flex flex-col gap-8 order-2 lg:order-1">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Landmark className="w-4 h-4 text-primary" /> Entes Públicos
              </div>
              <h2 className="text-4xl lg:text-7xl font-bold text-black leading-none tracking-tighter uppercase">
                Compensação <br /> <span className="text-primary">Governamental</span>
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed font-medium">
                Estados e Municípios que lideram a transparência climática já orquestram suas compensações no SINARCA. Transforme dados em impacto verificável.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-4">
                <div className="p-10 rounded-[2.5rem] bg-gray-50 border border-gray-100 hover:border-primary/20 transition-all group shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform shadow-sm">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-black font-bold mb-4 uppercase text-xs tracking-widest">Municipal</h4>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed">Gestão de inventário e emissão de créditos em áreas municipais com transparência total.</p>
                </div>
                <div className="p-10 rounded-[2.5rem] bg-gray-50 border border-gray-100 hover:border-primary/20 transition-all group shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform shadow-sm">
                    <Trees className="w-7 h-7" />
                  </div>
                  <h4 className="text-black font-bold mb-4 uppercase text-xs tracking-widest">Estadual</h4>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed">Interligação de ativos ambientais entre estados para liquidação de obrigações NDC.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-10 mt-10 pt-10 border-t border-gray-100">
                <button 
                  onClick={() => navigate('/mapa-nacional')}
                  className="px-12 py-5 bg-black text-white rounded-2xl font-bold hover:bg-primary transition-all flex items-center gap-4 group shadow-2xl"
                >
                  Abrir Mapa Governamental <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="order-1 lg:order-2 relative h-[600px] rounded-[3rem] overflow-hidden border border-gray-100 shadow-2xl bg-gray-50">
              <NationalMap isEmbed={true} />
            </div>
          </div>
        </div>
      </section>

      {/* 7. OPERATIONAL FLOW */}
      <section id="fluxo" className="py-40 px-6 bg-[#050a05] overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-32">
            <h2 className="text-4xl md:text-8xl font-bold text-white uppercase tracking-tighter leading-none mb-10">
              O Ciclo da <br /><span className="text-primary italic">Integridade</span>
            </h2>
            <p className="text-xl text-gray-400 font-medium max-w-3xl mx-auto leading-relaxed">
              Uma jornada rastreável em 7 fases críticas, garantindo que nenhum ativo seja apenas uma promessa digital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { step: "01", title: "Registro", desc: "Demarcação física com tags nos vértices da área.", icon: MapPin },
              { step: "02", title: "Certificação", desc: "Validação técnica de metodologias e potencial.", icon: BadgeCheck },
              { step: "03", title: "Tokenização", desc: "Emissão imutável em infraestrutura DLT.", icon: Coins },
              { step: "04", title: "Auditoria", desc: "Inspeção biométrica e validação de campo.", icon: ShieldCheck },
              { step: "05", title: "Listagem", desc: "Disponibilização para o mercado global.", icon: ShoppingCart },
              { step: "06", title: "Liquidação", desc: "Aquisição transparente por entes responsáveis.", icon: Wallet },
              { step: "07", title: "Resgate", desc: "Queima definitiva para compensação real.", icon: Flame },
            ].map((phase, i) => (
              <div 
                key={i} 
                className="group relative p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-primary/40 transition-all duration-700 hover:scale-105 hover:bg-white/10 cursor-default"
              >
                <div className="text-primary font-bold text-[10px] mb-6 flex items-center gap-3 tracking-widest">
                  {phase.step} <div className="h-px flex-1 bg-primary/20"></div>
                </div>
                <phase.icon className="w-8 h-8 text-gray-500 group-hover:text-primary transition-all duration-500 mb-6 group-hover:scale-110" />
                <h4 className="font-bold text-white uppercase tracking-widest text-[10px] mb-3 group-hover:text-primary transition-colors">{phase.title}</h4>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed group-hover:text-gray-300 transition-colors">{phase.desc}</p>
                
                {i < 6 && (
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 items-center justify-center z-10">
                    <ChevronRight className="w-3 h-3 text-white/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
