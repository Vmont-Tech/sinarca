import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronLeft, FileText, Leaf, Loader2, MapPin, Radio, ScanLine, ShieldCheck, Upload, WifiOff } from 'lucide-react';
import ProjectGeofencePreview from '../../components/ProjectGeofencePreview';
import { useAuth } from '../../contexts/AuthContext';
import { apiPost } from '../../services/api';
import { database } from '../../services/database';
import { detectFieldCapabilities, getNfcCaptureStatus, requestCurrentPosition } from '../../services/fieldCapture';
import {
    REQUIRED_VERTICES,
    averageCoordinates,
    createEmptyProjectTagDrafts,
    normalizeProjectTags,
    validateTagDrafts,
    type ProjectTagDraft,
    type VertexLabel,
} from '../../services/projectOrigination';

type StepId = 'project' | 'qtags' | 'documents' | 'review';

type ProjectFormState = {
    name: string;
    description: string;
    producerId: string;
    city: string;
    state: string;
    bioma: string;
    methodology: string;
    projectType: string;
    areaHectares: string;
    carbonStock: string;
    certifierId: string;
};

const steps: Array<{ id: StepId; label: string; icon: React.ElementType }> = [
    { id: 'project', label: 'Projeto', icon: Leaf },
    { id: 'qtags', label: 'QTAGs', icon: ScanLine },
    { id: 'documents', label: 'Documentos', icon: Upload },
    { id: 'review', label: 'Revisão', icon: ShieldCheck },
];

const biomeOptions = ['Amazônia', 'Cerrado', 'Mata Atlântica', 'Caatinga', 'Pampa', 'Pantanal'];

const projectTypeOptions = [
    { value: 'reforestation', label: 'Restauração / Reflorestamento' },
    { value: 'forest_conservation', label: 'Conservação florestal' },
    { value: 'solar_energy', label: 'Energia renovável' },
];

const methodologyOptions = ['VM0015 (Verra)', 'AR-ACM0003', 'ACM0002', 'Metodologia própria em revisão'];

const initialForm: ProjectFormState = {
    name: '',
    description: '',
    producerId: '',
    city: '',
    state: '',
    bioma: 'Cerrado',
    methodology: 'VM0015 (Verra)',
    projectType: 'reforestation',
    areaHectares: '',
    carbonStock: '',
    certifierId: '',
};

const numericValueIsPositive = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
};

const normalizeStateId = (value: string) => value.trim().slice(0, 2).toLowerCase();

export default function AddProject() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState<StepId>('project');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touchedSteps, setTouchedSteps] = useState<Partial<Record<StepId, boolean>>>({});
    const [certifiers, setCertifiers] = useState<any[]>([]);
    const [producers, setProducers] = useState<any[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [form, setForm] = useState<ProjectFormState>(initialForm);
    const [tags, setTags] = useState<ProjectTagDraft[]>(createEmptyProjectTagDrafts);

    const currentStepIndex = steps.findIndex((item) => item.id === step);
    const needsProducerSelection = user?.role !== 'producer';
    const tagValidation = useMemo(() => validateTagDrafts(tags), [tags]);
    const fieldCapabilities = useMemo(() => detectFieldCapabilities(), []);
    const nfcCaptureStatus = useMemo(() => getNfcCaptureStatus(), []);
    const [locationLoadingVertex, setLocationLoadingVertex] = useState<VertexLabel | null>(null);
    const [locationErrors, setLocationErrors] = useState<Partial<Record<VertexLabel, string>>>({});

    useEffect(() => {
        let active = true;

        const loadCatalog = async () => {
            setLoadingCatalog(true);
            const [loadedCertifiers, loadedProducers] = await Promise.all([
                database.getCertifiers(),
                needsProducerSelection ? database.getProducers() : Promise.resolve([]),
            ]);
            if (!active) return;

            setCertifiers(loadedCertifiers);
            setProducers(loadedProducers);
            setForm((current) => ({
                ...current,
                certifierId: current.certifierId || loadedCertifiers[0]?.id || '',
                producerId: current.producerId || loadedProducers[0]?.id || '',
            }));
            setLoadingCatalog(false);
        };

        loadCatalog().catch((err) => {
            if (!active) return;
            setLoadingCatalog(false);
            setError(err instanceof Error ? err.message : 'Não foi possível carregar os catálogos.');
        });

        return () => {
            active = false;
        };
    }, [needsProducerSelection]);

    const updateField = (field: keyof ProjectFormState) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const value = event.target.value;
        setForm((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => {
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const patchTag = (vertex: VertexLabel, patch: Partial<ProjectTagDraft>) => {
        setTags((current) => current.map((tag) => (
            tag.vertex_label === vertex ? { ...tag, ...patch } : tag
        )));
    };

    const updateTag = (vertex: VertexLabel, field: 'tag_uid' | 'cmac' | 'latitude' | 'longitude') => (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        patchTag(vertex, { [field]: event.target.value } as Partial<ProjectTagDraft>);
    };

    const handleUseCurrentLocation = async (vertex: VertexLabel) => {
        setLocationLoadingVertex(vertex);
        setLocationErrors((current) => ({ ...current, [vertex]: undefined }));
        try {
            const position = await requestCurrentPosition();
            patchTag(vertex, {
                latitude: position.latitude.toFixed(6),
                longitude: position.longitude.toFixed(6),
                captureMode: 'manual',
            });
        } catch (err) {
            setLocationErrors((current) => ({
                ...current,
                [vertex]: err instanceof Error ? err.message : 'Não foi possível obter a localização atual.',
            }));
        } finally {
            setLocationLoadingVertex(null);
        }
    };

    const validateProjectStep = () => {
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = 'Informe o nome oficial do projeto.';
        if (!form.description.trim()) errors.description = 'Descreva o objetivo ambiental e o escopo do projeto.';
        if (needsProducerSelection && !form.producerId) errors.producerId = 'Selecione o produtor responsável.';
        if (!form.city.trim()) errors.city = 'Informe o município.';
        if (!form.state.trim()) errors.state = 'Informe a UF.';
        if (!form.bioma.trim()) errors.bioma = 'Selecione o bioma.';
        if (!form.methodology.trim()) errors.methodology = 'Selecione a metodologia declarada.';
        if (!form.projectType.trim()) errors.projectType = 'Selecione o tipo de projeto.';
        if (!numericValueIsPositive(form.areaHectares)) errors.areaHectares = 'Informe uma área maior que zero.';
        if (!numericValueIsPositive(form.carbonStock)) errors.carbonStock = 'Informe um estoque/potencial maior que zero.';
        if (!form.certifierId) errors.certifierId = 'Selecione a certificadora.';
        return errors;
    };

    const validateStep = (targetStep: StepId) => {
        setTouchedSteps((current) => ({ ...current, [targetStep]: true }));
        if (targetStep === 'project') {
            const errors = validateProjectStep();
            setFieldErrors(errors);
            return Object.keys(errors).length === 0;
        }
        if (targetStep === 'qtags') {
            return tagValidation.valid;
        }
        if (targetStep === 'review') {
            const projectErrors = validateProjectStep();
            setFieldErrors(projectErrors);
            return Object.keys(projectErrors).length === 0 && tagValidation.valid;
        }
        return true;
    };

    const goToNextStep = () => {
        setError('');
        if (!validateStep(step)) {
            setError('Revise os campos destacados antes de continuar.');
            return;
        }
        const nextStep = steps[currentStepIndex + 1]?.id;
        if (nextStep) setStep(nextStep);
    };

    const goBack = () => {
        setError('');
        const previousStep = steps[currentStepIndex - 1]?.id;
        if (previousStep) {
            setStep(previousStep);
            return;
        }
        navigate(-1);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        if (!validateStep('review')) {
            setError('Não foi possível criar o projeto. Revise os campos destacados e tente novamente.');
            setStep(Object.keys(validateProjectStep()).length > 0 ? 'project' : 'qtags');
            return;
        }

        setSubmitting(true);
        try {
            const coordinates = averageCoordinates(tags);
            const response = await apiPost<any>('/projects', {
                name: form.name.trim(),
                description: `${form.description.trim()}\n\nMetodologia declarada: ${form.methodology}`,
                project_type: form.projectType,
                producer_id: user?.role === 'producer' ? user.id : form.producerId,
                certifier_id: form.certifierId,
                area_hectares: Number(form.areaHectares),
                carbon_stock: Number(form.carbonStock),
                location: {
                    city: form.city.trim(),
                    state: form.state.trim().toUpperCase(),
                    stateId: normalizeStateId(form.state),
                    bioma: form.bioma,
                    coordinates,
                },
                tags: normalizeProjectTags(tags),
            });
            setCreatedProjectId(response?.project?.friendlyId || null);
            setSuccess(true);
            window.setTimeout(() => {
                navigate(response?.project?.friendlyId ? `/painel/mrca/${response.project.friendlyId}` : '/painel/projetos');
            }, 1600);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível criar o projeto. Revise os campos destacados e tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = (field: string) => (
        `min-h-11 w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 ${fieldErrors[field]
            ? 'border-red-300 bg-red-50 focus:border-red-500'
            : 'border-gray-200 bg-white focus:border-primary'}`
    );

    const renderFieldError = (field: string) => (
        fieldErrors[field] ? <p className="mt-2 text-xs font-semibold text-red-600">{fieldErrors[field]}</p> : null
    );

    const renderProjectStep = () => (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
                <Leaf className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-extrabold uppercase text-gray-900">Dados do projeto</h3>
            </div>

            {touchedSteps.project && Object.keys(fieldErrors).length > 0 && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex items-start gap-2 font-bold">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Revise os campos obrigatórios.</span>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs font-semibold">
                        {Object.values(fieldErrors).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {needsProducerSelection && (
                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="producerId">Produtor responsável</label>
                        <select id="producerId" value={form.producerId} onChange={updateField('producerId')} className={inputClass('producerId')} disabled={loadingCatalog}>
                            <option value="">Selecione</option>
                            {producers.map((producer) => (
                                <option key={producer.id} value={producer.id}>{producer.name}</option>
                            ))}
                        </select>
                        {renderFieldError('producerId')}
                    </div>
                )}

                <div className={needsProducerSelection ? '' : 'md:col-span-2'}>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="name">Nome do projeto</label>
                    <input id="name" type="text" value={form.name} onChange={updateField('name')} className={inputClass('name')} placeholder="Reserva Rio Claro" />
                    {renderFieldError('name')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="city">Município</label>
                    <input id="city" type="text" value={form.city} onChange={updateField('city')} className={inputClass('city')} placeholder="Porto Nacional" />
                    {renderFieldError('city')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="state">UF</label>
                    <input id="state" type="text" value={form.state} onChange={updateField('state')} className={inputClass('state')} placeholder="TO" maxLength={2} />
                    {renderFieldError('state')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="bioma">Bioma</label>
                    <select id="bioma" value={form.bioma} onChange={updateField('bioma')} className={inputClass('bioma')}>
                        {biomeOptions.map((bioma) => <option key={bioma} value={bioma}>{bioma}</option>)}
                    </select>
                    {renderFieldError('bioma')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="projectType">Tipo de projeto</label>
                    <select id="projectType" value={form.projectType} onChange={updateField('projectType')} className={inputClass('projectType')}>
                        {projectTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {renderFieldError('projectType')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="methodology">Metodologia</label>
                    <select id="methodology" value={form.methodology} onChange={updateField('methodology')} className={inputClass('methodology')}>
                        {methodologyOptions.map((methodology) => <option key={methodology} value={methodology}>{methodology}</option>)}
                    </select>
                    {renderFieldError('methodology')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="certifierId">Certificadora</label>
                    <select id="certifierId" value={form.certifierId} onChange={updateField('certifierId')} className={inputClass('certifierId')} disabled={loadingCatalog}>
                        <option value="">Selecione</option>
                        {certifiers.map((certifier) => (
                            <option key={certifier.id} value={certifier.id}>{certifier.name}</option>
                        ))}
                    </select>
                    {renderFieldError('certifierId')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="areaHectares">Área total (ha)</label>
                    <input id="areaHectares" type="number" min="0" step="0.01" value={form.areaHectares} onChange={updateField('areaHectares')} className={inputClass('areaHectares')} placeholder="1200" />
                    {renderFieldError('areaHectares')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="carbonStock">Estoque/potencial (tCO2e)</label>
                    <input id="carbonStock" type="number" min="0" step="0.01" value={form.carbonStock} onChange={updateField('carbonStock')} className={inputClass('carbonStock')} placeholder="35000" />
                    {renderFieldError('carbonStock')}
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="description">Descrição</label>
                    <textarea id="description" value={form.description} onChange={updateField('description')} rows={4} className={inputClass('description')} placeholder="Escopo ambiental, histórico da área e objetivo do projeto." />
                    {renderFieldError('description')}
                </div>
            </div>
        </section>
    );

    const renderQtagStep = () => (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <ScanLine className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-extrabold uppercase text-gray-900">QTAGs e coordenadas</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${tagValidation.valid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {tagValidation.valid ? '4/4 prontas' : 'pendente'}
                </span>
            </div>

            {(!tagValidation.valid || touchedSteps.qtags) && (
                <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="flex items-start gap-2 font-bold">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Registre os quatro vértices para gerar a geofence.</span>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs font-semibold">
                        {tagValidation.errors.slice(0, 8).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            )}

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <Radio className="h-4 w-4" />
                        Contexto seguro
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-900">{fieldCapabilities.secureContext ? 'disponível' : 'indisponível'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <MapPin className="h-4 w-4" />
                        Geolocalização
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-900">{fieldCapabilities.geolocation === 'available' ? 'disponível' : 'indisponível'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <WifiOff className="h-4 w-4" />
                        NFC
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-900">{fieldCapabilities.nfc === 'available' ? 'bloqueado' : 'indisponível'}</p>
                </div>
            </div>

            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                {nfcCaptureStatus === 'unsupported'
                    ? 'Este navegador não permite leitura NFC aqui. Use captura manual ou um dispositivo compatível.'
                    : 'Validação SUN/CMAC real bloqueada por credenciais ou hardware. O CMAC informado será registrado como evidência declarada.'}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {REQUIRED_VERTICES.map((vertex) => {
                        const tag = tags.find((item) => item.vertex_label === vertex) || createEmptyProjectTagDrafts().find((item) => item.vertex_label === vertex)!;
                        const vertexErrors = tagValidation.vertexErrors[vertex] || [];
                        const hasAnyValue = Boolean(tag.tag_uid || tag.cmac || tag.latitude || tag.longitude);
                        const statusLabel = vertexErrors.length === 0 && hasAnyValue ? 'pronto' : hasAnyValue ? 'manual' : 'pendente';

                        return (
                            <div key={vertex} className="rounded-lg border border-gray-200 p-4">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-gray-500">Vértice {vertex}</p>
                                        <p className="text-sm font-bold text-gray-900">QTAG {vertex}</p>
                                    </div>
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{statusLabel}</span>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor={`tag-${vertex}-uid`}>UID</label>
                                        <input id={`tag-${vertex}-uid`} type="text" value={tag.tag_uid} onChange={updateTag(vertex, 'tag_uid')} className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder={`ntag-${vertex}`} />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor={`tag-${vertex}-cmac`}>CMAC</label>
                                        <input id={`tag-${vertex}-cmac`} type="text" value={tag.cmac} onChange={updateTag(vertex, 'cmac')} className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="cmac declarado" />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor={`tag-${vertex}-lat`}>Latitude</label>
                                        <input id={`tag-${vertex}-lat`} inputMode="decimal" value={tag.latitude} onChange={updateTag(vertex, 'latitude')} className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="-10.700000" />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor={`tag-${vertex}-lng`}>Longitude</label>
                                        <input id={`tag-${vertex}-lng`} inputMode="decimal" value={tag.longitude} onChange={updateTag(vertex, 'longitude')} className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="-48.410000" />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleUseCurrentLocation(vertex)}
                                    disabled={fieldCapabilities.geolocation === 'unsupported' || locationLoadingVertex === vertex}
                                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {locationLoadingVertex === vertex ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                    Usar localização atual
                                </button>

                                {locationErrors[vertex] && (
                                    <p className="mt-3 text-xs font-semibold text-red-600">{locationErrors[vertex]}</p>
                                )}

                                {vertexErrors.length > 0 && (
                                    <ul className="mt-3 space-y-1 text-xs font-semibold text-red-600">
                                        {vertexErrors.map((item) => <li key={item}>{item}</li>)}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </div>

                <ProjectGeofencePreview tags={tags} errors={tagValidation.errors} />
            </div>
        </section>
    );

    const renderDocumentsStep = () => (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-extrabold uppercase text-gray-900">Documentos</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {['Matrícula/CAR', 'Inventário florestal', 'Arquivo geoespacial'].map((item) => (
                    <div key={item} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                        <Upload className="mb-3 h-5 w-5 text-gray-500" />
                        <p className="text-sm font-bold text-gray-900">{item}</p>
                        <p className="mt-2 text-xs font-semibold text-amber-700">Pendente de envio</p>
                    </div>
                ))}
            </div>
        </section>
    );

    const renderReviewStep = () => (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-extrabold uppercase text-gray-900">Revisão e envio</h3>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs font-bold uppercase text-gray-500">Projeto</p>
                    <p className="mt-2 text-lg font-bold text-gray-950">{form.name || 'Nome pendente'}</p>
                    <p className="mt-1 text-sm text-gray-600">{form.city || 'Município'}, {form.state || 'UF'} · {form.bioma}</p>
                    <p className="mt-1 text-sm text-gray-600">{form.methodology} · {form.areaHectares || '0'} ha · {form.carbonStock || '0'} tCO2e</p>
                </div>

                <ProjectGeofencePreview tags={tags} errors={tagValidation.errors} />
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-2 font-bold">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Validação SUN/CMAC real bloqueada por credenciais ou hardware. O CMAC informado será registrado como evidência declarada.</span>
                </div>
            </div>
        </section>
    );

    if (success) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <h2 className="mb-4 text-3xl font-bold text-black">Projeto criado</h2>
                <p className="mx-auto max-w-md text-gray-500">
                    {createdProjectId ? `Projeto ${createdProjectId} criado e enviado para a fila da certificadora.` : 'Projeto criado e enviado para a fila da certificadora.'}
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-black">Adicionar projeto</h2>
                <p className="mt-1 text-sm text-gray-500">Originação técnica com QTAGs, geofence e dossiê inicial.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {steps.map((item, index) => {
                    const Icon = item.icon;
                    const active = item.id === step;
                    const completed = index < currentStepIndex;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => index <= currentStepIndex && setStep(item.id)}
                            className={`min-h-11 rounded-lg border px-4 py-3 text-left transition-colors ${active
                                ? 'border-primary bg-primary text-white'
                                : completed
                                    ? 'border-green-200 bg-green-50 text-green-800'
                                    : 'border-gray-200 bg-white text-gray-500'}`}
                            aria-current={active ? 'step' : undefined}
                            disabled={index > currentStepIndex}
                        >
                            <span className="flex items-center gap-2 text-sm font-bold">
                                <Icon className="h-4 w-4" />
                                {index + 1}. {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {step === 'project' && renderProjectStep()}
                {step === 'qtags' && renderQtagStep()}
                {step === 'documents' && renderDocumentsStep()}
                {step === 'review' && renderReviewStep()}

                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Voltar
                    </button>

                    {step === 'review' ? (
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex min-h-11 min-w-40 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Criar projeto
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={goToNextStep}
                            className="inline-flex min-h-11 min-w-40 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90"
                        >
                            Continuar
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
