import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../assets/logo.png';
import HeroBg from '../assets/login_hero.png';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { database } from '../services/database';

// Componente para seleção de Role
const RoleBtn = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: string }) => (
    <button 
        onClick={onClick}
        type="button"
        className={`flex flex-col items-center justify-center p-6 rounded-3xl border transition-all gap-3 ${active ? 'bg-white border-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)] scale-105' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10'}`}
    >
        <span className="material-symbols-outlined text-2xl">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
);

const REGISTRATION_PROFILE_CONFIG: Record<Exclude<UserRole, 'admin'>, {
    title: string;
    summary: string;
    nameLabel: string;
    documentLabel: string;
    organizationLabel: string;
    emailLabel: string;
    phoneLabel: string;
    namePlaceholder: string;
    documentPlaceholder: string;
    organizationPlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
}> = {
    producer: {
        title: 'Produtor',
        summary: 'Informe o responsável, a propriedade ou organização produtora e os contatos para originar projetos ambientais.',
        nameLabel: 'Responsável',
        documentLabel: 'CPF/CNPJ rural',
        organizationLabel: 'Propriedade / organização produtora',
        emailLabel: 'E-mail do produtor',
        phoneLabel: 'Telefone do responsável',
        namePlaceholder: 'Nome do responsável',
        documentPlaceholder: 'CPF, CNPJ ou CAF',
        organizationPlaceholder: 'Fazenda, associação ou cooperativa',
        emailPlaceholder: 'produtor@organizacao.com',
        phonePlaceholder: '+55 63 99999-0000',
    },
    auditor: {
        title: 'Auditor',
        summary: 'Cadastre o auditor responsável pela verificação técnica, laudos e evidências de campo.',
        nameLabel: 'Nome do auditor',
        documentLabel: 'CPF ou registro profissional',
        organizationLabel: 'Empresa de auditoria',
        emailLabel: 'E-mail profissional',
        phoneLabel: 'Telefone profissional',
        namePlaceholder: 'Nome completo',
        documentPlaceholder: 'CPF ou registro',
        organizationPlaceholder: 'Consultoria ou auditoria independente',
        emailPlaceholder: 'auditor@empresa.com',
        phonePlaceholder: '+55 11 99999-0000',
    },
    company: {
        title: 'Empresa',
        summary: 'Informe os dados da empresa compradora para inventário, compra e compensação de créditos.',
        nameLabel: 'Responsável corporativo',
        documentLabel: 'CNPJ',
        organizationLabel: 'Razão social',
        emailLabel: 'E-mail corporativo',
        phoneLabel: 'Telefone corporativo',
        namePlaceholder: 'Nome do responsável',
        documentPlaceholder: '00.000.000/0001-00',
        organizationPlaceholder: 'Empresa Compradora Ltda',
        emailPlaceholder: 'compras@empresa.com',
        phonePlaceholder: '+55 11 99999-0000',
    },
    certifier: {
        title: 'Certificadora',
        summary: 'Cadastre a certificadora responsável por metodologia, aprovação técnica e emissão do ativo.',
        nameLabel: 'Responsável técnico',
        documentLabel: 'CNPJ da certificadora',
        organizationLabel: 'Certificadora',
        emailLabel: 'E-mail institucional',
        phoneLabel: 'Telefone institucional',
        namePlaceholder: 'Nome do responsável',
        documentPlaceholder: '00.000.000/0001-00',
        organizationPlaceholder: 'Certificadora Ambiental Ltda',
        emailPlaceholder: 'certificacao@empresa.com',
        phonePlaceholder: '+55 11 99999-0000',
    },
};

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register } = useAuth();
    const from = location.state?.from || '/painel';

    const [scrolled, setScrolled] = useState(false);
    const [publicStats, setPublicStats] = useState<{ registered: number; projects: number } | null>(null);
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Registration State
    const [regName, setRegName] = useState('');
    const [regDoc, setRegDoc] = useState(''); // CPF/CNPJ
    const [regOrganization, setRegOrganization] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regCorpEmail, setRegCorpEmail] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regConfirmPass, setRegConfirmPass] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    // UI State
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<Exclude<UserRole, 'admin'>>('producer');
    const registrationProfile = REGISTRATION_PROFILE_CONFIG[role];

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        let active = true;
        const loadPublicStats = async () => {
            try {
                const projects = await database.getRawMarketProjects();
                if (!active) return;
                setPublicStats({
                    registered: projects.reduce((sum, project) => sum + Number(project.metrics?.carbonStock || 0), 0),
                    projects: projects.length,
                });
            } catch {
                if (active) setPublicStats(null);
            }
        };
        loadPublicStats();
        return () => {
            active = false;
        };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password, role);
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (regPass !== regConfirmPass) {
            setError('As senhas digitadas não conferem.');
            return;
        }
        if (!regName.trim() || !regDoc.trim() || !regOrganization.trim() || !regPhone.trim() || !regCorpEmail.trim()) {
            setError(`Complete os dados obrigatórios do perfil ${registrationProfile.title}.`);
            return;
        }
        if (!regCorpEmail.includes('@')) {
            setError('Informe um e-mail válido para o cadastro.');
            return;
        }
        if (regPass.length < 8) {
            setError('A senha deve ter no mínimo 8 caracteres.');
            return;
        }
        if (!termsAccepted) {
            setError('É necessário aceitar os Termos de Uso.');
            return;
        }

        setLoading(true);
        try {
            await register({
                name: regName,
                document: regDoc,
                organization: regOrganization,
                phone: regPhone,
                email: regCorpEmail,
                password: regPass,
                role: role
            });
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar cadastro.');
        } finally {
            setLoading(false);
        }
    };

    const goToPublicPage = (path: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        navigate(path);
    };

    return (
        <div className="bg-[#050a05] font-sans min-h-screen flex flex-col text-white selection:bg-emerald-500/30">
            <style>{`
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: #050a05; }
                ::-webkit-scrollbar-thumb { background: #1a2e22; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #233b2e; }
            `}</style>
            
            {/* Header */}
            <header className={`fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between border-b transition-all duration-300 ${scrolled ? 'bg-[#050a05]/95 backdrop-blur-md border-white/5' : 'bg-transparent border-transparent'}`}>
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
                    <img src={Logo} alt="SINARCA Logo" className="h-8 w-auto object-contain" />
                    <h2 className="text-white text-lg font-bold tracking-tight uppercase">SINARCA</h2>
                </div>
                <button 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                >
                    Retornar ao Site
                </button>
            </header>

            <main className="flex-grow flex flex-col lg:flex-row">
                {/* Left: Branding & Role Intro */}
                <div className="hidden lg:flex w-1/2 flex-col justify-center px-24 bg-gradient-to-br from-[#050a05] to-[#0a1a10] border-r border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <img src={HeroBg} className="w-full h-full object-cover grayscale" alt="" />
                    </div>
                    
                    <div className="relative z-10 space-y-12">
                        <div className="space-y-4">
                            <span className="text-emerald-500 font-bold uppercase tracking-[0.3em] text-[10px]">Infraestrutura de Integridade</span>
                            <h1 className="text-6xl font-bold font-display uppercase tracking-tighter leading-none">
                                Rastreabilidade <br />
                                <span className="text-emerald-500">Sem Fronteiras.</span>
                            </h1>
                            <p className="text-gray-400 text-lg font-light leading-relaxed max-w-md">
                                O SINARCA unifica os atores do mercado ambiental sob um único protocolo de confiança e fé pública.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 py-12 border-y border-white/5">
                            <div>
                                <span className="block text-4xl font-bold text-white font-display">{publicStats ? Math.round(publicStats.registered).toLocaleString('pt-BR') : '...'}</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">tCO2e Registrados</span>
                            </div>
                            <div>
                                <span className="block text-4xl font-bold text-white font-display">{publicStats ? publicStats.projects.toLocaleString('pt-BR') : '...'}</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Projetos Ativos</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Forms */}
                <div className="flex-grow flex items-center justify-center p-6 lg:p-12 mt-20 lg:mt-0">
                    <div className="w-full max-w-[480px] space-y-10">
                        
                        {/* Role Selector Card */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Selecione seu Perfil de Acesso</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <RoleBtn 
                                    active={role === 'producer'} 
                                    onClick={() => setRole('producer')} 
                                    label="Produtor" 
                                    icon="nature"
                                />
                                <RoleBtn 
                                    active={role === 'auditor'} 
                                    onClick={() => setRole('auditor')} 
                                    label="Auditor" 
                                    icon="gavel"
                                />
                                <RoleBtn 
                                    active={role === 'company'} 
                                    onClick={() => setRole('company')} 
                                    label="Empresa" 
                                    icon="business"
                                />
                                <RoleBtn
                                    active={role === 'certifier'}
                                    onClick={() => setRole('certifier')}
                                    label="Certificadora"
                                    icon="verified"
                                />
                            </div>
                        </div>

                        <div className="bg-[#0a0f0a] border border-white/5 rounded-[2rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
                            {/* Form Header */}
                            <div className="flex justify-between items-center border-b border-white/5 pb-6">
                                <div className="flex gap-8">
                                    <button 
                                        onClick={() => setActiveTab('login')}
                                        className={`text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'login' ? 'text-white' : 'text-gray-600 hover:text-white'}`}
                                    >
                                        Acessar
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('register')}
                                        className={`text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'register' ? 'text-white' : 'text-gray-600 hover:text-white'}`}
                                    >
                                        Cadastrar
                                    </button>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div role="alert" aria-live="polite" className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-bold text-red-500 uppercase tracking-widest">
                                    {error}
                                </div>
                            )}

                            {/* Login Form */}
                            {activeTab === 'login' && (
                                <form className="space-y-6" onSubmit={handleLogin}>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Credenciais</label>
                                        <input 
                                            type="text" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            autoComplete="username"
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-emerald-500/30 transition-all" 
                                            placeholder="E-mail ou Documento" 
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Senha</label>
                                        </div>
                                        <input 
                                            type="password" 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="current-password"
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-emerald-500/30 transition-all" 
                                            placeholder="••••••••" 
                                            disabled={loading}
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-50"
                                    >
                                        {loading ? "Processando..." : "Entrar no Portal"}
                                    </button>

                                </form>
                            )}

                            {/* Register Form */}
                            {activeTab === 'register' && (
                                <form className="space-y-6" onSubmit={handleRegister}>
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                                            Dados do perfil {registrationProfile.title}
                                        </p>
                                        <p className="mt-2 text-xs leading-relaxed text-gray-400">
                                            {registrationProfile.summary}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{registrationProfile.nameLabel}</label>
                                            <input 
                                            type="text" 
                                            value={regName}
                                            onChange={(e) => setRegName(e.target.value)}
                                            autoComplete="name"
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none" 
                                            placeholder={registrationProfile.namePlaceholder}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{registrationProfile.documentLabel}</label>
                                            <input 
                                            type="text" 
                                            value={regDoc}
                                            onChange={(e) => setRegDoc(e.target.value)}
                                            autoComplete="off"
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none" 
                                            placeholder={registrationProfile.documentPlaceholder}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{registrationProfile.organizationLabel}</label>
                                            <input
                                                type="text"
                                                value={regOrganization}
                                                onChange={(e) => setRegOrganization(e.target.value)}
                                                autoComplete="organization"
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none"
                                                placeholder={registrationProfile.organizationPlaceholder}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{registrationProfile.phoneLabel}</label>
                                            <input
                                                type="tel"
                                                value={regPhone}
                                                onChange={(e) => setRegPhone(e.target.value)}
                                                autoComplete="tel"
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none"
                                                placeholder={registrationProfile.phonePlaceholder}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{registrationProfile.emailLabel}</label>
                                        <input 
                                            type="email" 
                                            value={regCorpEmail}
                                            onChange={(e) => setRegCorpEmail(e.target.value)}
                                            autoComplete="email"
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none" 
                                            placeholder={registrationProfile.emailPlaceholder}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Senha</label>
                                            <input 
                                                type="password" 
                                                value={regPass}
                                                onChange={(e) => setRegPass(e.target.value)}
                                                autoComplete="new-password"
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none" 
                                                placeholder="Mín 8 chars"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Confirmar</label>
                                            <input 
                                                type="password" 
                                                value={regConfirmPass}
                                                onChange={(e) => setRegConfirmPass(e.target.value)}
                                                autoComplete="new-password"
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none" 
                                                placeholder="Mín 8 chars"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <input 
                                            type="checkbox" 
                                            checked={termsAccepted}
                                            onChange={(e) => setTermsAccepted(e.target.checked)}
                                            className="mt-1 bg-white/5 border-white/5"
                                        />
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                            Li e concordo com os <button type="button" onClick={goToPublicPage('/termos')} className="text-emerald-500 hover:underline">Termos</button> e <button type="button" onClick={goToPublicPage('/privacidade')} className="text-emerald-500 hover:underline">Políticas</button> do SINARCA.
                                        </p>
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="w-full bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-emerald-500 hover:text-black transition-all"
                                    >
                                        Criar minha Conta
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Natural Footer */}
                        <div className="text-[#9cba9c]/60 text-[10px] text-center uppercase tracking-widest">
                             <div className="flex items-center justify-center gap-6 mb-4">
                                <button onClick={() => navigate('/termos')} className="hover:text-white transition-colors">Termos de Uso</button>
                                <span className="size-1 rounded-full bg-[#3b543b]"></span>
                                <button onClick={() => navigate('/privacidade')} className="hover:text-white transition-colors">Política de Privacidade</button>
                            </div>
                             <p>© {new Date().getFullYear()} SINARCA. Todos os direitos reservados.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Login;
