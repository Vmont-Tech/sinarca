import React, { useState, useEffect } from 'react';
import {
    Activity,
    Search,
    Filter,
    ArrowRight,
    Leaf,
    ShieldCheck,
    Globe,
    FileText,
    Database,
    Clock,
    CheckCircle,
    Box
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { database, type TransactionRecord } from '../../services/database';

interface GlobalEvent {
    id: string;
    type: string;
    asset: string;
    quantity: number;
    from: string;
    to: string;
    hash: string;
    timestamp: string;
    status: string;
    rawDate: Date;
}

const eventTypeByTransaction: Record<string, string> = {
    received: 'TRANSFER',
    sent: 'TRANSFER',
    retired: 'BURN',
    minted: 'MINT',
};

const parseTransactionDate = (transaction: TransactionRecord): Date => {
    const raw = transaction.createdAt || transaction.date;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const parseTransactionAmount = (transaction: TransactionRecord): number => {
    const parsed = Number(String(transaction.amount).replace(',', '.'));
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
};

export default function PublicExplorer() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [events, setEvents] = useState<GlobalEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEvents = async () => {
            setLoading(true);
            const transactions = await database.getTransactions();
            const allEvents = transactions.map((transaction) => {
                const rawDate = parseTransactionDate(transaction);
                return {
                    id: transaction.id,
                    type: eventTypeByTransaction[transaction.type] || transaction.type.toUpperCase(),
                    asset: transaction.asset,
                    quantity: parseTransactionAmount(transaction),
                    from: transaction.entities.from,
                    to: transaction.entities.to,
                    hash: transaction.hash,
                    timestamp: getTimeAgo(rawDate),
                    status: transaction.status,
                    rawDate
                };
            });

            allEvents.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
            setEvents(allEvents);
            setLoading(false);
        };
        loadEvents();
    }, []);

    const getTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " anos atrás";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " meses atrás";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " dias atrás";
        return "Recentemente";
    };

    const eventStats = {
        total: events.length,
        volume: events.reduce((sum, event) => sum + event.quantity, 0),
        assets: new Set(events.map(event => event.asset)).size,
        confirmed: events.filter(event => event.status === 'completed' || event.status === 'confirmed').length,
    };

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'BURN': return { label: 'Aposentadoria', color: 'text-red-400', bg: 'bg-red-400/10', icon: <Leaf className="w-4 h-4" /> };
            case 'MINT': return { label: 'Emissão', color: 'text-sinarca-neon', bg: 'bg-sinarca-neon/10', icon: <Box className="w-4 h-4" /> };
            case 'AUDIT': return { label: 'Auditoria', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: <ShieldCheck className="w-4 h-4" /> };
            case 'REGISTER': return { label: 'Novo Projeto', color: 'text-purple-400', bg: 'bg-purple-400/10', icon: <FileText className="w-4 h-4" /> };
            case 'TRANSFER': return { label: 'Transferência', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: <ArrowRight className="w-4 h-4" /> };
            default: return { label: 'Evento', color: 'text-gray-400', bg: 'bg-gray-400/10', icon: <Activity className="w-4 h-4" /> };
        }
    };

    const filteredEvents = events.filter(evt => {
        const matchesFilter = filter === 'all' || evt.type === filter;
        const matchesSearch = evt.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
            evt.hash.includes(searchTerm) ||
            evt.from.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (loading) return <div className="min-h-screen bg-[#050a06] flex items-center justify-center text-sinarca-neon">Carregando Blockchain...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-[#050a06] text-white">
            {/* Hero Header */}
            <div className="bg-[#0a140d] border-b border-sinarca-border py-12 px-4 relative overflow-hidden">
                <div className="container mx-auto max-w-6xl relative z-10">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-sinarca-neon/20 bg-sinarca-neon/5 px-4 py-1.5 backdrop-blur-md">
                            <Globe className="text-sinarca-neon w-4 h-4 animate-pulse" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-sinarca-neon">Ledger Persistido</span>
                        </div>
                        <h1 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight">
                            Explorador <span className="text-sinarca-neon">SINARCA</span>
                        </h1>
                        <p className="text-text-muted text-lg max-w-2xl">
                            Acompanhe as operações registradas no banco transacional da plataforma SINARCA.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 max-w-4xl mx-auto">
                        <div className="bg-[#121f16] border border-sinarca-border rounded-lg p-4 text-center">
                            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Eventos</p>
                            <p className="text-xl font-mono font-bold text-white">{eventStats.total.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="bg-[#121f16] border border-sinarca-border rounded-lg p-4 text-center">
                            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Confirmados</p>
                            <p className="text-xl font-mono font-bold text-sinarca-neon">{eventStats.confirmed.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="bg-[#121f16] border border-sinarca-border rounded-lg p-4 text-center">
                            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Volume</p>
                            <p className="text-xl font-mono font-bold text-white">{eventStats.volume.toLocaleString('pt-BR')} tCO2e</p>
                        </div>
                        <div className="bg-[#121f16] border border-sinarca-border rounded-lg p-4 text-center">
                            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Ativos</p>
                            <p className="text-xl font-mono font-bold text-blue-400">{eventStats.assets.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                {/* Background Grid Decoration */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto max-w-6xl px-4 py-8 flex-1">

                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#0a140d] p-4 rounded-xl border border-sinarca-border mb-6">
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {['all', 'REGISTER', 'AUDIT', 'MINT', 'BURN', 'TRANSFER'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === f ? 'bg-sinarca-neon text-sinarca-forest' : 'bg-transparent text-text-muted hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {f === 'all' ? 'Todos' : getTypeConfig(f).label}
                            </button>
                        ))}
                    </div>
                    <div className="w-full md:w-96 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-text-muted" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por Hash, Bloco ou Endereço..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-sinarca-border rounded-lg leading-5 bg-[#121f16] text-white placeholder-text-muted focus:outline-none focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon sm:text-sm font-mono transition-colors"
                        />
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-[#0a140d] border border-sinarca-border rounded-xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#121f16] border-b border-sinarca-border text-xs uppercase text-text-muted tracking-wider font-semibold">
                                    <th className="px-6 py-4">Evento</th>
                                    <th className="px-6 py-4">Ativo Relacionado</th>
                                    <th className="px-6 py-4">Origem / Destino</th>
                                    <th className="px-6 py-4 text-right">Quantidade</th>
                                    <th className="px-6 py-4 text-center">Tempo</th>
                                    <th className="px-6 py-4 text-right">Hash</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sinarca-border/30">
                                {filteredEvents.map((evt) => {
                                    const typeConfig = getTypeConfig(evt.type);
                                    return (
                                        <tr key={evt.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.bg} ${typeConfig.color} border border-white/5`}>
                                                        {typeConfig.icon}
                                                    </div>
                                                    <span className={`text-xs font-bold uppercase tracking-wider ${typeConfig.color}`}>
                                                        {typeConfig.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-white text-sm hover:text-sinarca-neon cursor-pointer transition-colors" onClick={() => navigate('/public/projetos')}>
                                                        {evt.asset}
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Database className="w-3 h-3 text-gray-600" />
                                                        <span className="text-[10px] text-gray-500 uppercase">Verificado</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5 text-gray-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                                                        <span className="truncate max-w-[150px]" title={evt.from}>{evt.from}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-white">
                                                        <ArrowRight className="w-3 h-3 text-gray-600" />
                                                        <span className="truncate max-w-[150px]" title={evt.to}>{evt.to}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {evt.quantity > 0 ? (
                                                    <span className="font-mono font-bold text-white bg-white/5 px-2 py-1 rounded text-sm border border-white/5">
                                                        {evt.quantity.toLocaleString()} <span className="text-xs text-gray-500 font-sans">tCO2e</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-600 uppercase font-bold">Log Only</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {evt.timestamp}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div onClick={() => navigate(`/public/tx/${evt.hash}`)} className="inline-flex items-center gap-2 bg-[#050a06] px-2 py-1.5 rounded border border-sinarca-border group-hover:border-sinarca-neon/30 transition-colors cursor-pointer" title="Ver no explorer">
                                                    <span className="text-xs font-mono text-sinarca-neon">{evt.hash.substring(0, 18)}...</span>
                                                    <CheckCircle className="w-3 h-3 text-sinarca-neon" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredEvents.length === 0 && (
                        <div className="p-12 text-center text-text-muted">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Nenhum evento encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
