import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    Globe,
    Scale,
    Cpu,
    Fingerprint,
    Database,
    Zap
} from 'lucide-react';

export default function Institutional() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-12 p-4 md:p-12 max-w-[1440px] mx-auto w-full animate-in fade-in duration-700 text-white font-sans">

            {/* Breadcrumb & Title */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                    <span onClick={() => navigate('/painel')} className="hover:text-secondary cursor-pointer transition-colors">Painel de Gestão</span>
                    <span className="text-white/10">/</span>
                    <span className="text-secondary">Institucional</span>
                </div>
                <h1 className="text-4xl md:text-7xl font-display font-bold text-white uppercase tracking-tighter leading-none">
                    Quem Somos & <br />
                    <span className="text-secondary italic">O Que Fazemos</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-4xl leading-relaxed font-light">
                    O SINARCA (Sistema Nacional de Rastreabilidade de Créditos Ambientais) é a infraestrutura tecnológica padrão para soberania, segurança e transparência no mercado de ativos ambientais do Brasil.
                </p>
            </div>

            {/* Intro Text Box */}
            <div className="p-8 md:p-12 rounded-[2.5rem] bg-white/5 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Globe className="w-64 h-64" />
                </div>
                <div className="max-w-4xl relative z-10">
                    <h2 className="text-2xl font-display font-bold text-white uppercase tracking-widest mb-6">A Camada de Confiança Extra</h2>
                    <p className="text-gray-400 leading-relaxed mb-6">
                        O SINARCA nasceu da necessidade urgente de trazer soberania ao mercado de créditos de carbono. 
                        <strong> É crucial ressaltar que o SINARCA atua como uma camada de segurança extra e complementar, sem substituir as metodologias de validação e mensuração de créditos já existentes no mercado.</strong>
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                        Atuamos como o elo confiável entre produtores rurais, certificadoras, auditores, empresas e cidadãos, transformando a promessa de conservação em um ativo tangível, imutável e auditável através de tecnologia de ponta.
                    </p>
                </div>
            </div>

            {/* What we do - Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-10 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 group hover:border-secondary/30 transition-all">
                    <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mb-8 border border-secondary/20 text-secondary">
                        <Cpu className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-white uppercase mb-4">O Que Fazemos</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                        Fornecemos um sistema robusto e à prova de fraudes para a rastreabilidade física e digital. 
                        Validamos e protegemos o trabalho de todos os participantes do ecossistema.
                    </p>
                    <ul className="space-y-4">
                        {[
                            "Conexão de Produtores e Certificadoras",
                            "Empoderamento de Auditores com Biometria",
                            "Facilitação de Compensação Transparente",
                            "Combate Ativo a Fraudes e Greenwashing"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <Zap className="w-3 h-3 text-secondary" /> {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="p-10 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 group hover:border-primary/30 transition-all">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 border border-primary/20 text-primary">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-white uppercase mb-4">Como Fazemos</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                        Utilizamos uma combinação de tecnologias de infraestrutura crítica para criar um sistema de rastreabilidade sem precedentes.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                            <h4 className="text-white text-xs font-bold mb-1">QTAGs (NFC DNA)</h4>
                            <p className="text-[10px] text-gray-500 uppercase">Âncora física irrefutável</p>
                        </div>
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                            <h4 className="text-white text-xs font-bold mb-1">IA & Satélite</h4>
                            <p className="text-[10px] text-gray-500 uppercase">Cercas virtuais Sentinel-2</p>
                        </div>
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                            <h4 className="text-white text-xs font-bold mb-1">Blockchain & DLT</h4>
                            <p className="text-[10px] text-gray-500 uppercase">Imutabilidade via Smart Contracts</p>
                        </div>
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                            <h4 className="text-white text-xs font-bold mb-1">NIST PQC-2024</h4>
                            <p className="text-[10px] text-gray-500 uppercase">Segurança Pós-Quântica</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mission/Vision/Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                    <h4 className="text-secondary font-bold uppercase tracking-[0.3em] text-xs">Nossa Missão</h4>
                    <p className="text-sm text-gray-400 leading-relaxed italic">
                        "Trazer soberania, segurança e transparência absoluta ao mercado de créditos ambientais, garantindo a soberania e evitando dupla contagem."
                    </p>
                </div>
                <div className="space-y-4">
                    <h4 className="text-secondary font-bold uppercase tracking-[0.3em] text-xs">Nossa Visão</h4>
                    <p className="text-sm text-gray-400 leading-relaxed italic">
                        "Ser a infraestrutura padrão global para a rastreabilidade física e digital de ativos ambientais, reconhecida pela sua integridade."
                    </p>
                </div>
                <div className="space-y-4">
                    <h4 className="text-secondary font-bold uppercase tracking-[0.3em] text-xs">Nossos Valores</h4>
                    <div className="flex flex-wrap gap-2">
                        {["Integridade", "Inovação", "Soberania", "Transparência Radical", "Impacto Real"].map((v, i) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500 uppercase">{v}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-12">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-secondary font-bold uppercase text-xs mb-4">Atores: Produtores</h3>
                    <p className="text-[11px] text-gray-500 mb-4">Responsáveis pela manutenção física e preservação da área certificada.</p>
                    <ul className="text-[10px] space-y-2 text-gray-600 font-mono">
                        <li>• Demarcação via Tags QTAG</li>
                        <li>• Acesso garantido para auditores</li>
                        <li>• Responsabilidade civil via CPF/CNPJ</li>
                    </ul>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-primary font-bold uppercase text-xs mb-4">Atores: Certificadoras</h3>
                    <p className="text-[11px] text-gray-500 mb-4">Entidades técnicas que aplicam metodologias internacionais (VCS, Gold Standard).</p>
                    <ul className="text-[10px] space-y-2 text-gray-600 font-mono">
                        <li>• Cálculo de potencial de crédito</li>
                        <li>• Validação documental</li>
                        <li>• Emissão de certificados técnicos</li>
                    </ul>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-white font-bold uppercase text-xs mb-4">Atores: Auditores</h3>
                    <p className="text-[11px] text-gray-500 mb-4">Verificadores de campo que garantem a integridade física dos ativos.</p>
                    <ul className="text-[10px] space-y-2 text-gray-600 font-mono">
                        <li>• Inspeção presencial geolocalizada</li>
                        <li>• Validação biométrica de campo</li>
                        <li>• Relatório de conformidade imutável</li>
                    </ul>
                </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 mb-12">
                <h2 className="text-xl font-display font-bold text-white uppercase mb-4">Ciclo de Vida: Do Mint ao Burn</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <span className="text-primary font-bold text-[9px] block mb-2 uppercase">01. Emissão (Mint)</span>
                        <p className="text-[10px] text-gray-600">Criação do token bloqueado vinculado ao baseline de satélite.</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <span className="text-primary font-bold text-[9px] block mb-2 uppercase">02. Validação</span>
                        <p className="text-[10px] text-gray-600">Desbloqueio on-chain após auditoria física bem-sucedida.</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <span className="text-primary font-bold text-[9px] block mb-2 uppercase">03. Custódia</span>
                        <p className="text-[10px] text-gray-600">Comercialização transparente com rastreabilidade total.</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <span className="text-primary font-bold text-[9px] block mb-2 uppercase">04. Aposentadoria (Burn)</span>
                        <p className="text-[10px] text-gray-600">Queima definitiva para compensação, gerando certificado.</p>
                    </div>
                </div>
            </div>

            {/* Public Links CTA */}
            <div className="mt-8 pt-12 border-t border-white/5 flex flex-wrap gap-6 items-center justify-between">
                <div className="flex gap-8">
                    <button onClick={() => navigate('/termos')} className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Termos de Uso</button>
                    <button onClick={() => navigate('/privacidade')} className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Privacidade</button>
                    <button onClick={() => navigate('/compliance')} className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Compliance</button>
                </div>
                <button onClick={() => navigate('/dados')} className="px-6 py-3 bg-secondary text-black font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white transition-all shadow-[0_0_20px_rgba(129,199,132,0.2)]">
                    Ver Governança de Dados
                </button>
            </div>
        </div>
    );
}
