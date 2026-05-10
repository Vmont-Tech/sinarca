import React from 'react';
import { X, Globe2, ShieldCheck, Leaf } from 'lucide-react';

interface InstitutionalModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const InstitutionalModal: React.FC<InstitutionalModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[var(--bg-deep)] border border-[var(--border-color)] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="bg-white/5 px-10 py-10 border-b border-[var(--border-color)]">
                    <h2 className="text-3xl font-bold text-white font-display uppercase tracking-tighter mb-2">SINARCA - Infraestrutura Nacional</h2>
                    <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">Separação entre Inventário Público e Mercado Voluntário</p>
                </div>

                {/* Content */}
                <div className="p-10 space-y-12">

                    {/* Section 1: Introduction */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
                            <Globe2 className="text-[var(--accent-color)] w-6 h-6" />
                            Por que existem dados governamentais e projetos privados?
                        </h3>
                        <p className="text-gray-400 leading-relaxed text-sm font-light">
                            O SINARCA é uma infraestrutura nacional de rastreabilidade ambiental. Ele reúne dois tipos distintos de informação,
                            que <strong>não se misturam:</strong>
                        </p>

                        <div className="grid md:grid-cols-2 gap-6 mt-6">
                            <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
                                <span className="text-[var(--accent-color)] font-bold uppercase text-[10px] tracking-widest block mb-4">Inventários Públicos</span>
                                <p className="text-gray-500 text-xs leading-relaxed">
                                    Dados oficiais de emissões e compensações da União, Estados e Municípios, usados para transparência climática e cumprimento de compromissos internacionais (NDCs).
                                    <br /><br />
                                    <strong>Estes dados não geram ativos comerciais.</strong>
                                </p>
                            </div>
                            <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
                                <span className="text-blue-400 font-bold uppercase text-[10px] tracking-widest block mb-4">Projetos Ambientais Privados</span>
                                <p className="text-gray-500 text-xs leading-relaxed">
                                    Iniciativas auditadas que geram <strong>Créditos Ambientais</strong> para compensação voluntária ou regulada, conforme metodologias reconhecidas.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Paris Agreement */}
                    <div className="space-y-6 border-t border-white/5 pt-12">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
                            <ShieldCheck className="text-blue-500 w-6 h-6" />
                            Alinhamento Global (Acordo de Paris)
                        </h3>
                        <p className="text-gray-400 leading-relaxed text-sm font-light">
                            O SINARCA garante a separação clara entre as NDCs da União e as transações de mercado voluntário, evitando a <strong>dupla contagem</strong> e respeitando o Artigo 6.
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-8 border-t border-white/5 bg-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-[var(--accent-color)] text-[var(--bg-main)] px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
                    >
                        Entendi o Protocolo
                    </button>
                </div>

            </div>
        </div>
    );
};
