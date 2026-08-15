import { useNavigate } from 'react-router-dom';
import LogoLight from '../assets/sinarca-logo-recortado.svg';
import { Globe, Mail, ShieldCheck } from 'lucide-react';
import { PUBLIC_CONTACT_EMAIL } from '../constants/publicContact';

export default function Footer() {
    const navigate = useNavigate();

    return (
        <footer className="bg-white border-t border-gray-100 pt-20 pb-10 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-4 mb-8">
                            <img src={LogoLight} className="w-10 h-10 object-contain" alt="Logo" />
                            <span className="font-bold text-lg text-black tracking-tighter">SINARCA</span>
                        </div>
                        <p className="text-gray-600 text-sm max-w-sm leading-relaxed mb-8 font-medium">
                            Onde ativos ambientais se tornam verificáveis. 
                            Tecnologia a serviço da integridade planetária e transparência absoluta.
                        </p>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => navigate('/sobre')} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:text-primary transition-all" aria-label="Sobre o SINARCA">
                                <Globe className="w-5 h-5" />
                            </button>
                            <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:text-primary transition-all" aria-label="Enviar e-mail para o SINARCA">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-black font-bold uppercase text-[10px] tracking-widest mb-6">Plataforma</h4>
                        <ul className="space-y-4">
                            <li><button onClick={() => navigate('/consulta')} className="text-gray-600 hover:text-primary text-xs font-bold uppercase tracking-widest transition-colors">Projetos</button></li>
                            <li><button onClick={() => navigate('/mapa-brasil')} className="text-gray-600 hover:text-primary text-xs font-bold uppercase tracking-widest transition-colors">Mapa de Ativos</button></li>
                            <li><button onClick={() => navigate('/feed')} className="text-gray-600 hover:text-primary text-xs font-bold uppercase tracking-widest transition-colors">Transparência</button></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-black font-bold uppercase text-[10px] tracking-widest mb-6">Institucional</h4>
                        <ul className="space-y-4">
                            <li><button onClick={() => navigate('/sobre')} className="text-gray-600 hover:text-primary text-xs font-bold uppercase tracking-widest transition-colors">Sobre Nós</button></li>
                            <li><button onClick={() => navigate('/termos')} className="text-gray-600 hover:text-primary text-xs font-bold uppercase tracking-widest transition-colors">Termos Legais</button></li>
                            <li><button onClick={() => navigate('/compliance')} className="text-gray-600 hover:text-primary text-xs font-bold uppercase tracking-widest transition-colors">Compliance</button></li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-gray-50 gap-4">
                    <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">
                        © {new Date().getFullYear()} SINARCA — Sistema Nacional de Registro de Carbono
                    </p>
                    <div className="flex items-center gap-6">
                        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-primary" />
                            Camada tecnológica complementar
                        </span>
                        <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="text-[9px] text-gray-600 font-bold uppercase tracking-widest hover:text-primary transition-colors">
                            {PUBLIC_CONTACT_EMAIL}
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
