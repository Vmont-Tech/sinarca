import { useState, useMemo, useEffect } from 'react';
import Brazil from '@svg-maps/brazil';
import {
    TreePine,
    Cloud,
    Filter,
    X,
    ChevronDown,
    Crosshair,
    Verified,
    ArrowRight,
    Plus,
    Minus,
    Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProjectMRCA } from '../../data/mrca_db';
import { database } from '../../services/database';

export default function GlobalMap() {
    const navigate = useNavigate();
    const [zoom, setZoom] = useState(1);
    const [hoveredProject, setHoveredProject] = useState<ProjectMRCA | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [searchQuery, setSearchQuery] = useState('');

    // Data State
    const [projects, setProjects] = useState<ProjectMRCA[]>([]);
    const [loading, setLoading] = useState(true);

    // Load Projects via Service
    useEffect(() => {
        const load = async () => {
            // Must fetch RAW data for the map (needs coords and metrics)
            const data = await database.getRawMarketProjects();
            setProjects(data);
            setLoading(false);
        };
        load();
    }, []);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 4));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.8));
    const handleResetZoom = () => setZoom(1);

    const handleMouseMove = (e: React.MouseEvent) => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    // Derived state for filtered projects
    const filteredProjects = useMemo(() => {
        if (!projects) return []; // Safety check
        if (!searchQuery) return projects;
        const lowerQ = searchQuery.toLowerCase();
        return projects.filter(p =>
            p.name.toLowerCase().includes(lowerQ) ||
            p.location.city.toLowerCase().includes(lowerQ) ||
            p.location.state.toLowerCase().includes(lowerQ) ||
            p.location.bioma.toLowerCase().includes(lowerQ) ||
            p.status.toLowerCase().includes(lowerQ) ||
            p.friendlyId.toLowerCase().includes(lowerQ)
        );
    }, [searchQuery, projects]);

    const formatNumber = (num: number) => num.toLocaleString('pt-BR');

    // Helper for Status Color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Verificado': return 'text-emerald-400 bg-emerald-900/50 border-emerald-800';
            case 'Auditado': return 'text-sinarca-neon bg-sinarca-neon/10 border-sinarca-neon/30';
            case 'Em Análise': return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
            default: return 'text-gray-400 bg-gray-800 border-gray-700';
        }
    };

    // Calc totals
    const totalCarbon = useMemo(() => projects.reduce((acc, p) => acc + p.metrics.carbonStock, 0), [projects]);

    return (
        <div className="flex flex-col w-full h-full relative bg-[#0a120a] overflow-hidden min-h-[calc(100vh-64px)]">
            {/* Sidebar / Floating Panel (Left) */}
            <aside className="absolute left-4 top-4 bottom-4 w-[380px] z-20 flex flex-col gap-4 pointer-events-none hidden md:flex">
                {/* Page Title Card */}
                <div className="bg-[#132210]/95 backdrop-blur-md p-6 rounded-xl border border-[#2a3928] shadow-2xl pointer-events-auto flex flex-col gap-4">
                    <div>
                        <h1 className="text-white text-3xl font-serif font-bold leading-tight mb-2">Mapa de Projetos (MRCA)</h1>
                        <p className="text-[#a0ba9c] text-sm font-normal leading-relaxed">
                            Monitore a distribuição de créditos ambientais e projetos de conservação participando do mercado voluntário.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-[#a0ba9c] group-focus-within:text-sinarca-neon transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nome, hash, bioma..."
                            className="block w-full pl-10 pr-3 py-2.5 border border-[#2a3928] rounded-lg leading-5 bg-[#0a120a] text-white placeholder-[#587355] focus:outline-none focus:border-sinarca-neon/50 focus:ring-1 focus:ring-sinarca-neon/50 sm:text-sm transition-all shadow-inner"
                        />
                    </div>
                </div>
                {/* Stats Overview */}
                <div className="grid grid-cols-2 gap-3 pointer-events-auto">
                    <div className="bg-[#1d271b]/90 backdrop-blur-md p-4 rounded-xl border border-[#2a3928]">
                        <div className="flex items-center gap-2 mb-1">
                            <TreePine className="text-sinarca-neon w-5 h-5" />
                            <span className="text-[#a0ba9c] text-xs uppercase font-semibold tracking-wider">Projetos Ativos</span>
                        </div>
                        <p className="text-white text-2xl font-bold">{loading ? '-' : projects.length}</p>
                        <p className="text-sinarca-neon text-xs font-medium">Mercado Voluntário</p>
                    </div>
                    <div className="bg-[#1d271b]/90 backdrop-blur-md p-4 rounded-xl border border-[#2a3928]">
                        <div className="flex items-center gap-2 mb-1">
                            <Cloud className="text-sinarca-neon w-5 h-5" />
                            <span className="text-[#a0ba9c] text-xs uppercase font-semibold tracking-wider">tCO2e</span>
                        </div>
                        <p className="text-white text-2xl font-bold">{loading ? '-' : (totalCarbon / 1000000).toFixed(1) + 'M'}</p>
                        <p className="text-sinarca-neon text-xs font-medium">Disponível</p>
                    </div>
                </div>
                {/* Scrollable Filters & Project List */}
                <div className="flex-1 bg-[#132210]/95 backdrop-blur-md rounded-xl border border-[#2a3928] shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
                    <div className="p-4 border-b border-[#2a3928] flex items-center justify-between">
                        <h3 className="text-white font-serif font-semibold text-lg">Consultar Projetos</h3>
                        <button className="text-sinarca-neon hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Filter className="w-4 h-4" />
                            Filtros
                        </button>
                    </div>
                    {/* Active Filters Chips */}
                    <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-[#2a3928]/50">
                        <button className="flex h-7 shrink-0 items-center justify-center gap-x-2 rounded-full bg-sinarca-neon/10 border border-sinarca-neon/30 pl-3 pr-2 hover:bg-sinarca-neon/20 transition-colors">
                            <p className="text-sinarca-neon text-xs font-medium">Bioma: Todos</p>
                            <X className="text-sinarca-neon w-3 h-3" />
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sinarca-neon"></div>
                            </div>
                        ) : filteredProjects.length > 0 ? (
                            filteredProjects.map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => navigate(`/painel/mrca/${project.friendlyId || project.id}`)}
                                    onMouseEnter={() => setHoveredProject(project)}
                                    className="p-3 rounded-lg bg-[#1d271b] hover:bg-[#2a3928] border border-transparent hover:border-sinarca-neon/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="text-white font-bold text-sm group-hover:text-sinarca-neon transition-colors">{project.name}</h4>
                                            <span className="text-xs text-[#a0ba9c] block mt-0.5">{project.location.city}, {project.location.stateId.toUpperCase()}</span>
                                            <span className="text-[10px] text-sinarca-neon/80 font-mono block leading-none mt-1">{project.friendlyId}</span>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-3">
                                        <div>
                                            <p className="text-[10px] text-[#a0ba9c] uppercase">Área (ha)</p>
                                            <p className="text-white text-xs font-mono">{formatNumber(project.metrics.totalAreaHa)}</p>
                                        </div>
                                        <div className="h-6 w-px bg-[#2a3928]"></div>
                                        <div>
                                            <p className="text-[10px] text-[#a0ba9c] uppercase">Créditos</p>
                                            <p className={`text-xs font-mono font-bold ${project.metrics.carbonStock > 0 ? 'text-sinarca-neon' : 'text-gray-500'}`}>
                                                {project.metrics.carbonStock > 0 ? formatNumber(project.metrics.carbonStock) : '--'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-[#a0ba9c] text-xs">
                                Nenhum projeto encontrado.
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Map Area */}
            <div className="flex-1 h-full w-full relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[#0a120a] group flex items-center justify-center">
                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(42,57,40,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(42,57,40,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                <div
                    className="w-full max-w-4xl transition-transform duration-300 ease-out cursor-move active:cursor-grabbing"
                    style={{ transform: `scale(${zoom})` }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox={Brazil.viewBox}
                        className="w-full h-full drop-shadow-2xl"
                    >
                        {/* Render Brazil States (Neutral Background) */}
                        {Brazil.locations.map((location: any) => (
                            <path
                                key={location.id}
                                d={location.path}
                                id={location.id}
                                name={location.name}
                                className="fill-[#080c08] stroke-white/10 stroke-[0.8px] hover:stroke-primary/50 hover:fill-[#0c140c] transition-all duration-300"
                                style={{ vectorEffect: 'non-scaling-stroke' }}
                            />
                        ))}

                        {/* Render Project Markers */}
                        {!loading && filteredProjects.map(project => (
                            <g
                                key={project.id}
                                className="cursor-pointer group/marker"
                                onClick={() => navigate(`/painel/mrca/${project.friendlyId || project.id}`)}
                                onMouseEnter={(e) => {
                                    setHoveredProject(project);
                                    handleMouseMove(e as any);
                                }}
                                onMouseMove={(e) => handleMouseMove(e as any)}
                            >
                                {/* Marker Pulse Effect */}
                                <circle
                                    cx={project.location.coordinates.svgX}
                                    cy={project.location.coordinates.svgY}
                                    r="8"
                                    className="fill-sinarca-neon/30 animate-ping opacity-0 group-hover/marker:opacity-100 transition-opacity"
                                />
                                {/* Marker Core */}
                                <circle
                                    cx={project.location.coordinates.svgX}
                                    cy={project.location.coordinates.svgY}
                                    r="2.5"
                                    className={`fill-primary drop-shadow-[0_0_8px_#00ff94] transition-all duration-300 ${hoveredProject?.id === project.id ? 'r-4 fill-white' : ''}`}
                                />
                            </g>
                        ))}
                    </svg>
                </div>

                {/* Map Controls (Zoom) */}
                <div className="absolute right-6 bottom-8 flex flex-col gap-2 z-20">
                    <div className="bg-[#1d271b] border border-[#2a3928] rounded-lg overflow-hidden shadow-lg flex flex-col">
                        <button onClick={handleZoomIn} className="w-10 h-10 flex items-center justify-center text-white hover:bg-[#2a3928] hover:text-sinarca-neon transition-colors border-b border-[#2a3928]/50">
                            <Plus className="w-5 h-5" />
                        </button>
                        <button onClick={handleResetZoom} className="w-10 h-10 flex items-center justify-center text-white hover:bg-[#2a3928] hover:text-sinarca-neon transition-colors border-b border-[#2a3928]/50">
                            <Crosshair className="w-4 h-4" />
                        </button>
                        <button onClick={handleZoomOut} className="w-10 h-10 flex items-center justify-center text-white hover:bg-[#2a3928] hover:text-sinarca-neon transition-colors">
                            <Minus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Interactive Tooltip (Project) */}
                {hoveredProject && (
                    <div
                        className="fixed z-50 pointer-events-auto w-72 bg-[#132210] border border-sinarca-neon/40 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            left: Math.min(tooltipPos.x + 20, window.innerWidth - 300),
                            top: Math.min(tooltipPos.y - 100, window.innerHeight - 300)
                        }}
                    >
                        <div className="bg-sinarca-neon/10 px-4 py-3 border-b border-[#2a3928] flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sinarca-neon flex items-center gap-1.5">
                                <TreePine className="w-3 h-3" />
                                {hoveredProject.location.bioma}
                            </span>
                            {hoveredProject.status === 'Verificado' && <Verified className="text-sinarca-neon w-4 h-4" />}
                        </div>
                        <div className="p-4">
                            <h4 className="text-white font-serif font-bold text-lg leading-tight mb-1">{hoveredProject.name}</h4>
                            <p className="text-[#a0ba9c] text-xs mb-4 line-clamp-3">{hoveredProject.description}</p>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-[#1d271b] p-2.5 rounded-lg border border-[#2a3928]">
                                    <p className="text-[10px] text-[#a0ba9c] uppercase font-bold">Estoque</p>
                                    <p className="text-white font-mono font-bold text-sm">
                                        {hoveredProject.metrics.carbonStock > 0 ? formatNumber(hoveredProject.metrics.carbonStock) : '--'}
                                        <span className="text-[9px] text-[#a0ba9c] font-normal ml-1">tCO2e</span>
                                    </p>
                                </div>
                                <div className="bg-[#1d271b] p-2.5 rounded-lg border border-[#2a3928]">
                                    <p className="text-[10px] text-[#a0ba9c] uppercase font-bold">Área</p>
                                    <p className="text-white font-mono font-bold text-sm">
                                        {formatNumber(hoveredProject.metrics.totalAreaHa)}
                                        <span className="text-[9px] text-[#a0ba9c] font-normal ml-1">ha</span>
                                    </p>
                                </div>
                            </div>

                            <div className="bg-sinarca-deep/50 p-2 rounded mb-3 border border-sinarca-border/30">
                                <p className="text-[9px] text-text-muted uppercase font-bold mb-1">Hash ID</p>
                                <p className="text-[10px] text-sinarca-neon font-mono truncate">{hoveredProject.id}</p>
                            </div>

                            <button
                                onClick={() => navigate(`/painel/mrca/${hoveredProject.friendlyId || hoveredProject.id}`)}
                                className="w-full flex items-center justify-center gap-2 bg-sinarca-neon hover:bg-[#32c418] text-[#0a120a] font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider shadow-lg shadow-sinarca-neon/20 transition-colors"
                            >
                                Ver Detalhes
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Status Bar */}
            <footer className="bg-[#132210] border-t border-[#2a3928] px-6 py-2 flex justify-between items-center text-xs text-[#a0ba9c] z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="block w-2 h-2 rounded-full bg-sinarca-neon animate-pulse"></span>
                        Sistema Operacional
                    </span>
                    <span>Última atualização: 14:05 UTC-3</span>
                </div>
                <div className="flex gap-4">
                    <a className="hover:text-white cursor-pointer">Termos de Uso</a>
                    <a className="hover:text-white cursor-pointer">Política de Privacidade</a>
                    <span>© 2024 SINARCA</span>
                </div>
            </footer>
        </div>
    );
}
