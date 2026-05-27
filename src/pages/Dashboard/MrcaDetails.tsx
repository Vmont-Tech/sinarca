import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Activity,
    ArrowLeft,
    BadgeCheck,
    Calendar,
    CheckCircle2,
    Copy,
    Database,
    FileText,
    Hash,
    Layers,
    Leaf,
    ShieldCheck,
    Tag,
    Trees,
    Users,
} from 'lucide-react';
import ProjectGeofencePreview from '../../components/ProjectGeofencePreview';
import { ProjectLifecycleTimeline } from '../../components/ProjectLifecycleTimeline';
import { database, type ProjectPublicDossier } from '../../services/database';
import type { ProjectTagDraft, VertexLabel } from '../../services/projectOrigination';
import LogoLight from '../../assets/sinarca-logo-recortado.svg';

const formatDate = (value?: string | null) => {
    if (!value) return 'Não registrado';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTons = (value?: number) => `${Math.round(Number(value || 0)).toLocaleString('pt-BR')} tCO2e`;

const statusLabel = (status: string) => ({
    ACTIVE: 'Ativo',
    AVAILABLE: 'Disponível',
    AUDITED: 'Auditado',
    RETIRED: 'Aposentado',
    SUSPENDED: 'Suspenso',
    BLOCKED_AUDIT_REQUIRED: 'Bloqueado para auditoria',
    AWAITING_CERTIFICATION: 'Aguardando certificação',
}[status] || status);

const timelineCodeLabel = (code?: string) => ({
    CREATED: 'Projeto criado',
    QTAGS_RECORDED: 'Vértices registrados',
    BASELINE_CREATED: 'Baseline criado',
    DOCUMENTS_PENDING: 'Documentos pendentes',
    AWAITING_CERTIFICATION: 'Aguardando certificação',
    AWAITING_AUDIT: 'Aguardando auditoria',
    ACTIVE: 'Ativo',
    AVAILABLE: 'Disponível',
}[code || ''] || undefined);

const documentTypeLabel = (type?: string) => ({
    LEGAL_OWNERSHIP: 'Documento legal',
    CAR: 'CAR',
    FOREST_INVENTORY: 'Inventário florestal',
    KML_OR_SHP: 'KML/SHP',
    OTHER: 'Outro documento',
}[type || ''] || type || 'Documento');

const technicalStatusLabel = (value?: string) => ({
    deterministic_baseline: 'Baseline determinístico local',
    BLOCKED_MISSING_PROVIDER_CREDENTIALS: 'Sentinel bloqueado por credenciais ausentes',
    BLOCKED_MISSING_CREDENTIALS: 'Bloqueado por credenciais ausentes',
    RECORDED_DECLARED_VALUE: 'Valor declarado registrado',
}[value || ''] || value || 'Não informado');

const EmptyState = ({ text }: { text: string }) => (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm font-medium text-gray-500">
        {text}
    </div>
);

export default function MrcaDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dossier, setDossier] = useState<ProjectPublicDossier | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'integrity' | 'documents' | 'transactions'>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!id) return;
            setLoading(true);
            setError('');
            try {
                const data = await database.getProjectPublicDossier(id);
                if (active) {
                    setDossier(data);
                    window.scrollTo(0, 0);
                }
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Projeto não encontrado');
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center space-y-6">
                    <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Carregando dossiê público...</p>
                </div>
            </div>
        );
    }

    if (error || !dossier) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center space-y-6">
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{error || 'Projeto não encontrado na API.'}</p>
                    <button onClick={() => navigate(-1)} className="px-5 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest">
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    const { project } = dossier;
    const primaryCredit = dossier.credits[0];
    const entityLinks = [
        project.entities.developer,
        project.entities.certifier,
        project.entities.auditor,
        project.entities.registry,
    ];
    const metadata = (project as any).metadata || {};
    const qtagDrafts: ProjectTagDraft[] = dossier.tags
        .map((tag) => ({
            vertex_label: String(tag.vertex) as VertexLabel,
            has_qtag: Boolean(tag.hasQtag ?? (tag.tagUid || tag.cmac)),
            tag_uid: String(tag.tagUid || ''),
            cmac: String(tag.cmac || ''),
            latitude: String(tag.latitude ?? ''),
            longitude: String(tag.longitude ?? ''),
            captureMode: 'manual',
        }));

    return (
        <div className="min-h-screen bg-[#fcfcfc] text-black pb-24">
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-4 md:px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <img src={LogoLight} alt="Sinarca" className="w-8 h-8 object-contain shrink-0" />
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-black uppercase tracking-tight truncate">{project.name}</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">ID: {project.friendlyId} - {project.location.state}, Brasil</p>
                    </div>
                </div>
                <button
                    onClick={() => navigator.clipboard?.writeText(window.location.href)}
                    className="hidden md:flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-black transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                    <Copy className="w-4 h-4" /> Copiar link
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        <section className="relative min-h-[420px] rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100">
                            <img src={project.image} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></div>
                            <div className="relative z-10 min-h-[420px] flex flex-col justify-end p-8 md:p-10">
                                <div className="flex flex-wrap items-center gap-3 mb-6">
                                    <span className="px-4 py-1.5 bg-primary text-white rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg">
                                        {statusLabel(project.status)}
                                    </span>
                                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20">
                                        Vintage {project.metrics.vintage}
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-4 uppercase">
                                    {project.name}
                                </h1>
                                <p className="text-white/70 text-base md:text-lg font-medium max-w-2xl">
                                    {project.description || `Projeto localizado em ${project.location.city}, ${project.location.state}, bioma ${project.location.bioma}.`}
                                </p>
                            </div>
                        </section>

                        <nav className="flex gap-6 md:gap-10 border-b border-gray-100 overflow-x-auto">
                            {[
                                { id: 'overview', label: 'Resumo', icon: FileText },
                                { id: 'integrity', label: 'Integridade', icon: Tag },
                                { id: 'documents', label: 'Documentos', icon: ShieldCheck },
                                { id: 'transactions', label: 'Transações', icon: Activity },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    className={`pb-5 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-all relative ${
                                        activeTab === tab.id ? 'text-primary' : 'text-gray-400 hover:text-black'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full"></div>}
                                </button>
                            ))}
                        </nav>

                        {activeTab === 'overview' && (
                            <section className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <Trees className="w-5 h-5 text-primary mb-4" />
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Área</p>
                                        <p className="text-2xl font-black mt-1">{project.metrics.totalAreaHa.toLocaleString('pt-BR')} ha</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <Leaf className="w-5 h-5 text-primary mb-4" />
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Estoque</p>
                                        <p className="text-2xl font-black mt-1">{formatTons(project.metrics.carbonStock)}</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <BadgeCheck className="w-5 h-5 text-primary mb-4" />
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Metodologia</p>
                                        <p className="text-lg font-black mt-1">{project.methodology}</p>
                                    </div>
                                </div>

                                <ProjectLifecycleTimeline
                                    stages={project.lifecycle}
                                    currentStage={project.currentLifecycleStage}
                                    variant="full"
                                />

                                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">Eventos registrados</h3>
                                    {project.timeline.length > 0 ? (
                                        <div className="space-y-6">
                                            {project.timeline.map((event: any, index) => (
                                                <div key={`${event.code || event.title}-${index}`} className="flex gap-5">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{event.code || 'EVENT'} · {event.date}</p>
                                                        <h4 className="text-base font-bold text-black mt-1">{timelineCodeLabel(event.code) || event.title}</h4>
                                                        <p className="text-sm text-gray-500 mt-1">{event.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState text="Nenhum evento de timeline registrado para este projeto." />
                                    )}
                                </div>
                            </section>
                        )}

                        {activeTab === 'integrity' && (
                            <section className="space-y-8">
                                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">Vértices / Georreferenciamento</h3>
                                    {dossier.tags.length > 0 ? (
                                        <div className="space-y-5">
                                            <ProjectGeofencePreview tags={qtagDrafts} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {dossier.tags.map((tag) => (
                                                    <div key={tag.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <span className="text-xs font-black uppercase text-primary">Vértice {tag.vertex}</span>
                                                            <span className="text-[10px] font-bold uppercase text-gray-400">{tag.status}</span>
                                                        </div>
                                                        {tag.hasQtag ? (
                                                            <>
                                                                <p className="text-xs font-mono text-gray-700 break-all">{tag.tagUid || 'UID não registrado'}</p>
                                                                <p className="text-[10px] text-gray-400 mt-3">CMAC: {tag.cmac || 'Não registrado'}</p>
                                                            </>
                                                        ) : (
                                                            <p className="text-xs font-bold text-gray-500">Sem QTAG física</p>
                                                        )}
                                                        <p className="text-[10px] text-gray-400">Lat/Lng: {tag.latitude}, {tag.longitude}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <EmptyState text="Nenhum vértice público registrado para este projeto." />
                                    )}
                                </div>

                                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">Baseline técnico</h3>
                                    {dossier.baseline ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="p-5 rounded-xl bg-gray-50 border border-gray-100">
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Referência Sentinel</p>
                                                <p className="font-mono break-all mt-1">{dossier.baseline.sentinelSceneId}</p>
                                            </div>
                                            <div className="p-5 rounded-xl bg-gray-50 border border-gray-100">
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Hash de referência</p>
                                                <p className="font-mono break-all mt-1">{dossier.baseline.baselineHash}</p>
                                            </div>
                                            <div className="p-5 rounded-xl bg-gray-50 border border-gray-100">
                                                <p className="text-[10px] uppercase font-bold text-gray-400">NDVI médio</p>
                                                <p className="font-black text-xl mt-1">{dossier.baseline.ndviMean}</p>
                                            </div>
                                            <div className="p-5 rounded-xl bg-gray-50 border border-gray-100">
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Pontos analisados</p>
                                                <p className="font-black text-xl mt-1">{dossier.baseline.pointsAnalyzed?.toLocaleString('pt-BR')}</p>
                                            </div>
                                            <div className="p-5 rounded-xl bg-amber-50 border border-amber-100">
                                                <p className="text-[10px] uppercase font-bold text-amber-700">Fonte do baseline</p>
                                                <p className="font-bold text-amber-900 mt-1">{technicalStatusLabel(metadata.baseline_source || metadata.baseline_adapter)}</p>
                                            </div>
                                            <div className="p-5 rounded-xl bg-amber-50 border border-amber-100">
                                                <p className="text-[10px] uppercase font-bold text-amber-700">Status Sentinel</p>
                                                <p className="font-bold text-amber-900 mt-1">{technicalStatusLabel(metadata.sentinel_status)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <EmptyState text="Baseline público ainda não registrado." />
                                    )}
                                </div>
                            </section>
                        )}

                        {activeTab === 'documents' && (
                            <section className="space-y-8">
                                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">Certificações</h3>
                                    {dossier.certifications.length > 0 ? (
                                        <div className="space-y-4">
                                            {dossier.certifications.map((cert) => (
                                                <div key={cert.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-black uppercase">{cert.decision}</p>
                                                            <p className="text-xs text-gray-500 mt-1">{cert.methodology} - potencial {formatTons(cert.creditPotential)}</p>
                                                        </div>
                                                        <p className="text-[10px] font-mono text-primary break-all">{cert.signedDocumentHash || 'Documento não registrado'}</p>
                                                    </div>
                                                    {cert.notes && <p className="text-sm text-gray-500 mt-4">{cert.notes}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState text="Nenhuma certificação pública registrada." />
                                    )}
                                </div>

                                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">Auditorias e laudos</h3>
                                    {dossier.audits.length > 0 ? (
                                        <div className="space-y-4">
                                            {dossier.audits.map((audit) => (
                                                <div key={audit.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <p className="text-sm font-black uppercase">{audit.status}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{formatDate(audit.auditedAt || audit.createdAt)}</p>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-4">{audit.reportText || 'Laudo público não informado.'}</p>
                                                    <p className="text-[10px] font-mono text-primary mt-4 break-all">{audit.digitalSignature || 'Assinatura não registrada'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState text="Nenhuma auditoria pública registrada." />
                                    )}
                                </div>

                                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">Documentos públicos</h3>
                                    {dossier.documents.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {dossier.documents.map((doc) => (
                                                <div key={doc.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50">
                                                    <FileText className="w-5 h-5 text-primary mb-4" />
                                                    <p className="text-sm font-black uppercase">{documentTypeLabel(doc.type)}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{doc.mimeType} - {Number(doc.sizeBytes || 0).toLocaleString('pt-BR')} bytes</p>
                                                    <p className="text-[10px] font-mono text-primary mt-4 break-all">{doc.sha256Hash}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState text="Nenhum documento público registrado." />
                                    )}
                                </div>
                            </section>
                        )}

                        {activeTab === 'transactions' && (
                            <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">Transações relacionadas</h3>
                                {dossier.transactions.length > 0 ? (
                                    <div className="space-y-3">
                                        {dossier.transactions.map((tx) => (
                                            <button
                                                key={tx.id}
                                                onClick={() => navigate(`/tx/${tx.hash}`)}
                                                className="w-full p-5 rounded-xl border border-gray-100 bg-gray-50 hover:border-primary/30 text-left transition-colors"
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-black uppercase">{tx.type}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{tx.asset} - {tx.amount} {tx.unit}</p>
                                                    </div>
                                                    <p className="text-[10px] font-mono text-primary break-all">{tx.hash}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState text="Nenhuma transação pública relacionada a este projeto." />
                                )}
                            </section>
                        )}
                    </div>

                    <aside className="space-y-6">
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
                            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">Créditos</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-bold uppercase tracking-widest">Disponível</span>
                                    <span className="text-black font-black">{formatTons(primaryCredit?.quantityAvailable)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-bold uppercase tracking-widest">Aposentado</span>
                                    <span className="text-black font-black">{formatTons(primaryCredit?.quantityRetired)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-bold uppercase tracking-widest">Vintage</span>
                                    <span className="text-black font-black">{primaryCredit?.vintage || project.metrics.vintage}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#050a06] p-8 rounded-2xl text-white">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-white/40">Entidades vinculadas</h3>
                            <div className="space-y-5">
                                {entityLinks.map((entity) => (
                                    <button
                                        key={`${entity.role}-${entity.id}`}
                                        onClick={() => navigate(`/perfil/${entity.id}`)}
                                        className="w-full flex items-center gap-4 text-left hover:bg-white/5 rounded-xl p-2 transition-colors"
                                    >
                                        <Users className="w-5 h-5 text-primary shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-white/40 font-bold uppercase">{entity.role}</p>
                                            <p className="text-sm font-bold truncate">{entity.name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">Registro</h3>
                            <div className="space-y-4 text-xs">
                                <div className="flex gap-3">
                                    <Hash className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <p className="font-mono text-gray-500 break-all">{project.blockchain.initialHash}</p>
                                </div>
                                <div className="flex gap-3">
                                    <Database className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <p className="font-mono text-gray-500 break-all">{project.blockchain.contractAddress}</p>
                                </div>
                                <div className="flex gap-3">
                                    <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <p className="font-mono text-gray-500">{formatDate(project.blockchain.timestamp)}</p>
                                </div>
                                <div className="flex gap-3">
                                    <Layers className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <p className="font-mono text-gray-500 break-all">{project.blockchain.merkleRoot}</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
