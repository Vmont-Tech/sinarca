import {
    AlertTriangle,
    BadgeCheck,
    CheckCircle2,
    Flame,
    MapPinned,
    ShieldCheck,
    ShoppingCart,
    Tag,
    WalletCards,
} from 'lucide-react';
import type { ProjectLifecycleStage } from '../data/mrca_db';

const DEFAULT_LIFECYCLE_STAGES: ProjectLifecycleStage[] = [
    {
        code: 'CREATED',
        label: 'Registro',
        description: 'Demarcação física e cadastro do projeto com vértices.',
        index: 1,
        total: 7,
        state: 'current',
        isCurrent: true,
    },
    {
        code: 'AWAITING_CERTIFICATION',
        label: 'Certificação',
        description: 'Validação técnica da metodologia, documentos e potencial.',
        index: 2,
        total: 7,
        state: 'pending',
        isCurrent: false,
    },
    {
        code: 'TOKENIZED_LOCKED',
        label: 'Tokenização',
        description: 'Créditos emitidos em status bloqueado para rastreio.',
        index: 3,
        total: 7,
        state: 'pending',
        isCurrent: false,
    },
    {
        code: 'AWAITING_AUDIT',
        label: 'Auditoria',
        description: 'Inspeção de campo e validação biométrica ou satélite.',
        index: 4,
        total: 7,
        state: 'pending',
        isCurrent: false,
    },
    {
        code: 'AVAILABLE',
        label: 'Listagem',
        description: 'Disponível para marketplace e consulta pública.',
        index: 5,
        total: 7,
        state: 'pending',
        isCurrent: false,
    },
    {
        code: 'RESERVED',
        label: 'Liquidação',
        description: 'Reserva, compra ou transferência dos créditos.',
        index: 6,
        total: 7,
        state: 'pending',
        isCurrent: false,
    },
    {
        code: 'RETIRED',
        label: 'Resgate',
        description: 'Aposentadoria definitiva para compensação real.',
        index: 7,
        total: 7,
        state: 'pending',
        isCurrent: false,
    },
];

const ICONS: Record<string, typeof MapPinned> = {
    CREATED: MapPinned,
    AWAITING_CERTIFICATION: BadgeCheck,
    TOKENIZED_LOCKED: Tag,
    AWAITING_AUDIT: ShieldCheck,
    AVAILABLE: ShoppingCart,
    RESERVED: WalletCards,
    RETIRED: Flame,
};

const stateClass = {
    completed: {
        dot: 'bg-primary text-white border-primary',
        text: 'text-primary',
        surface: 'bg-primary/5 border-primary/20',
        line: 'bg-primary',
    },
    current: {
        dot: 'bg-black text-white border-black',
        text: 'text-black',
        surface: 'bg-gray-50 border-gray-200',
        line: 'bg-gray-900',
    },
    blocked: {
        dot: 'bg-red-600 text-white border-red-600',
        text: 'text-red-700',
        surface: 'bg-red-50 border-red-100',
        line: 'bg-red-500',
    },
    pending: {
        dot: 'bg-white text-gray-400 border-gray-200',
        text: 'text-gray-500',
        surface: 'bg-white border-gray-100',
        line: 'bg-gray-200',
    },
};

type ProjectLifecycleTimelineProps = {
    stages?: ProjectLifecycleStage[];
    currentStage?: ProjectLifecycleStage | null;
    variant?: 'compact' | 'full';
};

const getDisplayStages = (stages?: ProjectLifecycleStage[]) => (
    stages && stages.length > 0 ? stages : DEFAULT_LIFECYCLE_STAGES
);

const getCurrentStage = (stages: ProjectLifecycleStage[], currentStage?: ProjectLifecycleStage | null) => (
    currentStage?.code
        ? currentStage
        : stages.find((stage) => stage.isCurrent || stage.state === 'current' || stage.state === 'blocked') || stages[0]
);

export function ProjectLifecycleTimeline({ stages, currentStage, variant = 'compact' }: ProjectLifecycleTimelineProps) {
    const displayStages = getDisplayStages(stages);
    const activeStage = getCurrentStage(displayStages, currentStage);
    const progressLabel = `${activeStage.index || 1}/${activeStage.total || displayStages.length}`;

    if (variant === 'compact') {
        return (
            <div className="mb-8 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Etapa atual</p>
                        <p className="text-sm font-black text-black">{activeStage.label}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-gray-700 shadow-sm ring-1 ring-gray-100">
                        {progressLabel}
                    </span>
                </div>
                <div className="flex items-center gap-1.5" aria-label={`Ciclo do projeto: etapa atual ${activeStage.label}`}>
                    {displayStages.map((stage, index) => {
                        const classes = stateClass[stage.state] || stateClass.pending;
                        const Icon = stage.state === 'blocked' ? AlertTriangle : stage.state === 'completed' ? CheckCircle2 : ICONS[stage.code] || MapPinned;
                        return (
                            <div key={stage.code} className="flex flex-1 items-center gap-1.5">
                                <div
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${classes.dot}`}
                                    title={`${stage.index}. ${stage.label}`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                {index < displayStages.length - 1 && (
                                    <div className={`h-1 min-w-3 flex-1 rounded-full ${stage.state === 'completed' ? stateClass.completed.line : stateClass.pending.line}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Ciclo do projeto</p>
                    <h3 className="mt-1 text-xl font-black text-black">Etapa atual: {activeStage.label}</h3>
                </div>
                <span className="w-fit rounded-full bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-100">
                    {progressLabel}
                </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                {displayStages.map((stage) => {
                    const classes = stateClass[stage.state] || stateClass.pending;
                    const Icon = stage.state === 'blocked' ? AlertTriangle : ICONS[stage.code] || MapPinned;
                    return (
                        <div key={stage.code} className={`min-h-[164px] rounded-2xl border p-4 ${classes.surface}`}>
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <span className="text-[10px] font-black text-primary">{String(stage.index || '').padStart(2, '0')}</span>
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${classes.dot}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                            <p className={`text-xs font-black uppercase tracking-widest ${classes.text}`}>{stage.label}</p>
                            <p className="mt-3 text-xs leading-relaxed text-gray-500">{stage.description}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
