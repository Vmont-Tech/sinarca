import {
    AlertTriangle,
    FileText,
    Lock,
    Shield,
    UploadCloud,
    Info,
    ChevronDown
} from 'lucide-react';

export default function Reports() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Header Section */}
            <section className="relative py-12 sm:py-20 overflow-hidden bg-sinarca-deep border-b border-sinarca-border">
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                    <div className="w-full h-full bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuD__CvjkjuFwo43p9A5_oYuvG0pUXksXOt7SJs8G36o2I_uMtsm8Q7q0yAzX-vQTYiejXNlzkpwZRBcXcD6xIDACqpMWISD_ftM1FmNWB9QjmWQfawL2wMdjdej5IA-3YuH8PUoYbj66Kg2N93etEyQzKm8JavWuVNswQ2OH1T_jeO91Ijpl4IVx5PCqgoxrz3Fe376UdGPJVrzCCEZ911IoKPST2fwVUwmoB28AWANCJpGgLzgqFElVm8x_TUxnI67R4eQMEvTYZE')] bg-cover mix-blend-overlay"></div>
                </div>
                <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sinarca-forest border border-sinarca-border mb-6 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-sinarca-neon">Canal Seguro & Anônimo</span>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                        Relate Irregularidades em <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-sinarca-neon to-emerald-400">Créditos Ambientais</span>
                    </h1>
                    <p className="text-lg text-text-muted mb-8 max-w-2xl mx-auto font-light leading-relaxed">
                        Ajude a manter a integridade do Sistema Nacional de Rastreabilidade. Sua denúncia é fundamental para garantir a transparência e a validade dos ativos ambientais. Garantimos sigilo absoluto.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-grow">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* Form Column */}
                    <div className="lg:col-span-7">
                        <div className="bg-sinarca-deep rounded-2xl shadow-xl border border-sinarca-border p-6 sm:p-10 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sinarca-forest via-sinarca-neon to-sinarca-forest"></div>

                            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                                <div className="mb-8 border-b border-sinarca-border pb-4">
                                    <h3 className="text-2xl font-serif font-semibold text-white flex items-center gap-2">
                                        <AlertTriangle className="text-sinarca-neon w-6 h-6" />
                                        Detalhes da Ocorrência
                                    </h3>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-2" htmlFor="type">Tipo de Irregularidade *</label>
                                    <div className="relative">
                                        <select className="block w-full rounded-lg border-sinarca-border bg-sinarca-forest text-white shadow-sm focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon sm:text-sm py-3 px-4 appearance-none" id="type" name="type">
                                            <option disabled selected value="">Selecione a categoria</option>
                                            <option>Dupla contagem de créditos</option>
                                            <option>Falsificação de documentos</option>
                                            <option>Desmatamento ilegal em área protegida</option>
                                            <option>Violação de direitos comunitários</option>
                                            <option>Inconsistência no inventário de carbono</option>
                                            <option>Outros</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                            <ChevronDown className="w-4 h-4 text-text-muted" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2" htmlFor="mrca">
                                            Nº MRCA ou ID do Projeto
                                            <span className="text-text-muted font-normal ml-1 text-xs">(Opcional)</span>
                                        </label>
                                        <div className="relative rounded-md shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span className="text-text-muted sm:text-sm">#</span>
                                            </div>
                                            <input className="block w-full rounded-lg border-sinarca-border bg-sinarca-forest text-white pl-7 py-3 shadow-sm focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon sm:text-sm placeholder-text-muted/50" id="mrca" name="mrca" placeholder="Ex: BR-2023-8492" type="text" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2" htmlFor="date">Data do Ocorrido</label>
                                        <div className="relative">
                                            <input className="block w-full rounded-lg border-sinarca-border bg-sinarca-forest text-white shadow-sm focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon sm:text-sm py-3 px-4" id="date" name="date" type="date" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-2" htmlFor="description">Descrição Detalhada *</label>
                                    <div className="mt-1">
                                        <textarea className="block w-full rounded-lg border-sinarca-border bg-sinarca-forest text-white shadow-sm focus:border-sinarca-neon focus:ring-1 focus:ring-sinarca-neon sm:text-sm p-4 placeholder-text-muted/50" id="description" name="description" placeholder="Descreva o que aconteceu, onde e quem são os envolvidos. Quanto mais detalhes, melhor para a investigação." rows={5}></textarea>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Evidências (Imagens, PDFs)</label>
                                    <div className="flex justify-center rounded-lg border-2 border-dashed border-sinarca-border px-6 py-8 hover:border-sinarca-neon transition-colors cursor-pointer bg-sinarca-forest/50 group">
                                        <div className="text-center">
                                            <UploadCloud className="mx-auto h-12 w-12 text-text-muted group-hover:text-sinarca-neon transition-colors" />
                                            <div className="mt-4 flex text-sm text-text-muted justify-center">
                                                <label className="relative cursor-pointer rounded-md font-medium text-sinarca-neon focus-within:outline-none hover:underline">
                                                    <span>Upload de arquivos</span>
                                                    <input className="sr-only" id="file-upload" name="file-upload" type="file" />
                                                </label>
                                                <p className="pl-1">ou arraste e solte</p>
                                            </div>
                                            <p className="text-xs text-text-muted mt-2">PNG, JPG, PDF até 10MB</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-sinarca-border">
                                    <div className="flex items-start">
                                        <div className="flex h-5 items-center">
                                            <input defaultChecked className="h-4 w-4 rounded border-sinarca-border text-sinarca-neon focus:ring-sinarca-neon bg-sinarca-forest" id="anonymous" name="anonymous" type="checkbox" />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <label className="font-medium text-white" htmlFor="anonymous">Desejo permanecer anônimo</label>
                                            <p className="text-text-muted mt-0.5">Se desmarcar, entraremos em contato para atualizar sobre o status da denúncia.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button className="w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-sinarca-forest bg-sinarca-neon hover:bg-[#00cc76] transition-all transform hover:scale-[1.01] shadow-[0_0_15px_rgba(0,255,148,0.2)]" type="submit">
                                        <Lock className="w-5 h-5 mr-2" />
                                        Enviar Denúncia Segura
                                    </button>
                                    <p className="mt-4 text-center text-xs text-text-muted flex justify-center items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        Seus dados são criptografados e processados com segurança.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Info Column */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-sinarca-forest/50 rounded-2xl p-8 border border-sinarca-border">
                            <h4 className="font-serif text-xl font-bold text-white mb-4">Por que denunciar?</h4>
                            <p className="text-sm text-text-muted mb-6 leading-relaxed">
                                O SINARCA funciona como uma rede viva. A integridade do mercado de carbono depende da vigilância coletiva. Reportar irregularidades protege investimentos legítimos e o meio ambiente.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start text-sm text-white">
                                    <Info className="text-sinarca-neon w-5 h-5 mt-0.5 mr-3 shrink-0" />
                                    <span>Transparência total do ciclo de vida dos créditos.</span>
                                </li>
                                <li className="flex items-start text-sm text-white">
                                    <Shield className="text-sinarca-neon w-5 h-5 mt-0.5 mr-3 shrink-0" />
                                    <span>Combate ao "Greenwashing" e fraudes.</span>
                                </li>
                                <li className="flex items-start text-sm text-white">
                                    <FileText className="text-sinarca-neon w-5 h-5 mt-0.5 mr-3 shrink-0" />
                                    <span>Proteção de comunidades locais e áreas de preservação.</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-serif text-lg font-bold text-white mb-6">O que acontece depois?</h4>
                            <div className="relative pl-4 border-l-2 border-sinarca-border space-y-8">
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-sinarca-neon ring-4 ring-sinarca-forest"></span>
                                    <h5 className="text-sm font-bold text-white">1. Análise Preliminar</h5>
                                    <p className="text-xs text-text-muted mt-1">Nossa equipe de compliance verifica as evidências enviadas em até 48 horas.</p>
                                </div>
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-sinarca-deep ring-4 ring-sinarca-forest"></span>
                                    <h5 className="text-sm font-bold text-white">2. Investigação Técnica</h5>
                                    <p className="text-xs text-text-muted mt-1">Auditores independentes podem ser acionados para vistoria in-loco ou análise via satélite.</p>
                                </div>
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-sinarca-deep ring-4 ring-sinarca-forest"></span>
                                    <h5 className="text-sm font-bold text-white">3. Resolução</h5>
                                    <p className="text-xs text-text-muted mt-1">Se comprovada a fraude, os créditos são congelados e as autoridades competentes notificadas.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-[#002B1C] to-[#001f14] rounded-xl p-6 text-center border border-sinarca-border shadow-lg">
                            <div className="w-12 h-12 bg-sinarca-deep rounded-full flex items-center justify-center mx-auto mb-3 text-sinarca-neon">
                                <Info className="w-6 h-6" />
                            </div>
                            <h5 className="text-white font-bold mb-2">Dúvidas sobre o processo?</h5>
                            <p className="text-xs text-text-muted mb-4">Consulte nossa central de ajuda ou fale com o suporte jurídico.</p>
                            <a className="inline-block text-xs font-bold text-sinarca-neon hover:text-white underline transition-colors cursor-pointer">
                                Acessar FAQ
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
