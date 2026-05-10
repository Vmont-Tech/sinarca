import React, { useState } from 'react';
import {
    ArrowRightLeft,
    Download,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    Leaf,
    ShieldCheck,
    Clock,
    CheckCircle,
    XCircle,
    FileText
} from 'lucide-react';

const MOCK_TRANSACTIONS = [
    { id: 'tx-001', type: 'retired', asset: 'Reserva Juma', amount: '1,200', unit: 'tCO2e', date: 'Hoje, 10:30', status: 'completed', hash: '0x7f9...e4r5', entities: { from: 'Minha Conta', to: 'Aposentadoria' } },
    { id: 'tx-002', type: 'received', asset: 'Carbono Cerrado', amount: '500', unit: 'tCO2e', date: 'Ontem, 14:15', status: 'completed', hash: '0x8a1...b2c3', entities: { from: 'AgroSustentável', to: 'Minha Conta' } },
    { id: 'tx-003', type: 'sent', asset: 'Mata Atlântica Viva', amount: '200', unit: 'tCO2e', date: '12 Jan 2025', status: 'pending', hash: '0x1c9...f2a3', entities: { from: 'Minha Conta', to: 'TechGlobal' } },
    { id: 'tx-004', type: 'minted', asset: 'Recuperação Amazônia', amount: '5,000', unit: 'tCO2e', date: '01 Jan 2025', status: 'completed', hash: '0x9d8...e1s2', entities: { from: 'Protocolo', to: 'Minha Conta' } },
    { id: 'tx-005', type: 'retired', asset: 'Energia Limpa Solar', amount: '150', unit: 'tCO2e', date: '20 Dez 2024', status: 'completed', hash: '0x3e4...r5t6', entities: { from: 'Minha Conta', to: 'Aposentadoria' } },
];

export default function Transactions() {
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const getIcon = (type: string) => {
        switch (type) {
            case 'retired': return <Leaf className="w-5 h-5 text-green-500" />;
            case 'received': return <ArrowDownLeft className="w-5 h-5 text-blue-400" />;
            case 'sent': return <ArrowUpRight className="w-5 h-5 text-orange-400" />;
            case 'minted': return <ShieldCheck className="w-5 h-5 text-sinarca-neon" />;
            default: return <ArrowRightLeft className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'completed') return <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-800/50"><CheckCircle className="w-3 h-3" /> Concluído</span>;
        if (status === 'pending') return <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-900/30 px-2.5 py-1 rounded-full border border-yellow-800/50"><Clock className="w-3 h-3 animate-pulse" /> Processando</span>;
        return <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-900/30 px-2.5 py-1 rounded-full border border-red-800/50"><XCircle className="w-3 h-3" /> Falha</span>;
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'retired': return 'Aposentadoria';
            case 'received': return 'Recebimento';
            case 'sent': return 'Transferência';
            case 'minted': return 'Emissão (Mint)';
            default: return 'Transação';
        }
    };

    const filteredTransactions = MOCK_TRANSACTIONS.filter(tx => {
        const matchesFilter = filter === 'all' || tx.type === filter;
        const matchesSearch = tx.asset.toLowerCase().includes(searchTerm.toLowerCase()) || tx.hash.includes(searchTerm);
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1200px] flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-white mb-2">Minhas Transações</h1>
                    <p className="text-text-muted">Histórico completo de movimentações na sua carteira digital SINARCA.</p>
                </div>
                <button className="flex items-center gap-2 bg-sinarca-deep hover:bg-sinarca-forest border border-sinarca-border text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                    <Download className="w-4 h-4" /> Exportar CSV
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-sinarca-deep p-4 rounded-xl border border-sinarca-border">
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {['all', 'received', 'sent', 'retired', 'minted'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === f ? 'bg-sinarca-neon text-sinarca-forest shadow-[0_0_10px_rgba(0,255,148,0.2)]' : 'bg-transparent text-text-muted hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {f === 'all' ? 'Todas' : getTypeLabel(f)}
                        </button>
                    ))}
                </div>
                <div className="w-full md:w-80 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-text-muted" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por ativo ou hash..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-sinarca-border rounded-lg leading-5 bg-[#001F14] text-white placeholder-text-muted focus:outline-none focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon sm:text-sm transition-colors"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-sinarca-deep border border-sinarca-border rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#00281a] border-b border-sinarca-border text-xs uppercase text-text-muted tracking-wider font-semibold">
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Ativo</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4">Detalhes</th>
                                <th className="px-6 py-4 text-center">Data</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Hash</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sinarca-border/50">
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-sinarca-forest border border-sinarca-border flex items-center justify-center shrink-0">
                                                {getIcon(tx.type)}
                                            </div>
                                            <span className="font-bold text-white md:hidden lg:hidden">{getTypeLabel(tx.type)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-white text-sm">{tx.asset}</p>
                                            <p className="text-xs text-text-muted">{getTypeLabel(tx.type)}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-baseline gap-1">
                                            <span className={`font-mono font-bold text-base ${tx.type === 'sent' || tx.type === 'retired' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {tx.type === 'sent' || tx.type === 'retired' ? '-' : '+'}{tx.amount}
                                            </span>
                                            <span className="text-xs text-text-muted">{tx.unit}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="flex items-center gap-1">De: <span className="text-white">{tx.entities.from}</span></span>
                                            <span className="flex items-center gap-1">Para: <span className="text-white">{tx.entities.to}</span></span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-text-muted font-mono whitespace-nowrap">
                                        {tx.date}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(tx.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-2 bg-black/30 px-2 py-1 rounded border border-sinarca-border group-hover:border-sinarca-neon/30 transition-colors cursor-pointer" title="Ver no explorer">
                                            <span className="text-xs font-mono text-sinarca-neon">{tx.hash}</span>
                                            <ArrowUpRight className="w-3 h-3 text-text-muted group-hover:text-sinarca-neon" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredTransactions.length === 0 && (
                    <div className="p-12 text-center text-text-muted">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhuma transação encontrada com os filtros atuais.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
