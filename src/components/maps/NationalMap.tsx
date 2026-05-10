import { useState, useEffect } from 'react';
import Brazil from '@svg-maps/brazil';
import {
    Map as MapIcon,
    Info,
    ChevronRight,
    Search,
    Plus,
    Minus,
    Maximize,
    Wifi,
    AlertTriangle,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Using strict InventoryItem type
import type { InventoryItem } from '../../data/mrca_db';
import { database } from '../../services/database';

// Type definition for SVG Map Location
interface MapLocation {
    id: string;
    name: string;
    path: string;
}

interface NationalMapProps {
    isEmbed?: boolean;
}

export default function NationalMap({ isEmbed = false }: NationalMapProps) {
    const navigate = useNavigate();
    const [zoom, setZoom] = useState(1);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [hoveredState, setHoveredState] = useState<InventoryItem | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Fetch Inventory Data (Public Account)
    useEffect(() => {
        const loadData = async () => {
            const data = await database.getInventoryData();
            setInventory(data);
        };
        loadData();
    }, []);

    // Helper to find data by map ID
    const getInventoryByMapId = (mapId: string) => {
        return inventory.find(i => i.id.toLowerCase() === mapId.toLowerCase());
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.8));
    const handleResetZoom = () => setZoom(1);

    // Helpers
    const formatNumber = (num: number) => new Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(num);

    // Color logic (Heatmap Style) - Clean Institutional
    const getStateStyles = (item?: InventoryItem) => {
        if (!item) return "fill-gray-50 stroke-gray-200";

        if (item.status === 'SURPLUS') return "fill-primary/20 text-primary stroke-primary/30";
        if (item.status === 'BALANCED') return "fill-gray-100 text-gray-400 stroke-gray-200";
        if (item.status === 'DEFICIT') return "fill-orange-50 text-orange-500 stroke-orange-200";

        return "fill-gray-50 stroke-gray-200";
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div className={`flex flex-col w-full h-full relative bg-white overflow-hidden ${isEmbed ? 'rounded-3xl border border-gray-100 shadow-sm' : 'rounded-xl'}`}>

            {/* Top Bar - Only if not embed */}
            {!isEmbed && (
                <div className="absolute top-0 left-0 right-0 z-30 p-8 flex flex-col md:flex-row justify-between items-start pointer-events-none gap-6">
                    <div className="bg-white/90 backdrop-blur-md px-8 py-6 rounded-3xl border border-gray-100 shadow-xl pointer-events-auto">
                        <h1 className="text-black font-bold text-xl uppercase tracking-tighter flex items-center gap-3">
                            <MapIcon className="w-6 h-6 text-primary" />
                            Mapa Nacional de Ativos
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                <Wifi className="w-3 h-3 text-primary" />
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Sincronizado Blockchain</span>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-gray-100 shadow-xl pointer-events-auto">
                        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest block mb-3 text-center">Status de Conformidade</span>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary/20 border border-primary/30"></div><span className="text-[10px] font-bold text-black uppercase">Superávit</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-200"></div><span className="text-[10px] font-bold text-black uppercase">Equilibrado</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-50 border border-orange-200"></div><span className="text-[10px] font-bold text-black uppercase">Déficit</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Container */}
            <div className={`flex-1 w-full h-full relative overflow-hidden bg-white cursor-move active:cursor-grabbing flex items-center justify-center`}>
                {/* Subtle Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

                <div
                    className="w-full max-w-4xl transition-transform duration-500 ease-out"
                    style={{ transform: `scale(${zoom})` }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox={Brazil.viewBox}
                        className="w-full h-full"
                    >
                        {Brazil.locations.map((location: MapLocation) => {
                            const data = getInventoryByMapId(location.id);
                            const styles = getStateStyles(data);
                            const fillClass = styles.split(' ')[0]; 
                            const isHovered = hoveredState?.id === data?.id; 

                            return (
                                <path
                                    key={location.id}
                                    d={location.path}
                                    id={location.id}
                                    name={location.name}
                                    className={`
                                        ${fillClass} 
                                        stroke-white stroke-[1px] 
                                        transition-all duration-300 
                                        hover:brightness-95 hover:stroke-primary hover:stroke-[2px]
                                        ${isHovered ? 'brightness-90 z-10' : ''}
                                    `}
                                    onMouseEnter={(e) => {
                                        if (data) setHoveredState(data);
                                        handleMouseMove(e);
                                    }}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={() => setHoveredState(null)}
                                    style={{ vectorEffect: 'non-scaling-stroke' }}
                                />
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* Tooltip */}
            {hoveredState && (
                <div
                    className="fixed z-50 pointer-events-none flex flex-col p-6 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[2rem] shadow-2xl min-w-[280px] animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        left: Math.min(tooltipPos.x + 24, window.innerWidth - 300),
                        top: Math.min(tooltipPos.y + 24, window.innerHeight - 250)
                    }}
                >
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-50">
                        <div>
                            <span className="text-black font-black text-lg tracking-tight block">{hoveredState.name}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{hoveredState.uf} • Brasil</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Remoções Totais</span>
                            <span className="text-black font-black text-sm">{formatNumber(hoveredState.localContributions?.estimatedRemovals || 0)} <span className="text-[9px] text-gray-400">tCO2e</span></span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Ativos Registrados</span>
                            <span className="text-primary font-black text-sm">{hoveredState.localContributions?.registeredProjectsCount || 0}</span>
                        </div>
                    </div>

                    <div className={`mt-6 pt-4 border-t border-gray-50 flex items-center gap-2 ${hoveredState.status === 'DEFICIT' ? 'text-orange-500' : 'text-primary'}`}>
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Conformidade Verificada</span>
                    </div>
                </div>
            )}

            {/* Zoom Controls */}
            <div className={`absolute right-8 bottom-8 flex flex-col gap-2 z-20`}>
                <button onClick={handleZoomIn} className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-black hover:bg-gray-50 shadow-lg transition-all"><Plus className="w-5 h-5" /></button>
                <button onClick={handleResetZoom} className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-black hover:bg-gray-50 shadow-lg transition-all"><Maximize className="w-4 h-4" /></button>
                <button onClick={handleZoomOut} className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-black hover:bg-gray-50 shadow-lg transition-all"><Minus className="w-5 h-5" /></button>
            </div>

            {/* Bottom Panel - Only if not embed */}
            {!isEmbed && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-between items-center z-40">
                    <div className="flex items-center gap-3 text-gray-400">
                        <Info className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Visualização técnica de ativos ambientais por região administrativa.</span>
                    </div>
                </div>
            )}

        </div>
    );
}
