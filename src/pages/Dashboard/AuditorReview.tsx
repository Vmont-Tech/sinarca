import React from 'react';
import { CheckCircle2, AlertTriangle, RotateCcw, FileCheck2 } from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';

type AuditItem = {
    id: string;
    friendlyId: string;
    name: string;
    nome?: string;
    status: string;
    area_hectares: number;
    carbonStock: number;
    location: { city: string; state: string };
};

export default function AuditorReview() {
    const [items, setItems] = React.useState<AuditItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [message, setMessage] = React.useState('');

    const loadQueue = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiGet<any>('/audit/queue');
            setItems(response?.projects || []);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const verify = async (projectId: string, status: 'APPROVED' | 'BLOCKED' | 'RECALCULATED') => {
        const laudo_texto = status === 'APPROVED'
            ? 'Auditoria aprovada com trilha documental suficiente.'
            : status === 'BLOCKED'
                ? 'Auditoria bloqueada por inconsistência crítica.'
                : 'Recalculo solicitado para revisão de métrica ambiental.';
        await apiPatch(`/audit/verify/${encodeURIComponent(projectId)}`, { status, laudo_texto, auditor_id: 'aud-005' });
        setMessage(`Auditoria registrada: ${status}`);
        await loadQueue();
    };

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-primary">Fluxo MVP</p>
                    <h1 className="text-3xl font-black text-gray-950">Fila do Auditor</h1>
                    <p className="mt-2 max-w-3xl text-gray-600">
                        Analise evidências, aprove auditorias, bloqueie riscos e solicite recálculo quando necessário.
                    </p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
                    <FileCheck2 className="h-8 w-8" />
                </div>
            </div>

            {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</div>}

            <div className="grid gap-5">
                {loading && <div className="rounded-2xl bg-white p-8 shadow-sm">Carregando fila de auditoria...</div>}
                {!loading && items.length === 0 && <div className="rounded-2xl bg-white p-8 shadow-sm">Nenhum projeto pendente de auditoria.</div>}

                {items.map((project) => (
                    <article key={project.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-600">{project.status}</span>
                                    <span className="text-xs font-mono text-gray-400">{project.friendlyId}</span>
                                </div>
                                <h2 className="text-xl font-black text-gray-950">{project.name || project.nome}</h2>
                                <p className="mt-1 text-sm text-gray-500">{project.location.city}, {project.location.state}</p>
                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-400">Área</p>
                                        <p className="font-bold text-gray-900">{project.area_hectares.toLocaleString('pt-BR')} ha</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Estoque</p>
                                        <p className="font-bold text-gray-900">{project.carbonStock.toLocaleString('pt-BR')} tCO₂e</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button onClick={() => verify(project.id, 'APPROVED')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" /> Aprovar
                                </button>
                                <button onClick={() => verify(project.id, 'RECALCULATED')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600">
                                    <RotateCcw className="h-4 w-4" /> Recalcular
                                </button>
                                <button onClick={() => verify(project.id, 'BLOCKED')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700">
                                    <AlertTriangle className="h-4 w-4" /> Bloquear
                                </button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
