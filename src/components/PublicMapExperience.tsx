import React, { useState, useMemo, useEffect } from 'react';
import Brazil from '@svg-maps/brazil';
import { 
    TreePine, 
    ArrowRight, 
    ShieldCheck, 
    MapPin,
    Zap,
    Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { database } from '../services/database';

export const PublicMapExperience: React.FC = () => {
    const navigate = useNavigate();
    const [hoveredProject, setHoveredProject] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await database.getRawMarketProjects();
            setProjects(data.slice(0, 5)); // Just top 5 for the home experience
            setLoading(false);
        };
        load();
    }, []);

    const formatNumber = (num: number) => num.toLocaleString('pt-BR');

    return (
        <section id="map-experience" className="relative py-24 bg-[#000000] overflow-hidden border-y border-white/5">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row gap-16 items-center">
                    
                    {/* Content Side */}
                    <div className="w-full lg:w-2/5 space-y-10">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px]">Infraestrutura de Confiança</span>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-bold font-display uppercase tracking-tighter leading-none text-white">
                                VISUALIZE O <br />
                                <span className="text-primary">IMPACTO</span> <br />
                                EM TEMPO REAL.
                            </h2>
                            <p className="text-gray-300 text-lg font-light leading-relaxed max-w-md">
                                Monitore a integridade de cada ativo ambiental registrado na rede SINARCA. Nossa tecnologia garante transparência absoluta do solo ao ledger.
                            </p>
                        </div>

                        {/* Feature Cards - Optimized for readability */}
                        <div className="space-y-4 pt-4">
                            {[
                                { icon: ShieldCheck, title: "Fé Pública & Auditoria", desc: "Cada ponto no mapa é validado por entidades de terceira parte." },
                                { icon: Zap, title: "Liquidez Imediata", desc: "Ativos prontos para compensação e transação imediata." }
                            ].map((f, i) => (
                                <div key={i} className="flex gap-5 p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all group backdrop-blur-sm">
                                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                                        <f.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-1">{f.title}</h4>
                                        <p className="text-gray-300 text-xs leading-relaxed font-medium">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => navigate('/login')}
                            className="inline-flex items-center gap-4 px-10 py-5 bg-primary text-black font-bold uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:scale-105 transition-all"
                        >
                            Explorar Todos os Registros
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Map Side - High Contrast Design */}
                    <div className="w-full lg:w-3/5 relative group">
                        <div className="aspect-square w-full max-w-2xl mx-auto bg-black/40 rounded-[3rem] border border-white/10 p-12 relative overflow-hidden shadow-2xl">
                            {/* Technical Grid */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,148,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,148,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
                            
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox={Brazil.viewBox}
                                className="w-full h-full"
                            >
                                {Brazil.locations.map((location: any) => (
                                    <path
                                        key={location.id}
                                        d={location.path}
                                        id={location.id}
                                        name={location.name}
                                        className="fill-[#080c08] stroke-white/20 stroke-[0.8px] hover:stroke-primary/50 hover:fill-[#0c140c] transition-all duration-300"
                                        style={{ vectorEffect: 'non-scaling-stroke' }}
                                    />
                                ))}

                                {/* Project Nodes (Glowing Effect like Reference) */}
                                {projects.map((p, i) => (
                                    <g 
                                        key={p.id} 
                                        className="cursor-pointer group/marker"
                                        onMouseEnter={() => setHoveredProject(p)}
                                        onClick={() => navigate('/login')}
                                    >
                                        {/* Outer Glow */}
                                        <circle
                                            cx={p.location.coordinates.svgX}
                                            cy={p.location.coordinates.svgY}
                                            r="8"
                                            className="fill-primary/20 blur-[2px] animate-pulse"
                                        />
                                        {/* Inner Glow Pulse */}
                                        <circle
                                            cx={p.location.coordinates.svgX}
                                            cy={p.location.coordinates.svgY}
                                            r="4"
                                            className="fill-primary transition-all duration-300 group-hover/marker:r-6"
                                        />
                                        {/* Center Point */}
                                        <circle
                                            cx={p.location.coordinates.svgX}
                                            cy={p.location.coordinates.svgY}
                                            r="1.5"
                                            className="fill-white"
                                        />
                                    </g>
                                ))}
                            </svg>

                            {/* Floating Tooltip (Enhanced Contrast) */}
                            {hoveredProject && (
                                <div className="absolute bottom-10 right-10 w-72 bg-[#050a05] border border-primary/40 p-6 rounded-[2rem] animate-in fade-in slide-in-from-bottom-6 duration-300 pointer-events-none">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                                            {hoveredProject.location.bioma}
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <h5 className="text-white font-bold text-lg leading-tight mb-2 uppercase tracking-tighter">{hoveredProject.name}</h5>
                                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-4">Localização: {hoveredProject.location.city}, {hoveredProject.location.stateId}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                                        <div>
                                            <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">Estoque Carbono</p>
                                            <p className="text-white font-mono font-bold text-sm">{formatNumber(hoveredProject.metrics.carbonStock)} <span className="text-[8px] text-gray-500">t</span></p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">Área Total</p>
                                            <p className="text-white font-mono font-bold text-sm">{formatNumber(hoveredProject.metrics.totalAreaHa)} <span className="text-[8px] text-gray-500">ha</span></p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Map Status Indicators */}
                            <div className="absolute top-10 left-10 space-y-2">
                                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                    <span className="text-[9px] font-bold text-white uppercase tracking-[0.2em]">Rede Nacional Ativa</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
