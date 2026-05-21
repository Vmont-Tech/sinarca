import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../assets/logo.png';

interface HeaderProps {
    isHome?: boolean;
}

export default function Header({ isHome = false }: HeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Active state helper
    const isActive = (path: string) => location.pathname === path;

    const navLinkClass = (path: string) => `
        text-[10px] font-bold uppercase tracking-widest transition-all duration-300
        ${isActive(path) ? 'text-primary' : 'text-gray-400 hover:text-primary'}
    `;

    return (
        <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${
            (isHome && !scrolled) ? 'bg-transparent py-8' : 'bg-background/95 backdrop-blur-xl border-b border-white/5 py-4 shadow-2xl'
        }`}>
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
                    <img src={Logo} className="w-12 h-12 object-contain" alt="Sinarca Logo" />
                    <div className="flex flex-col">
                        <span className="font-display font-bold text-xl text-white tracking-[0.2em] leading-none">SINARCA</span>
                        <span className="text-[7px] text-primary font-bold uppercase tracking-[0.1em] mt-1.5">Onde ativos ambientais se tornam verificáveis</span>
                    </div>
                </div>

                <nav className="hidden lg:flex items-center gap-8">
                    <button onClick={() => navigate('/public/feed')} className={navLinkClass('/public/feed')}>Rastreabilidade</button>
                    <button onClick={() => navigate('/public/consulta')} className={navLinkClass('/public/consulta')}>Projetos Disponíveis</button>
                    <button onClick={() => navigate('/public/mapa-nacional')} className={navLinkClass('/public/mapa-nacional')}>Ecossistema Gov</button>
                    <button onClick={() => navigate('/public/mapa-brasil')} className={navLinkClass('/public/mapa-brasil')}>Mapa Brasil</button>
                    <button onClick={() => navigate('/public/rankings')} className={navLinkClass('/public/rankings')}>Ranking de Impacto</button>
                    <button onClick={() => navigate('/public/sobre')} className={navLinkClass('/public/sobre')}>Sobre o SINARCA</button>
                </nav>

                <div className="flex items-center gap-4">
                    {user ? (
                        <button 
                            onClick={() => navigate('/painel')} 
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary hover:text-black transition-all text-[10px] font-bold uppercase tracking-wider group"
                        >
                            <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">dashboard</span>
                            Acessar Painel
                        </button>
                    ) : (
                        <button 
                            onClick={() => navigate('/login')} 
                            className="flex items-center gap-3 px-6 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-primary hover:text-black hover:border-primary transition-all text-[10px] font-bold uppercase tracking-wider shadow-lg group"
                        >
                            <span className="material-symbols-outlined text-sm text-primary group-hover:text-black">lock</span>
                            Acessar Painel
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
