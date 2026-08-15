import { ArrowUpRight, ShieldCheck, UserCheck, MapPin } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ProjectLifecycleTimeline } from './ProjectLifecycleTimeline';

interface ProjectCardMRCAProps {
    data: any;
    compact?: boolean;
}

export function ProjectCardMRCA({ data, compact = false }: ProjectCardMRCAProps) {
    const location = useLocation();
    const isPublic = !location.pathname.startsWith('/painel');
    const projectPath = isPublic ? '/projeto' : '/painel/mrca';
    const lifecycle = data.lifecycle || data.project?.lifecycle || data.raw?.lifecycle || [];
    const currentLifecycleStage = data.currentLifecycleStage || data.project?.currentLifecycleStage || data.raw?.currentLifecycleStage;
    const isAvailable = data.status.includes('Ativo') || data.status.includes('Disponível');
    
    return (
        <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden hover:shadow-xl transition-all duration-500 group flex flex-col h-full shadow-sm">
            {/* Image Header */}
            <div className="relative h-52 overflow-hidden">
                <img
                    src={data.project.image || `https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80`}
                    alt={data.project.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-gray-200 flex items-center gap-2 shadow-sm">
                    <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-primary animate-pulse' : 'bg-gray-400'}`}></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black">{data.status}</span>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-8 flex-1 flex flex-col">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-black tracking-tight leading-tight group-hover:text-primary transition-colors">{data.project.name}</h3>
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-2 font-medium">
                        <MapPin className="w-3.5 h-3.5" /> {data.project.location}
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Volume</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-black">{data.quantity.toLocaleString()}</span>
                            <span className="text-[9px] text-gray-500 font-bold">tCO2e</span>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-1">Vintage</p>
                        <span className="text-sm font-bold text-black">{data.period}</span>
                    </div>
                </div>

                <ProjectLifecycleTimeline stages={lifecycle} currentStage={currentLifecycleStage} variant="compact" />

                {/* Chain Entities */}
                {!compact && (
                    <div className="space-y-3 mb-8 pt-6 border-t border-gray-50">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Certificadora</span>
                            <span className="text-xs font-bold text-black">{data.chain.emitter.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-2"><UserCheck className="w-3.5 h-3.5" /> Auditoria</span>
                            <span className="text-xs font-bold text-black">{data.chain.auditor.name}</span>
                        </div>
                    </div>
                )}

                {/* Footer Action */}
                <div className="mt-auto flex flex-col gap-3">
                    <Link
                        to={`${projectPath}/${data.friendlyId || data.id}`}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white hover:bg-black py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                    >
                        Adquirir Créditos <ArrowUpRight className="w-4 h-4" />
                    </Link>
                    <Link
                        to={`${projectPath}/${data.friendlyId || data.id}`}
                        className="w-full flex items-center justify-center gap-2 border border-gray-100 text-gray-400 hover:text-black py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                        Análise Técnica
                    </Link>
                </div>
            </div>
        </div>
    );
}
