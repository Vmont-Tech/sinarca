import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';
import LogoLight from '../assets/sinarca-logo-recortado.svg';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    TreePine,
    ShieldCheck,
    Calculator,
    BadgeDollarSign,
    Search,
    History,
    Map,
    Globe,
    User,
    LogOut,
    Bell,
    ChevronDown,
    Menu,
    FileText,
    BarChart3,
    Settings,
    Store
} from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, label, active, theme }: { to: string, icon: any, label: string, active?: boolean, theme: 'dark' | 'light' }) => {
    return (
        <Link
            to={to}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative ${active
                    ? theme === 'dark' 
                        ? 'bg-white/10 text-white border border-white/5 shadow-lg' 
                        : 'bg-gray-50 text-black border border-gray-100 shadow-sm'
                    : theme === 'dark'
                        ? 'text-white/60 hover:bg-white/5 hover:text-white'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                }`}
        >
            {active && theme === 'light' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full"></div>
            )}
            <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-primary' : ''}`} />
            <span className={`text-sm font-bold uppercase tracking-wider ${active ? 'text-black' : ''}`}>{label}</span>
        </Link>
    );
};

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isProducer = user?.role === 'producer' || user?.role === 'admin';
    const isCompany = user?.role === 'company';
    const isAuditor = user?.role === 'auditor';

    const sidebarTheme = isProducer ? 'dark' : 'light';
    const sidebarBg = isProducer ? 'bg-[#051f14]' : 'bg-white';
    
    // Breadcrumb logic
    const getBreadcrumb = () => {
        const path = location.pathname;
        if (path.includes('calculadora')) return 'Calculadora de Emissões';
        if (path.includes('certificadora')) return 'Gestão de Projetos';
        if (path.includes('auditoria')) return 'Fila de Auditoria';
        if (path.includes('mapa')) return 'Inteligência Geográfica';
        if (path.includes('transacoes')) return 'Ledger de Rastreabilidade';
        return 'Visão Geral';
    };

    return (
        <div className="flex min-h-screen w-full bg-[#f8faf8] font-sans overflow-hidden">
            
            {/* Sidebar Desktop */}
            <aside className={`sticky top-0 h-screen w-72 flex flex-col border-r border-gray-200 ${sidebarBg} hidden lg:flex z-50 transition-colors duration-500`}>
                <div className="flex flex-col h-full p-8">
                    {/* Header Logo */}
                    <div className="flex items-center gap-4 mb-12">
                        <img src={sidebarTheme === 'dark' ? Logo : LogoLight} alt="Sinarca" className="w-10 h-10 object-contain" />
                        <div>
                            <h1 className={`text-2xl font-bold tracking-tighter leading-none ${sidebarTheme === 'dark' ? 'text-white' : 'text-black'}`}>SINARCA</h1>
                            <p className={`text-[8px] font-bold uppercase tracking-[0.1em] mt-1 ${sidebarTheme === 'dark' ? 'text-white/40' : 'text-gray-600'}`}>
                                Onde ativos ambientais se tornam verificáveis
                            </p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-col gap-2 flex-1">
                        <SidebarItem 
                            to="/painel" 
                            icon={LayoutDashboard} 
                            label="Dashboard" 
                            active={location.pathname === '/painel' || location.pathname === '/painel/visao-geral'} 
                            theme={sidebarTheme}
                        />

                        {isProducer && (
                            <>
                                <SidebarItem to="/painel/certificadora" icon={TreePine} label="Meus Projetos" active={location.pathname === '/painel/certificadora'} theme={sidebarTheme} />
                                <SidebarItem to="/painel/monitoramento" icon={ShieldCheck} label="Certificações" active={location.pathname === '/painel/monitoramento'} theme={sidebarTheme} />
                                <SidebarItem to="/painel/relatorios" icon={BarChart3} label="Relatórios" active={location.pathname === '/painel/relatorios'} theme={sidebarTheme} />
                            </>
                        )}

                        {isCompany && (
                            <>
                                <SidebarItem to="/painel/projetos" icon={Store} label="Marketplace" active={location.pathname === '/painel/projetos'} theme={sidebarTheme} />
                                <SidebarItem to="/painel/calculadora" icon={Calculator} label="Meus Créditos" active={location.pathname === '/painel/calculadora'} theme={sidebarTheme} />
                                <SidebarItem to="/painel/inventario" icon={FileText} label="Inventário" active={location.pathname === '/painel/inventario'} theme={sidebarTheme} />
                                <SidebarItem to="/painel/aposentar" icon={BadgeDollarSign} label="Compensações" active={location.pathname === '/painel/aposentar'} theme={sidebarTheme} />
                            </>
                        )}

                        {isAuditor && (
                            <>
                                <SidebarItem to="/painel/auditoria" icon={ShieldCheck} label="Fila de Auditoria" active={location.pathname === '/painel/auditoria'} theme={sidebarTheme} />
                                <SidebarItem to="/painel/monitoramento" icon={Globe} label="Geo-Monitoramento" active={location.pathname === '/painel/monitoramento'} theme={sidebarTheme} />
                            </>
                        )}

                        <div className={`my-4 border-t ${sidebarTheme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}></div>

                        <SidebarItem to="/painel/transacoes" icon={History} label="Rastreabilidade" active={location.pathname === '/painel/transacoes'} theme={sidebarTheme} />
                        <SidebarItem to="/painel/configuracoes" icon={Settings} label="Configurações" active={location.pathname === '/painel/configuracoes'} theme={sidebarTheme} />
                    </nav>

                    {/* Footer Card (Institutional) */}
                    <div className={`mt-auto p-6 rounded-3xl ${sidebarTheme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'} relative overflow-hidden group`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${sidebarTheme === 'dark' ? 'bg-primary' : 'bg-primary/40'}`}></div>
                        <p className={`text-[10px] leading-relaxed italic ${sidebarTheme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                            "Promovendo um futuro sustentável através de transparência, crédito de carbono e conservação."
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Desktop TopBar */}
                <header className="h-24 bg-white border-b border-gray-200 px-10 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest">{getBreadcrumb()}</h2>
                    </div>

                    <div className="flex items-center gap-8">
                        <button className="relative p-2 text-gray-400 hover:text-black transition-colors">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="flex items-center gap-4 pl-8 border-l border-gray-100">
                            <div className="text-right">
                                <p className="text-sm font-bold text-black leading-none mb-1">{user?.name || 'Usuário'}</p>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                                    {isProducer ? 'Produtor / Certificador' : isAuditor ? 'Auditor de Impacto' : 'Empresa Compradora'}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
                                <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=00ff94&color=fff`} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-10">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
