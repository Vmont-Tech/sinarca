import { useNavigate } from 'react-router-dom';
import Logo from '../../assets/logo.png';

export default function AboutSinarca() {
    const navigate = useNavigate();

    return (
        <div className="bg-[#050a05] min-h-screen text-white pb-20">
            {/* Hero Section */}
            <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img 
                        src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop" 
                        className="w-full h-full object-cover opacity-60"
                        alt="Nature"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050a05]"></div>
                </div>

                <div className="relative z-10 text-center px-6">
                    <h1 className="text-5xl md:text-7xl font-display font-bold uppercase tracking-tighter mb-4">
                        Nossa <span className="text-primary italic">História</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light">
                        Orquestrando a integridade ambiental através de tecnologia de ponta e transparência absoluta.
                    </p>
                </div>
            </section>

            {/* Content Section */}
            <section className="max-w-4xl mx-auto px-6 space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-white uppercase mb-6">O Propósito</h2>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            O SINARCA nasceu da necessidade urgente de combater o "greenwashing" e a falta de rastreabilidade no mercado de ativos ambientais. 
                            Nossa missão é criar um ledger público inviolável que conecte a realidade física da floresta com a liquidação digital de obrigações climáticas.
                        </p>
                    </div>
                    <div className="aspect-square flex items-center justify-center">
                        <img src={Logo} className="w-full h-full object-contain" alt="Sinarca Logo" />
                    </div>
                </div>

                <div className="border-l-2 border-primary/30 pl-12 space-y-12">
                    <div className="relative">
                        <div className="absolute -left-[53px] top-0 w-2 h-2 rounded-full bg-primary"></div>
                        <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-4">2024: A Gênese</h3>
                        <p className="text-gray-400 leading-relaxed">
                            Desenvolvimento do protocolo core de rastreabilidade física (QTAG) e integração com satélites de monitoramento em tempo real.
                        </p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-[53px] top-0 w-2 h-2 rounded-full bg-primary"></div>
                        <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-4">2025: Expansão Nacional</h3>
                        <p className="text-gray-400 leading-relaxed">
                            Lançamento do Mapa Nacional de Emissões e parcerias com Municípios para gestão de áreas de preservação permanente.
                        </p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-[53px] top-0 w-2 h-2 rounded-full bg-primary"></div>
                        <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-4">2026: Software Orchestrator</h3>
                        <p className="text-gray-400 leading-relaxed">
                            Consolidação como a camada de inteligência e transparência que orquestra a interação entre certificadoras, auditores e o mercado global.
                        </p>
                    </div>
                </div>

                {/* Mission, Vision, Values */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12">
                    <div className="space-y-4">
                        <h4 className="text-primary font-bold uppercase tracking-[0.3em] text-xs">Nossa Missão</h4>
                        <p className="text-sm text-gray-400 leading-relaxed italic">
                            "Trazer soberania, segurança e transparência absoluta ao mercado de créditos ambientais, garantindo a integridade e evitando dupla contagem."
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-primary font-bold uppercase tracking-[0.3em] text-xs">Nossa Visão</h4>
                        <p className="text-sm text-gray-400 leading-relaxed italic">
                            "Ser a infraestrutura padrão global para a rastreabilidade física e digital de ativos ambientais, reconhecida pela sua integridade."
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-primary font-bold uppercase tracking-[0.3em] text-xs">Nossos Valores</h4>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {["Integridade", "Inovação", "Soberania", "Transparência Radical", "Impacto Real"].map((v, i) => (
                                <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-primary uppercase tracking-widest">{v}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-20 text-center">
                    <h2 className="text-3xl font-display font-bold text-white uppercase mb-12">Nossos Pilares</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 bg-white/5 border border-white/5 rounded-3xl">
                            <span className="material-symbols-outlined text-4xl text-primary mb-4">security</span>
                            <h4 className="font-bold uppercase text-sm mb-2">Segurança</h4>
                            <p className="text-xs text-gray-500">Criptografia pós-quântica e imutabilidade on-chain.</p>
                        </div>
                        <div className="p-8 bg-white/5 border border-white/5 rounded-3xl">
                            <span className="material-symbols-outlined text-4xl text-primary mb-4">visibility</span>
                            <h4 className="font-bold uppercase text-sm mb-2">Transparência</h4>
                            <p className="text-xs text-gray-500">Auditoria pública e acesso democrático aos dados de emissões.</p>
                        </div>
                        <div className="p-8 bg-white/5 border border-white/5 rounded-3xl">
                            <span className="material-symbols-outlined text-4xl text-primary mb-4">hub</span>
                            <h4 className="font-bold uppercase text-sm mb-2">Conectividade</h4>
                            <p className="text-xs text-gray-500">Interligação global de ativos e metas climáticas.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-24 flex flex-col items-center gap-8">
                    <h2 className="text-3xl font-display font-bold text-white uppercase text-center">Pronto para fazer parte?</h2>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => navigate('/rankings')}
                            className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white hover:text-black transition-all uppercase text-xs tracking-widest"
                        >
                            Ver Ranking de Impacto
                        </button>
                        <button 
                            onClick={() => navigate('/login')}
                            className="px-8 py-4 bg-primary text-black rounded-xl font-bold hover:bg-white transition-all uppercase text-xs tracking-widest"
                        >
                            Acessar Painel
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
