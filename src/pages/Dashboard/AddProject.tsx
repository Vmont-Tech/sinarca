import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Upload, CheckCircle2, ShieldCheck, PenTool } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AddProject() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        // Simulate API call for adding a project
        setTimeout(() => {
            setSubmitting(false);
            setSuccess(true);
            setTimeout(() => {
                navigate('/painel');
            }, 2000);
        }, 1500);
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-black mb-4">Projeto Enviado com Sucesso!</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                    Seu projeto foi assinado digitalmente e enviado para a fila da Certificadora. 
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
                
                {/* Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Leaf className="w-4 h-4" /> 1. Dados Básicos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Nome do Projeto</label>
                            <input required type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Ex: Reflorestamento Vale Verde" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Bioma</label>
                            <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary">
                                <option>Amazônia</option>
                                <option>Cerrado</option>
                                <option>Mata Atlântica</option>
                                <option>Caatinga</option>
                                <option>Pampa</option>
                                <option>Pantanal</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Área Total (Hectares)</label>
                            <input required type="number" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Ex: 5000" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Potencial Estimado (tCO2e)</label>
                            <input required type="number" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Ex: 150000" />
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
