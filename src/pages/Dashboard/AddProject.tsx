import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Upload, CheckCircle2, ShieldCheck, PenTool } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiPost } from '../../services/api';
import { database } from '../../services/database';

const stateOptions = [
    { id: 'to', state: 'Tocantins', city: 'Porto Nacional', lat: -10.70, lng: -48.41, svgX: 392, svgY: 292 },
    { id: 'pa', state: 'Pará', city: 'Altamira', lat: -3.20, lng: -52.20, svgX: 325, svgY: 125 },
    { id: 'am', state: 'Amazonas', city: 'Novo Aripuanã', lat: -7.21, lng: -60.36, svgX: 180, svgY: 160 },
    { id: 'sc', state: 'Santa Catarina', city: 'Joinville', lat: -26.30, lng: -48.84, svgX: 310, svgY: 410 },
];

export default function AddProject() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [certifiers, setCertifiers] = useState<any[]>([]);
    const [form, setForm] = useState({
        name: '',
        description: '',
        bioma: 'Cerrado',
        projectType: 'reforestation',
        stateId: 'to',
        areaHectares: '',
        carbonStock: '',
        certifierId: '',
    });

    useEffect(() => {
        const loadCatalog = async () => {
            const loadedCertifiers = await database.getCertifiers();
            setCertifiers(loadedCertifiers);
            if (loadedCertifiers[0]?.id) {
                setForm((current) => ({ ...current, certifierId: current.certifierId || loadedCertifiers[0].id }));
            }
        };
        loadCatalog().catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar certificadoras.'));
    }, []);

    const updateField = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        const selectedState = stateOptions.find((option) => option.id === form.stateId) || stateOptions[0];
        try {
            const response = await apiPost<any>('/projects', {
                name: form.name,
                description: form.description || `Projeto submetido por ${user?.name || 'responsável SINARCA'}.`,
                project_type: form.projectType,
                producer_id: user?.role === 'producer' ? user.id : undefined,
                certifier_id: form.certifierId,
                area_hectares: Number(form.areaHectares),
                carbon_stock: Number(form.carbonStock),
                location: {
                    city: selectedState.city,
                    state: selectedState.state,
                    stateId: selectedState.id,
                    bioma: form.bioma,
                    coordinates: {
                        lat: selectedState.lat,
                        lng: selectedState.lng,
                        svgX: selectedState.svgX,
                        svgY: selectedState.svgY,
                    },
                },
            });
            setCreatedProjectId(response?.project?.friendlyId || null);
            setSuccess(true);
            window.setTimeout(() => {
                navigate(response?.project?.friendlyId ? `/painel/mrca/${response.project.friendlyId}` : '/painel/projetos');
            }, 1600);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível registrar o projeto.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-black mb-4">Projeto Enviado com Sucesso!</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                    {createdProjectId ? `Projeto ${createdProjectId} registrado no banco e enviado para a fila da Certificadora.` : 'Seu projeto foi registrado no banco e enviado para a fila da Certificadora.'}
                    Acompanhe o status na aba de certificações.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
            <div>
                <h2 className="text-2xl font-bold text-black tracking-tight">Adicionar Novo Projeto</h2>
                <p className="text-sm text-gray-400">Preencha os dados do ativo ambiental para iniciar o processo de certificação na SINARCA.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col gap-8">
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}
                
                {/* Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Leaf className="w-4 h-4" /> 1. Dados Básicos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Nome do Projeto</label>
                            <input required type="text" value={form.name} onChange={updateField('name')} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Nome oficial do projeto" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Bioma</label>
                            <select value={form.bioma} onChange={updateField('bioma')} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary">
                                <option value="Amazônia">Amazônia</option>
                                <option value="Cerrado">Cerrado</option>
                                <option value="Mata Atlântica">Mata Atlântica</option>
                                <option value="Caatinga">Caatinga</option>
                                <option value="Pampa">Pampa</option>
                                <option value="Pantanal">Pantanal</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Descrição</label>
                        <textarea required value={form.description} onChange={updateField('description')} rows={3} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Descreva metodologia, área e objetivo ambiental" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Área Total (Hectares)</label>
                            <input required min="1" type="number" value={form.areaHectares} onChange={updateField('areaHectares')} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Área em hectares" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Potencial Estimado (tCO2e)</label>
                            <input required min="1" type="number" value={form.carbonStock} onChange={updateField('carbonStock')} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Potencial de créditos" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">UF / Região</label>
                            <select value={form.stateId} onChange={updateField('stateId')} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary">
                                {stateOptions.map((option) => (
                                    <option key={option.id} value={option.id}>{option.state}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Tipo</label>
                            <select value={form.projectType} onChange={updateField('projectType')} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary">
                                <option value="reforestation">Restauração / Reflorestamento</option>
                                <option value="forest_conservation">Conservação florestal</option>
                                <option value="solar_energy">Energia renovável</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Certificadora</label>
                            <select required value={form.certifierId} onChange={updateField('certifierId')} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary">
                                {certifiers.map((certifier) => (
                                    <option key={certifier.id} value={certifier.id}>{certifier.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Documents */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Upload className="w-4 h-4" /> 2. Documentação Comprobatória
                    </h3>
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                        <p className="text-sm font-bold text-black">Arraste os arquivos aqui ou clique para selecionar</p>
                        <p className="text-xs text-gray-400 mt-2">CAR, Shapefiles (KML/SHP), Matrícula do Imóvel, Relatório Preliminar (PDF)</p>
                    </div>
                </div>

                {/* Digital Signature */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <PenTool className="w-4 h-4" /> 3. Assinatura do Projeto (Responsável Técnico)
                    </h3>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-black">Termo de Responsabilidade Técnica</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Ao assinar este projeto, o responsável legal ({user?.name || 'Produtor'}) atesta sob as penas da lei a veracidade dos documentos anexados e a propriedade da área (ou autorização legal para exploração dos ativos ambientais).
                                </p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Chave de Assinatura (e-CPF/e-CNPJ)</label>
                                <input required type="password" value="************************" readOnly className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input required type="checkbox" className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                                    <span className="text-xs font-bold text-gray-700">Declaro que li e concordo com as regras de submissão da SINARCA.</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                    <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button>
                    <button type="submit" disabled={submitting} className="px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2">
                        {submitting ? 'Assinando e Enviando...' : 'Assinar Digitalmente e Enviar'}
                    </button>
                </div>

            </form>
        </div>
    );
}
