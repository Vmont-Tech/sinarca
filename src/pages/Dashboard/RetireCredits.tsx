import {
    ChevronRight,
    Leaf,
    Verified,
    Copy,
    AlertTriangle,
    Lock,
    Key,
    Flame,
    FileText,
    Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RetireCredits() {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center py-10 px-4 md:px-8 bg-sinarca-forest min-h-screen text-white">
            <div className="w-full max-w-[1024px] flex flex-col gap-8">
                {/* Breadcrumbs */}
                <nav className="flex text-sm text-text-muted">
                    <ol className="flex items-center gap-2">
                        <li><a className="hover:text-sinarca-neon transition-colors cursor-pointer">Painel</a></li>
                        <li><ChevronRight className="w-4 h-4" /></li>
                        <li><a className="hover:text-sinarca-neon transition-colors cursor-pointer">Carteira de Ativos</a></li>
                        <li><ChevronRight className="w-4 h-4" /></li>
                        <li className="text-white">Aposentar Crédito</li>
                    </ol>
                </nav>

                {/* Page Heading */}
                <div className="flex flex-col gap-2">
                    <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                        Finalizar Aposentadoria de Créditos
                    </h1>
                    <p className="text-text-muted text-lg max-w-2xl">
                        Confirme os dados abaixo para processar a baixa definitiva dos ativos ambientais na blockchain Algorand.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Details */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        {/* Stats Card */}
                        <div className="bg-gradient-to-br from-sinarca-deep to-[#0a1f0a] rounded-xl border border-sinarca-border p-6 md:p-8 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Leaf className="w-32 h-32 text-white" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-text-muted text-sm font-medium uppercase tracking-wider mb-2">Volume Total a Aposentar</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl md:text-6xl font-bold text-sinarca-neon font-sans tracking-tight">5.000</span>
                                    <span className="text-xl md:text-2xl text-white font-medium">tCO2e</span>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sinarca-neon/10 px-3 py-1 text-xs font-medium text-sinarca-neon border border-sinarca-neon/20">
                                        <Verified className="w-4 h-4" /> Verificado
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white border border-white/10">
                                        Safra 2023
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="bg-sinarca-deep rounded-xl border border-sinarca-border overflow-hidden">
                            <div className="px-6 py-4 border-b border-sinarca-border flex items-center justify-between">
                                <h3 className="text-white font-semibold">Detalhes da Operação</h3>
                                <Info className="w-5 h-5 text-text-muted" />
                            </div>
                            <div className="divide-y divide-sinarca-border/50">
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Código MRCA</span>
                                        <div className="flex items-center gap-2 group cursor-pointer">
                                            <span className="text-white font-mono text-base">BR-SINARCA-2023-9821-X</span>
                                            <Copy className="w-4 h-4 text-sinarca-neon opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Blockchain Network</span>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-white font-medium">Algorand Mainnet</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Origem do Projeto</span>
                                        <span className="text-white font-medium">Reflorestamento Amazônia Legal (Lote 4B)</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Beneficiário da Aposentadoria</span>
                                        <span className="text-white font-medium">Empresa Exemplo S.A.</span>
                                    </div>
                                </div>
                                <div className="p-6 bg-[#0d240d]/50">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Hash da Transação (Burn)</span>
                                        <span className="text-white/50 font-mono text-sm break-all">Gerado após confirmação...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Irreversible Action Warning */}
                        <div className="rounded-xl border border-red-500/20 bg-red-900/10 p-5 flex gap-4 items-start">
                            <div className="p-2 bg-red-500/10 rounded-lg text-red-500 shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-red-400 font-bold text-base mb-1">Atenção: Ação Irreversível</h4>
                                <p className="text-red-200/70 text-sm leading-relaxed">
                                    Ao confirmar, estes créditos serão "queimados" (burn) permanentemente na blockchain e retirados de circulação. Esta ação não pode ser desfeita e os créditos não poderão ser transacionados novamente.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Action Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 flex flex-col gap-4">
                            <div className="bg-sinarca-deep rounded-xl border border-sinarca-border p-6 shadow-xl flex flex-col gap-6">
                                <div>
                                    <h3 className="text-white font-serif font-semibold text-xl mb-1">Confirmação de Segurança</h3>
                                    <p className="text-text-muted text-sm">Autenticação de dois fatores necessária.</p>
                                </div>
                                <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
                                    {/* 2FA Input */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-text-muted uppercase tracking-wider" htmlFor="2fa-code">
                                            Código 2FA (Authenticator)
                                        </label>
                                        <div className="relative">
                                            <input className="block w-full rounded-lg border-sinarca-border bg-[#0d240d] py-3 pl-10 pr-4 text-white placeholder-white/20 focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon sm:text-sm font-mono tracking-widest text-center" id="2fa-code" placeholder="000 000" type="text" />
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Lock className="w-4 h-4 text-text-muted" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Password Confirmation */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-text-muted uppercase tracking-wider" htmlFor="password-confirm">
                                            Senha de Assinatura
                                        </label>
                                        <div className="relative">
                                            <input className="block w-full rounded-lg border-sinarca-border bg-[#0d240d] py-3 pl-10 pr-4 text-white placeholder-white/20 focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon sm:text-sm" id="password-confirm" type="password" />
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Key className="w-4 h-4 text-text-muted" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Checkbox Confirmation */}
                                    <label className="flex gap-3 items-start cursor-pointer group">
                                        <input className="mt-1 rounded border-white/20 bg-[#0d240d] text-sinarca-neon focus:ring-offset-sinarca-deep focus:ring-sinarca-neon cursor-pointer" type="checkbox" />
                                        <span className="text-sm text-text-muted group-hover:text-white transition-colors">
                                            Li e concordo com a <a className="text-sinarca-neon hover:underline" href="#">Política de Aposentadoria de Ativos</a> e confirmo a veracidade da operação.
                                        </span>
                                    </label>
                                    <div className="h-px w-full bg-sinarca-border my-1"></div>
                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={async () => {
                                                if (confirm('Tem certeza que deseja aposentar estes créditos? Esta ação é irreversível.')) {
                                                    try {
                                                        const userStr = localStorage.getItem("sinarca_user");
                                                        const user = userStr ? JSON.parse(userStr) : null;
                                                        const res = await fetch("http://127.0.0.1:5680/api/v1/marketplace/compensate", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({
                                                                buyer_id: user?.id || "comp-001",
                                                                emissions_data: { scope1: 1000, scope2: 2000, scope3: 2000, total: 5000 },
                                                                credits_to_use: [{ project_id: "PRC-2024-002", amount: 5000 }]
                                                            })
                                                        });
                                                        const data = await res.json();
                                                        if (res.ok && data.success) {
                                                            alert('Operação realizada com sucesso! Os créditos foram aposentados e o token foi queimado na blockchain. Certificado gerado!');
                                                            navigate('/painel');
                                                        } else {
                                                            alert('Falha na aposentadoria: ' + (data.detail || 'Erro desconhecido. Verifique se o projeto existe.'));
                                                        }
                                                    } catch (e) {
                                                        alert('Erro de conexão ao aposentar.');
                                                    }
                                                }
                                            }}
                                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-sinarca-neon py-3 px-4 text-sinarca-forest font-bold hover:bg-[#00cc76] focus:outline-none focus:ring-2 focus:ring-sinarca-neon focus:ring-offset-2 focus:ring-offset-sinarca-deep transition-all transform active:scale-[0.98]"
                                            type="button"
                                        >
                                            <Flame className="w-5 h-5" />
                                            Confirmar e Aposentar
                                        </button>
                                        <button
                                            onClick={() => navigate('/painel')}
                                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-transparent border border-sinarca-border py-3 px-4 text-white font-medium hover:bg-white/5 transition-colors"
                                            type="button"
                                        >
                                            Cancelar Operação
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <div className="bg-sinarca-deep/50 rounded-lg border border-sinarca-border/50 p-4 flex gap-3 items-center">
                                <div className="bg-sinarca-neon/10 p-2 rounded text-sinarca-neon shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="text-xs text-text-muted">
                                    <p className="font-bold text-white mb-0.5">Certificado de Neutralização</p>
                                    Será gerado automaticamente após a confirmação.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
