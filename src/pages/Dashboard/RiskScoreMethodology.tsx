import type { ComponentType } from 'react';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    CircleGauge,
    Database,
    FileCheck2,
    Info,
    Satellite,
    Scale,
    ShieldAlert,
} from 'lucide-react';

type IconComponent = ComponentType<{ className?: string }>;

type RiskSignal = {
    code: string;
    weight: number;
    source: string;
    condition: string;
    rationale: string;
    tone: 'critical' | 'high' | 'medium' | 'low';
};

type RiskClass = {
    code: string;
    range: string;
    label: string;
    meaning: string;
    barClass: string;
};

type InputGroup = {
    title: string;
    description: string;
    Icon: IconComponent;
};

const formula = 'score = min(100, round(soma dos pesos dos sinais ativos))';

const sealCopy = [
    'Avaliação técnica rastreável, calculada por sinais verificáveis de dossiê, território e monitoramento ambiental.',
    'O selo indica o nível de risco atual do projeto no Sinarca; não substitui certificação independente, decisão regulatória ou auditoria externa.',
    'Cada recálculo preserva a explicação que gerou o resultado, com assessment append-only e sinais de risco associados.',
];

const inputGroups: InputGroup[] = [
    {
        title: 'Declarações e evidências',
        description: 'Claims de posse, propriedade e direito de operar são cruzados com evidências documentais e validação estrutural do dossiê.',
        Icon: FileCheck2,
    },
    {
        title: 'Conflitos territoriais',
        description: 'Sobreposições geoespaciais abertas e dupla reivindicação ambiental entram como sinais de risco, sem multiplicar peso por volume.',
        Icon: Database,
    },
    {
        title: 'Monitoramento satelital',
        description: 'Apenas anomalias confirmadas por decisão humana e ainda não saneadas entram no cálculo de risco.',
        Icon: Satellite,
    },
];

const riskSignals: RiskSignal[] = [
    {
        code: 'DOUBLE_CLAIM',
        weight: 60,
        source: 'Conflito',
        condition: 'Mesmo atributo ambiental reivindicado em área sobreposta por outro projeto.',
        rationale: 'É o maior peso isolado porque indica risco direto de dupla contagem.',
        tone: 'critical',
    },
    {
        code: 'OVERLAP_CRITICAL',
        weight: 50,
        source: 'Geoespacial',
        condition: 'Sobreposição geoespacial aberta acima de 50% da área do projeto.',
        rationale: 'Uma sobreposição crítica compromete a unicidade territorial do ativo.',
        tone: 'critical',
    },
    {
        code: 'SATELLITE_ANOMALY_CONFIRMED_CRITICAL',
        weight: 50,
        source: 'Satélite',
        condition: 'Anomalia satelital confirmada de severidade crítica e sem revisão de saneamento.',
        rationale: 'Evento ambiental crítico pode invalidar premissas de permanência e conservação.',
        tone: 'critical',
    },
    {
        code: 'OVERLAP_HIGH',
        weight: 30,
        source: 'Geoespacial',
        condition: 'Sobreposição geoespacial aberta entre 20% e 50% da área do projeto.',
        rationale: 'Exige revisão técnica antes de avançar com confiança operacional.',
        tone: 'high',
    },
    {
        code: 'SATELLITE_ANOMALY_CONFIRMED_HIGH',
        weight: 30,
        source: 'Satélite',
        condition: 'Anomalia satelital confirmada de severidade alta e sem saneamento.',
        rationale: 'Sinal ambiental relevante, mas abaixo do gatilho crítico isolado.',
        tone: 'high',
    },
    {
        code: 'LAND_CLAIM_UNVERIFIED',
        weight: 20,
        source: 'Dossiê',
        condition: 'Declaração de posse ou propriedade sem evidência validada.',
        rationale: 'O direito sobre a terra ainda não tem suporte documental suficiente.',
        tone: 'medium',
    },
    {
        code: 'OVERLAP_MEDIUM',
        weight: 15,
        source: 'Geoespacial',
        condition: 'Sobreposição geoespacial aberta entre 5% e 20% da área do projeto.',
        rationale: 'Pode ser borda, erro de polígono ou conflito real; precisa de revisão.',
        tone: 'medium',
    },
    {
        code: 'CLAIM_EVIDENCE_PENDING',
        weight: 10,
        source: 'Dossiê',
        condition: 'Uma ou mais declarações ainda sem dossiê documental completo.',
        rationale: 'A pendência reduz confiança até que o dossiê seja completado.',
        tone: 'low',
    },
    {
        code: 'POSSESSION_WITHOUT_TITLE',
        weight: 10,
        source: 'Dossiê',
        condition: 'Posse declarada sem documento legal de propriedade.',
        rationale: 'Não bloqueia sozinha, mas sinaliza menor força documental.',
        tone: 'low',
    },
    {
        code: 'OVERLAP_LOW',
        weight: 5,
        source: 'Geoespacial',
        condition: 'Sobreposição geoespacial aberta abaixo de 5% da área do projeto.',
        rationale: 'Baixo peso para casos que podem ser ajuste de fronteira ou ruído cartográfico.',
        tone: 'low',
    },
];

const riskClasses: RiskClass[] = [
    {
        code: 'LOW',
        range: '0-20',
        label: 'Baixo',
        meaning: 'Dossiê e território sem sinais relevantes ou com pendências pequenas.',
        barClass: 'bg-emerald-500',
    },
    {
        code: 'MODERATE',
        range: '21-40',
        label: 'Moderado',
        meaning: 'Há pendências documentais ou sinais combinados que pedem acompanhamento.',
        barClass: 'bg-lime-500',
    },
    {
        code: 'HIGH',
        range: '41-60',
        label: 'Alto',
        meaning: 'Risco material suficiente para revisão técnica antes de novas decisões.',
        barClass: 'bg-amber-500',
    },
    {
        code: 'VERY_HIGH',
        range: '61-80',
        label: 'Muito alto',
        meaning: 'Combinação forte de sinais; o projeto deve permanecer sob análise reforçada.',
        barClass: 'bg-orange-500',
    },
    {
        code: 'CRITICAL',
        range: '81-100',
        label: 'Crítico',
        meaning: 'Aciona auto-hold no eixo de integridade até revisão e saneamento.',
        barClass: 'bg-red-600',
    },
];

const toneClasses: Record<RiskSignal['tone'], string> = {
    critical: 'border-red-200 bg-red-50 text-red-700',
    high: 'border-orange-200 bg-orange-50 text-orange-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-800',
    low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const formatWeight = (weight: number) => `+${weight}`;

export default function RiskScoreMethodology() {
    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold uppercase tracking-widest text-emerald-700">
                            <ShieldAlert className="h-4 w-4" />
                            Selo Sinarca de Integridade
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-normal text-gray-950 md:text-4xl">
                            Como o score de risco é calculado
                        </h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                            Não depende de selecionar um projeto para entender a metodologia: o mesmo motor de risco
                            é aplicado quando o Sinarca recalcula a integridade de qualquer projeto a partir dos
                            sinais disponíveis.
                        </p>
                    </div>

                    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-5 lg:max-w-sm">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Copy oficial do selo</p>
                        <p className="mt-3 text-xl font-extrabold leading-snug text-gray-950">
                            Avaliação computacional auditável da integridade do projeto.
                        </p>
                        <p className="mt-3 text-sm leading-6 text-gray-600">
                            Transparência sobre risco, evidências e sinais técnicos. Sem promessa absoluta, sem greenwashing.
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {sealCopy.map((copy) => (
                        <div key={copy} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-600" />
                            <p className="text-sm font-semibold leading-6 text-gray-700">{copy}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-950 text-primary">
                            <CircleGauge className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-950">Fórmula do score</h2>
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                O cálculo é determinístico: com as mesmas entradas, o resultado é o mesmo. Cada bucket
                                emite no máximo um sinal; quantidade entra na explicação, não multiplica o peso.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-lg border border-gray-200 bg-gray-950 px-5 py-4">
                        <code className="break-words text-sm font-bold text-primary">{formula}</code>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {inputGroups.map(({ title, description, Icon }) => (
                            <div key={title} className="rounded-lg border border-gray-200 p-4">
                                <Icon className="mb-3 h-5 w-5 text-gray-800" />
                                <h3 className="text-sm font-extrabold text-gray-950">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <aside className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-700" />
                        <h2 className="text-lg font-extrabold text-red-950">Auto-hold</h2>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-red-800">
                        Quando o score chega à classe <strong>CRITICAL</strong>, o eixo de integridade muda para
                        <strong> ON_HOLD</strong>. Isso retém a confiança do selo, mas não altera sozinho o status
                        operacional do projeto.
                    </p>
                    <p className="mt-4 text-sm leading-6 text-red-800">
                        A saída do auto-hold exige novo recálculo com o evento ou conflito saneado; ninguém escreve o
                        desbloqueio manualmente sem evidência.
                    </p>
                </aside>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-950">Sinais e pesos padrão</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Os pesos abaixo refletem a configuração padrão atual do backend. O score final nunca passa
                            de 100, mesmo quando a soma bruta dos sinais ultrapassa esse valor.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                        <Scale className="h-4 w-4" />
                        Soma saturada
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {riskSignals.map((signal) => (
                        <article key={signal.code} className="rounded-lg border border-gray-200 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-xs font-extrabold uppercase tracking-wide text-gray-950">
                                            {signal.code}
                                        </span>
                                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest ${toneClasses[signal.tone]}`}>
                                            {signal.source}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm font-semibold leading-6 text-gray-700">{signal.condition}</p>
                                </div>
                                <span className="shrink-0 rounded-lg bg-gray-950 px-3 py-2 font-mono text-sm font-extrabold text-primary">
                                    {formatWeight(signal.weight)}
                                </span>
                            </div>
                            <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-6 text-gray-500">
                                {signal.rationale}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Activity className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-950">Classes do Selo Sinarca</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            A classe é o primeiro limite superior que comporta o score. Ela resume a avaliação, mas a
                            explicação real fica nos sinais ativos que produziram a pontuação.
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
                    {riskClasses.map((item) => (
                        <div key={item.code} className="rounded-lg border border-gray-200 p-4">
                            <div className={`mb-4 h-2 rounded-full ${item.barClass}`} />
                            <p className="font-mono text-xs font-extrabold text-gray-500">{item.range}</p>
                            <h3 className="mt-2 text-base font-extrabold text-gray-950">{item.label}</h3>
                            <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-wide text-gray-400">
                                {item.code}
                            </p>
                            <p className="mt-3 text-sm leading-6 text-gray-600">{item.meaning}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-950 p-6 text-white shadow-sm md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold uppercase tracking-widest text-primary">
                            <Info className="h-4 w-4" />
                            Leitura correta do selo
                        </div>
                        <h2 className="text-2xl font-extrabold">Risco baixo não é garantia absoluta. Risco crítico não é julgamento final.</h2>
                        <p className="mt-4 text-sm leading-6 text-gray-300">
                            O Selo Sinarca existe para tornar a avaliação verificável: mostra quais sinais pesaram,
                            qual foi a pontuação e por que o projeto está apto, sob revisão ou em retenção de
                            integridade.
                        </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4 md:max-w-sm">
                        <p className="text-sm font-bold leading-6 text-gray-200">
                            Metadados internos e identificadores sensíveis ficam fora da leitura pública. A publicação
                            prioriza código, peso e motivo do sinal.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
