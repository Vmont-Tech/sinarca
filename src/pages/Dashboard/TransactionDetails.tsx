import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    CheckCircle,
    Box,
    ArrowRight,
    ShieldCheck,
    FileText,
    Clock,
    Database,
    Network,
    ArrowLeft,
    Copy,
    Share2
} from 'lucide-react';

export default function TransactionDetails() {
    const { hash } = useParams();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    // Mock details based on hash type or default
    // In a real app, we would fetchByHash(hash)
    const txType = hash?.includes('mint') ? 'MINT' :
        hash?.includes('burn') ? 'BURN' :
            hash?.includes('audit') ? 'AUDIT' : 'TRANSFER';

    const handleCopy = () => {
        if (hash) navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#050a06] text-white p-4 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-4xl">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Explorer
                </button>

                <div className="bg-[#0a140d] border border-sinarca-border rounded-xl overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="p-8 border-b border-sinarca-border bg-gradient-to-r from-sinarca-deep to-[#0a140d]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h1 className="text-2xl font-bold font-serif flex items-center gap-3">
                                <Box className="text-sinarca-neon" />
                                Detalhes da Transação
                            </h1>
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800 text-sm font-bold uppercase tracking-wider">
                                <CheckCircle className="w-4 h-4" /> Confirmada
                            </span>
                        </div>
                        <div className="mt-6 flex items-center gap-2 p-3 bg-[#050a06] rounded-lg border border-sinarca-border/50 font-mono text-sm md:text-base text-gray-300 break-all">
                            {hash}
                            <button onClick={handleCopy} className="ml-auto text-text-muted hover:text-white shrink-0 p-2">
                                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-8 space-y-8">
                        {/* Status Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs uppercase text-text-muted font-bold tracking-wider">Status</p>
                                <p className="text-white font-medium flex items-center gap-2">Successo</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs uppercase text-text-muted font-bold tracking-wider">Bloco</p>
                                <p className="text-sinarca-neon font-mono font-bold flex items-center gap-2">
                                    <Box className="w-4 h-4" /> #21,940,292
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs uppercase text-text-muted font-bold tracking-wider">Timestamp</p>
                                <p className="text-white font-mono flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" /> 12 mins ago
                                </p>
                            </div>
                        </div>

                        <div className="h-px bg-sinarca-border/50"></div>

                        {/* Event Specifics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <Database className="w-5 h-5 text-sinarca-neon" /> Ação On-Chain
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                            <FileText className="text-blue-400 w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-muted">Tipo de Operação</p>
                                            <p className="text-lg font-bold text-white">{txType === 'MINT' ? 'Emissão de Ativo (Mint)' : txType === 'BURN' ? 'Aposentadoria de Crédito' : 'Transferência'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                            <Network className="text-purple-400 w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-muted">Contrato Inteligente</p>
                                            <p className="text-base font-mono text-sinarca-neon hover:underline cursor-pointer">0x71C...9A21</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <ArrowRight className="w-5 h-5 text-sinarca-neon" /> Fluxo de Ativos
                                </h3>
                                <div className="bg-[#121f16] border border-sinarca-border rounded-xl p-6 relative">
                                    {/* Arrow Line */}
                                    <div className="absolute left-9 top-14 bottom-14 w-0.5 bg-gradient-to-b from-sinarca-neon/0 via-sinarca-neon/50 to-sinarca-neon/0"></div>

                                    <div className="flex items-center gap-4 mb-6 relative z-10">
                                        <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold text-gray-400">DE</span>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-xs text-text-muted">Origem</p>
                                            <p className="font-mono text-sm text-white truncate">Protocolo SINARCA (Null Address)</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-10 h-10 rounded-full bg-sinarca-neon/20 border border-sinarca-neon/50 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold text-sinarca-neon">PARA</span>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-xs text-text-muted">Destino</p>
                                            <p className="font-mono text-sm text-white truncate">0xAgroSustentavel_Wallet</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
