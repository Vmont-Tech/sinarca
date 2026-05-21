import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Eye,
    AlertTriangle,
    Share2,
    Clock,
    ExternalLink,
    CheckCircle,
    Activity,
    User,
    Award
} from 'lucide-react';

interface MRCAItemProps {
    data: {
        id: string;
        projectId?: string;
        type: string;
        status: string;
        institution: { name: string; cnpj: string };
        quantity: number;
        unit: string;
        period: string;
        project: {
            name: string;
            location: string;
            methodology: string;
            methodology_link?: string;
            baseline?: string;
            version?: string;
            image?: string;
            description?: string;
            lifecycleStatus?: string;
        };
        chain: {
            emitter: { name: string };
            auditor?: { name: string; level?: string };
            compensator?: { name: string };
        };
        timestamp: string;
    };
}

export const MRCAItem: React.FC<MRCAItemProps> = ({ data }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isPublic = location.pathname.startsWith('/public') || location.pathname === '/' || location.pathname === '/landing';

    // 1. Fallback Image State
    const [imgError, setImgError] = useState(false);
    const [showTechnical, setShowTechnical] = useState(false); // UX: Technical Toggle

    const AUDITOR_DISCLAIMER = "Certificação de Terceira Parte: As validações e laudos técnicos apresentados são de " +
        "responsabilidade exclusiva das entidades auditoras credenciadas, conforme a legislação ambiental vigente e " +
        "os padrões metodológicos internacionais citados. O SINARCA atua como infraestrutura de registro imutável.";

    const handleClick = () => {
        const targetId = data.projectId || 'PRC-2024-882';
        if (isPublic) {
            navigate(`/public/projeto/${targetId}`);
        } else {
            navigate(`/painel/mrca/${targetId}`);
        }
    };

    const handleAction = (action: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const targetId = data.projectId || 'PRC-2024-882';
        if (isPublic) {
            navigate('/login', { state: { from: `/painel/${action}/${targetId}` } });
        } else {
            navigate(`/painel/${action}/${targetId}`);
        }
    };

    // Helper: Specific status message for the "Last Info" field
    const getEventDescription = () => {
        if (data.type === 'novo') return `Novo projeto registrado em ${data.project.location}, focado em preservação e créditos de carbono.`;
        if (data.type === 'compensado') return `Compensação voluntária realizada pela empresa, neutralizando emissões do período ${data.period}.`;
        if (data.type === 'anomalia') return `Alerta de possível irregularidade detectada via satélite. Requer atenção imediata.`;
        return `Evento registrado na blockchain referente a ${data.project.methodology}.`;
    };

    const hasImage = !!data.project.image || imgError;
    const displayImage = imgError ? 'https://images.unsplash.com/photo-1542601906990-b4d3fb7d5afa' : data.project.image;

    return (
        <div
            onClick={handleClick}
            className="group bg-[#002B1C] border border-[#004D33] rounded-2xl overflow-hidden hover:border-[#00FF94] transition-all duration-300 cursor-pointer shadow-xl mb-8 relative"
        >
            {/* Image Header - Reduced Gradient Opacity */}
            {hasImage && displayImage && (
                <div className="relative h-64 w-full overflow-hidden">
                    <img
                        src={displayImage}
                        alt="Project Cover"
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Gradient reduced to 40% height max, and lighter */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#002B1C] via-transparent to-transparent opacity-90" />

                    <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        {data.project.location}
                    </div>
                </div>
            )}

            <div className="p-8 relative -mt-10 z-10">

                {/* 1. Header: Badges & Title */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${data.type === 'anomalia' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-sinarca-neon/10 text-sinarca-neon border-sinarca-neon/20'
                            }`}>
                            {(data.project.lifecycleStatus || data.status).replace(/✅|⏳|🆕|⚠️|🛡️/g, '').trim()}
                        </span>
                        <span className="text-xs text-[#8AA695] font-mono uppercase tracking-widest">• {data.type.toUpperCase()}</span>
                    </div>

                    <div>
                        <h2 className="text-3xl lg:text-4xl font-display font-bold text-white leading-tight mb-2 group-hover:text-sinarca-neon transition-colors">
                            {data.project.name}
                        </h2>
                        {/* 2. DESCRIPTION (Mandatory per user request) */}
                        <p className="text-white/80 text-sm leading-relaxed max-w-3xl mb-4">
                            {data.project.description || "Projeto de conservação e restauração ambiental, focado na geração de ativos de biodiversidade e créditos de carbono verificados."}
                        </p>

                        {/* 3. LATEST STATUS / EVENT INFO (Highlighted Field) */}
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded bg-[#00FF94]/5 border border-[#00FF94]/20">
                            <Clock className="w-3 h-3 text-sinarca-neon" />
                            <span className="text-[10px] uppercase font-bold text-[#8AA695] tracking-wider">Último Evento:</span>
                            <span className="text-xs text-sinarca-neon font-medium truncate max-w-md">
                                {getEventDescription()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Main Metrics Grid (Volume, Owner, Certifier) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-y border-[#004D33] mb-6">
                    {/* Volume Highlight */}
                    <div className="bg-[#003D28]/50 rounded-xl p-4 border border-[#004D33] flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-widest text-[#8AA695] font-bold mb-1">VOLUME GERADO</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-display font-bold text-white tracking-tight">
                                {data.quantity.toLocaleString()}
                            </span>
                            <span className="text-sm font-bold text-sinarca-neon">{data.unit}</span>
                        </div>
                    </div>

                    {/* Owner */}
                    <div className="flex items-center gap-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-[#00FF94]/10 flex items-center justify-center text-[#00FF94]">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#8AA695] font-bold mb-1">PROPRIETÁRIO / ENTIDADE</p>
                            <p className="text-white font-bold text-sm truncate">{data.institution.name}</p>
                            <p className="text-xs text-[#8AA695]">{data.institution.cnpj}</p>
                        </div>
                    </div>

                    {/* Certifier */}
                    <div className="flex items-center gap-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#8AA695] font-bold mb-1">CERTIFICADORA / REGISTRO</p>
                            <p className="text-white font-bold text-sm">Verra / SINARCA</p>
                            <p className="text-xs text-[#8AA695]">{data.project.methodology}</p>
                        </div>
                    </div>
                </div>

                {/* 5. TECHNICAL VIEW EXPANDER (Governance & Compliance) */}
                {showTechnical && (
                    <div className="bg-black/40 border border-[#004D33] rounded-xl p-6 mb-6 animate-in fade-in slide-in-from-top-2">
                        <h4 className="flex items-center gap-2 text-sinarca-neon text-xs font-bold uppercase tracking-widest mb-4">
                            <Activity className="w-3 h-3" /> Especificações Técnicas & Governança
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <p className="text-[10px] uppercase text-[#8AA695] font-bold mb-1">Versão do Projeto</p>
                                <p className="text-white font-mono text-xs border border-[#004D33] bg-[#002B1C] px-2 py-1 rounded w-fit">
                                    {data.project.version || 'v1.0 (Genesis)'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-[#8AA695] font-bold mb-1">Baseline de Referência</p>
                                <p className="text-white text-xs leading-relaxed">
                                    {data.project.baseline || 'Baseline definido conforme metodologia aplicada (ver docs).'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-[#8AA695] font-bold mb-1">Metodologia Aplicada</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-white text-xs font-bold">{data.project.methodology}</span>
                                    {data.project.methodology_link && (
                                        <a href={data.project.methodology_link} target="_blank" rel="noreferrer" className="text-[10px] text-sinarca-neon hover:underline flex items-center gap-1">
                                            Doc Oficial <ExternalLink className="w-2 h-2" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Legal Disclaimer */}
                        <div className="bg-[#002B1C] p-3 rounded border border-white/5">
                            <p className="text-[9px] text-gray-500 leading-normal text-justify">
                                <span className="font-bold text-gray-400">⚖️ Termo de Responsabilidade:</span> {AUDITOR_DISCLAIMER}
                            </p>
                        </div>
                    </div>
                )}

                {/* 3. Footer: Hash & Actions */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Hash */}
                    <div className="flex flex-col w-full md:w-auto">
                        <p className="text-[10px] uppercase tracking-widest text-[#8AA695] font-bold mb-1 flex items-center gap-2">
                            HASH IMUTÁVEL
                            <CheckCircle className="w-3 h-3 text-sinarca-neon" />
                        </p>
                        <a href={`https://allo.info/tx/${data.id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-xs font-mono text-sinarca-neon hover:text-white transition-colors bg-[#000]/30 px-3 py-1.5 rounded border border-white/5 hover:border-sinarca-neon/50">
                            {data.id.substring(0, 24)}...
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={handleClick}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003D28] hover:bg-[#004D33] rounded-lg text-xs font-bold text-white uppercase tracking-wider transition-colors border border-transparent hover:border-sinarca-neon/30">
                            <Eye className="w-4 h-4 text-[#8AA695]" />
                            <Eye className="w-4 h-4 text-[#8AA695]" />
                            Detalhes
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowTechnical(!showTechnical); }}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border ${showTechnical ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-[#002B1C] text-sinarca-neon border-sinarca-neon/30 hover:bg-[#003D28]'}`}>
                            <Activity className="w-4 h-4" />
                            {showTechnical ? 'Ocultar Tec.' : 'Visão Técnica'}
                        </button>
                        <button
                            onClick={(e) => handleAction('denunciar', e)}
                            className="p-2.5 bg-[#003D28] hover:bg-red-900/20 rounded-lg text-[#8AA695] hover:text-red-400 border border-transparent hover:border-red-500/30 transition-colors" title="Denunciar">
                            <AlertTriangle className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => handleAction('compartilhar', e)}
                            className="p-2.5 bg-[#003D28] hover:bg-[#004D33] rounded-lg text-[#8AA695] hover:text-white border border-transparent hover:border-white/20 transition-colors" title="Compartilhar">
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => handleAction('historico', e)}
                            className="p-2.5 bg-[#003D28] hover:bg-[#004D33] rounded-lg text-[#8AA695] hover:text-white border border-transparent hover:border-white/20 transition-colors" title="Histórico">
                            <Clock className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
