import React, { useState } from 'react';
import { 
    Calculator, 
    Upload, 
    FileText, 
    Zap, 
    Factory, 
    Truck, 
    Globe, 
    CheckCircle2, 
    ArrowRight,
    AlertCircle,
    Info
} from 'lucide-react';

export default function ImpactInventory() {
    const [step, setStep] = useState(1);
    const [scope1, setScope1] = useState('');
    const [scope2, setScope2] = useState('');
    const [scope3, setScope3] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const totalEmissions = (Number(scope1) || 0) + (Number(scope2) || 0) + (Number(scope3) || 0);

    return (
        <div className="flex flex-col gap-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight">Inventário de Impacto</h1>
                    <p className="text-gray-400 mt-1">Declare suas emissões e comprove seu compromisso ambiental</p>
                </div>
                <div className="flex items-center gap-4">
                    {[1, 2, 3].map((s) => (
                        <div 
                            key={s} 
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                step === s ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 
                                step > s ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-400'
                            }`}
                        >
                            {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    {step === 1 && (
                        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-bold text-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <Calculator className="w-6 h-6 text-primary" /> 1. Declaração Manual de Emissões
                            </h2>
                            
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Factory className="w-3 h-3" /> Escopo 1 (Diretas)
                                            </label>
                                            <Info className="w-3 h-3 text-gray-300 cursor-help" />
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                placeholder="0.00"
                                                value={scope1}
                                                onChange={(e) => setScope1(e.target.value)}
                                                className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">tCO2e</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Zap className="w-3 h-3" /> Escopo 2 (Energia)
                                            </label>
                                            <Info className="w-3 h-3 text-gray-300 cursor-help" />
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                placeholder="0.00"
                                                value={scope2}
                                                onChange={(e) => setScope2(e.target.value)}
                                                className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">tCO2e</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 md:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Truck className="w-3 h-3" /> Escopo 3 (Cadeia de Valor)
                                            </label>
                                            <Info className="w-3 h-3 text-gray-300 cursor-help" />
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                placeholder="0.00"
                                                value={scope3}
                                                onChange={(e) => setScope3(e.target.value)}
                                                className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">tCO2e</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 flex justify-end">
                                    <button 
                                        onClick={() => setStep(2)}
                                        className="px-10 py-4 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:bg-primary transition-all shadow-xl"
                                    >
                                        Próximo Passo <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-xl font-bold text-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <Upload className="w-6 h-6 text-primary" /> 2. Comprovação Documental
                            </h2>
                            
                            <div 
                                className={`border-2 border-dashed rounded-[2rem] p-20 flex flex-col items-center justify-center transition-all ${
                                    file ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50'
                                }`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
                                }}
                            >
                                <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center text-gray-300 mb-6 group-hover:text-primary transition-colors">
                                    <FileText className="w-10 h-10" />
                                </div>
                                <h3 className="text-sm font-bold text-black uppercase tracking-tight mb-2">
                                    {file ? file.name : 'Arraste seu PDF de inventário aqui'}
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Formatos aceitos: PDF, DOCX (Máx 20MB)</p>
                                
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    id="file-upload" 
                                    onChange={(e) => e.target.files && setFile(e.target.files[0])}
                                />
                                <label 
                                    htmlFor="file-upload" 
                                    className="mt-8 px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 cursor-pointer transition-all"
                                >
                                    Selecionar Arquivo
                                </label>
                            </div>

                            <div className="mt-12 flex justify-between">
                                <button 
                                    onClick={() => setStep(1)}
                                    className="px-10 py-4 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-black transition-all"
                                >
                                    Voltar
                                </button>
                                <button 
                                    onClick={() => setStep(3)}
                                    disabled={!file}
                                    className="px-10 py-4 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl"
                                >
                                    Finalizar Declaração <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in fade-in zoom-in-95 duration-500 text-center py-20">
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-10">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <h2 className="text-3xl font-bold text-black tracking-tight mb-4">Inventário Submetido</h2>
                            <p className="text-gray-400 max-w-md mx-auto mb-12">
                                Sua declaração de {totalEmissions} tCO2e foi recebida e está sendo processada pela infraestrutura Blockchain da SINARCA.
                            </p>
                            
                            <div className="bg-gray-50 rounded-3xl p-8 max-w-sm mx-auto border border-gray-100 mb-12">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Necessidade de Compensação</p>
                                <p className="text-3xl font-black text-black">{totalEmissions} <span className="text-sm">tCO2e</span></p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 justify-center">
                                <button 
                                    onClick={() => window.location.href = '/painel/projetos'}
                                    className="px-10 py-4 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all"
                                >
                                    Comprar Créditos Agora
                                </button>
                                <button 
                                    onClick={() => setStep(1)}
                                    className="px-10 py-4 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-black transition-all"
                                >
                                    Nova Declaração
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-black p-8 rounded-[2.5rem] text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full"></div>
                        <h3 className="text-lg font-bold uppercase tracking-widest mb-6 relative z-10">Resumo de Impacto</h3>
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                <span className="text-[10px] font-bold text-white/40 uppercase">Total Declarado</span>
                                <span className="text-xl font-bold">{totalEmissions} tCO2e</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                <span className="text-[10px] font-bold text-white/40 uppercase">Status</span>
                                <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">Aguardando</span>
                            </div>
                        </div>
                        <div className="mt-10 p-4 bg-white/5 rounded-2xl border border-white/10 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                            <p className="text-[10px] text-white/60 leading-relaxed font-medium">
                                A compensação destes valores via SINARCA gera o selo de conformidade ambiental nível A1.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h4 className="text-sm font-bold text-black uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" /> Por que declarar?
                        </h4>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <span className="text-xs font-black">01</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Transparência radical para investidores ESG.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <span className="text-xs font-black">02</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Conformidade com regulamentações globais.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <span className="text-xs font-black">03</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Facilitação no processo de auditoria externa.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
