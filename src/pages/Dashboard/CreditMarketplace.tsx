import React from 'react';
import { BadgeDollarSign, ShoppingCart, Link2 } from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';

type Credit = {
    id: string;
    friendlyId: string;
    name: string;
    status: string;
    metrics: { carbonStock: number; totalAreaHa: number; investmentValue?: number };
    location: { city: string; state: string };
};

type PurchaseResult = {
    transaction: {
        id: string;
        hash_transacao_stellar: string;
        stellar_mode: string;
        stellar_network: string;
        financials: {
            gross_amount_brl: number;
            merchant_transaction_fee_brl: number;
            merchant_transaction_fee_percent: number;
            net_to_seller_brl: number;
            issuer_fund_yield_status: string;
        };
    };
};

export default function CreditMarketplace() {
    const [credits, setCredits] = React.useState<Credit[]>([]);
    const [quantityByProject, setQuantityByProject] = React.useState<Record<string, number>>({});
    const [result, setResult] = React.useState<PurchaseResult | null>(null);
    const [loading, setLoading] = React.useState(true);

    const loadMarketplace = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiGet<any>('/marketplace');
            setCredits(response?.credits || []);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadMarketplace();
    }, [loadMarketplace]);

    const buy = async (project: Credit) => {
        const quantidade = quantityByProject[project.id] || 1;
        const response = await apiPost<PurchaseResult>('/marketplace/buy', {
            project_id: project.id,
            buyer_id: 'comp-001',
            quantidade,
            unit_price_brl: 500,
        });
        if (response) setResult(response);
        await loadMarketplace();
    };

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-primary">Fluxo MVP</p>
                    <h1 className="text-3xl font-black text-gray-950">Marketplace de Créditos</h1>
                    <p className="mt-2 max-w-3xl text-gray-600">
                        Empresa compradora seleciona créditos ambientais, registra taxa de 4,5% e recebe hash transacional rastreável.
                    </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                    <ShoppingCart className="h-8 w-8" />
                </div>
            </div>

            {result && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                    <div className="mb-2 flex items-center gap-2 font-black"><Link2 className="h-4 w-4" /> Compra registrada: {result.transaction.id}</div>
                    <p>Hash Stellar: <span className="font-mono">{result.transaction.hash_transacao_stellar}</span></p>
                    <p>Modo: {result.transaction.stellar_mode} / Rede: {result.transaction.stellar_network}</p>
                    <p>GMV: R$ {result.transaction.financials.gross_amount_brl.toLocaleString('pt-BR')} · Taxa 4,5%: R$ {result.transaction.financials.merchant_transaction_fee_brl.toLocaleString('pt-BR')}</p>
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                {loading && <div className="rounded-2xl bg-white p-8 shadow-sm">Carregando marketplace...</div>}
                {!loading && credits.length === 0 && <div className="rounded-2xl bg-white p-8 shadow-sm">Nenhum crédito disponível no momento.</div>}

                {credits.map((project) => (
                    <article key={project.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">{project.status}</span>
                            <span className="text-xs font-mono text-gray-400">{project.friendlyId}</span>
                        </div>
                        <h2 className="text-xl font-black text-gray-950">{project.name}</h2>
                        <p className="mt-1 text-sm text-gray-500">{project.location.city}, {project.location.state}</p>
                        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400">Disponível</p>
                                <p className="font-bold text-gray-900">{project.metrics.carbonStock.toLocaleString('pt-BR')} tCO₂e</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Preço base</p>
                                <p className="font-bold text-gray-900">R$ 500/tCO₂e</p>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <input
                                type="number"
                                min="1"
                                max={project.metrics.carbonStock}
                                value={quantityByProject[project.id] || 1}
                                onChange={(e) => setQuantityByProject((prev) => ({ ...prev, [project.id]: Number(e.target.value) }))}
                                className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-primary"
                            />
                            <button onClick={() => buy(project)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90">
                                <BadgeDollarSign className="h-4 w-4" /> Comprar crédito
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
