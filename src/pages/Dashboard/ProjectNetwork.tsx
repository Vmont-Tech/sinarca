import {
    Search,
    TreePine,
    Coins,
    Cloud,
    Network,
    Grid,
    TreeDeciduous,
    Zap,
    Droplets,
    FlaskConical,
    Check,
    ShieldCheck,
    ClipboardCheck,
    Landmark,
    Users,
    Map,
    History,
    ArrowRight,
    Plus,
    Minus,
    Focus,
    X
} from 'lucide-react';

export default function ProjectNetwork() {
    return (
        <div className="flex flex-col w-full h-full relative bg-[#0e160d] overflow-hidden min-h-[calc(100vh-64px)]">
            <div className="flex flex-col flex-1">
                {/* Header & Stats Area */}
                <div className="px-6 md:px-12 py-6 border-b border-[#2a3928] bg-[#132210]">
                    <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-end max-w-[1600px] mx-auto w-full">
                        {/* Page Heading */}
                        <div className="flex flex-col gap-2 max-w-2xl">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sinarca-neon text-xs font-bold uppercase tracking-wider border border-sinarca-neon/30 px-2 py-0.5 rounded">Rastreabilidade</span>
                                <span className="text-[#a0ba9c] text-xs font-medium px-2 py-0.5">Atualizado: 12 min atrás</span>
                            </div>
                            <h1 className="text-white text-4xl md:text-5xl font-serif font-bold leading-tight tracking-tight">Rede de Projetos</h1>
                            <p className="text-[#a0ba9c] text-base md:text-lg font-normal leading-relaxed mt-2">
                                Explore a interconexão dinâmica entre projetos ambientais, auditores e fluxos de créditos no ecossistema SINARCA. Visualize a proveniência e o destino de cada tCO2e.
                            </p>
                        </div>
                        {/* Horizontal Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full xl:w-auto">
                            <div className="flex flex-col gap-1 rounded-lg p-4 bg-[#1a2c17] border border-[#2a3928]">
                                <div className="flex items-center gap-2">
                                    <TreePine className="text-[#a0ba9c] w-4 h-4" />
                                    <p className="text-[#a0ba9c] text-xs font-medium uppercase">Projetos Ativos</p>
                                </div>
                                <p className="text-white text-2xl font-bold">1,245</p>
                                <p className="text-sinarca-neon text-xs font-medium">+12% este mês</p>
                            </div>
                            <div className="flex flex-col gap-1 rounded-lg p-4 bg-[#1a2c17] border border-[#2a3928]">
                                <div className="flex items-center gap-2">
                                    <Coins className="text-[#a0ba9c] w-4 h-4" />
                                    <p className="text-[#a0ba9c] text-xs font-medium uppercase">Créditos (Mi)</p>
                                </div>
                                <p className="text-white text-2xl font-bold">3.5M</p>
                                <p className="text-sinarca-neon text-xs font-medium">+5% vol.</p>
                            </div>
                            <div className="flex flex-col gap-1 rounded-lg p-4 bg-[#1a2c17] border border-[#2a3928]">
                                <div className="flex items-center gap-2">
                                    <Cloud className="text-[#a0ba9c] w-4 h-4" />
                                    <p className="text-[#a0ba9c] text-xs font-medium uppercase">Volume tCO2e</p>
                                </div>
                                <p className="text-white text-2xl font-bold">12.8M</p>
                                <p className="text-sinarca-neon text-xs font-medium">Estável</p>
                            </div>
                            <div className="flex flex-col gap-1 rounded-lg p-4 bg-[#1a2c17] border border-[#2a3928]">
                                <div className="flex items-center gap-2">
                                    <Network className="text-[#a0ba9c] w-4 h-4" />
                                    <p className="text-[#a0ba9c] text-xs font-medium uppercase">Nós Conectados</p>
                                </div>
                                <p className="text-white text-2xl font-bold">450</p>
                                <p className="text-sinarca-neon text-xs font-medium">+2 novos</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Controls Bar */}
                <div className="px-6 md:px-12 py-4 bg-[#121811] border-b border-[#2a3928]">
                    <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                        {/* Search */}
                        <div className="w-full md:w-1/3">
                            <div className="flex w-full items-center rounded-lg bg-[#1a2c17] border border-[#2a3928] focus-within:border-sinarca-neon transition-colors h-10">
                                <div className="text-[#a0ba9c] flex items-center justify-center pl-3">
                                    <Search className="w-5 h-5" />
                                </div>
                                <input className="w-full bg-transparent border-none text-white focus:ring-0 placeholder:text-[#a0ba9c]/70 text-sm h-full px-3" placeholder="Buscar ID do projeto, empresa ou certificadora..." />
                            </div>
                        </div>
                        {/* Chips */}
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
                            <button className="flex items-center gap-2 px-3 h-8 rounded-full bg-sinarca-neon text-[#121811] text-xs font-bold whitespace-nowrap">
                                <Grid className="w-4 h-4" />
                                Todos
                            </button>
                            <button className="flex items-center gap-2 px-3 h-8 rounded-full bg-[#1a2c17] border border-[#2a3928] text-[#a0ba9c] hover:text-white hover:border-sinarca-neon/50 text-xs font-medium transition-all whitespace-nowrap">
                                <TreeDeciduous className="w-4 h-4" />
                                Reflorestamento
                            </button>
                            <button className="flex items-center gap-2 px-3 h-8 rounded-full bg-[#1a2c17] border border-[#2a3928] text-[#a0ba9c] hover:text-white hover:border-sinarca-neon/50 text-xs font-medium transition-all whitespace-nowrap">
                                <Zap className="w-4 h-4" />
                                Energia Renovável
                            </button>
                            <button className="flex items-center gap-2 px-3 h-8 rounded-full bg-[#1a2c17] border border-[#2a3928] text-[#a0ba9c] hover:text-white hover:border-sinarca-neon/50 text-xs font-medium transition-all whitespace-nowrap">
                                <Droplets className="w-4 h-4" />
                                Água Potável
                            </button>
                            <button className="flex items-center gap-2 px-3 h-8 rounded-full bg-[#1a2c17] border border-[#2a3928] text-[#a0ba9c] hover:text-white hover:border-sinarca-neon/50 text-xs font-medium transition-all whitespace-nowrap">
                                <FlaskConical className="w-4 h-4" />
                                Captura de Carbono
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Visualization Content */}
                <div className="flex-1 relative bg-[#0e160d] overflow-hidden min-h-[600px] w-full">
                    {/* Dynamic Background Grid */}
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#40f320 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                    {/* Graph Container (Simulated Visualization) */}
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                        {/* SVG Connections Layer */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            <defs>
                                <linearGradient id="grad1" x1="0%" x2="100%" y1="0%" y2="0%">
                                    <stop offset="0%" style={{ stopColor: '#2a3928', stopOpacity: 1 }}></stop>
                                    <stop offset="100%" style={{ stopColor: '#40f320', stopOpacity: 0.6 }}></stop>
                                </linearGradient>
                                <marker id="arrow" markerHeight="10" markerUnits="strokeWidth" markerWidth="10" orient="auto" refX="20" refY="3">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#40f320"></path>
                                </marker>
                            </defs>
                            {/* Connection Lines */}
                            {/* Center to Top Right */}
                            <line stroke="url(#grad1)" strokeWidth="1.5" x1="50%" x2="75%" y1="50%" y2="25%"></line>
                            {/* Center to Top Left */}
                            <line stroke="#2a3928" strokeDasharray="5,5" strokeWidth="2" x1="50%" x2="25%" y1="50%" y2="30%"></line>
                            {/* Center to Bottom Left */}
                            <line markerEnd="url(#arrow)" stroke="#40f320" strokeWidth="2" x1="50%" x2="30%" y1="50%" y2="70%"></line>
                            {/* Center to Bottom Right */}
                            <line stroke="#2a3928" strokeWidth="1" x1="50%" x2="70%" y1="50%" y2="65%"></line>
                            {/* Secondary Connections */}
                            <line stroke="#2a3928" strokeWidth="1" x1="75%" x2="85%" y1="25%" y2="15%"></line>
                            <line opacity="0.3" stroke="#40f320" strokeWidth="1" x1="25%" x2="15%" y1="30%" y2="40%"></line>
                        </svg>

                        {/* Nodes */}
                        {/* CENTRAL NODE (Selected) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 group cursor-pointer">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-[#121811] border-2 border-sinarca-neon shadow-[0_0_30px_rgba(64,243,32,0.3)] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                    <TreePine className="text-sinarca-neon w-8 h-8" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-sinarca-neon rounded-full flex items-center justify-center text-[#121811] font-bold text-xs border-2 border-[#121811]">
                                    <Check className="w-3 h-3" />
                                </div>
                            </div>
                            <div className="bg-[#121811]/80 backdrop-blur px-3 py-1 rounded-full border border-sinarca-neon/30">
                                <p className="text-white text-sm font-bold whitespace-nowrap">Projeto Amazônia Verde</p>
                            </div>
                        </div>
                        {/* Node: Top Right (Certifier) */}
                        <div className="absolute top-[25%] left-[75%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full bg-[#1a2c17] border border-[#a0ba9c] flex items-center justify-center">
                                <ShieldCheck className="text-[#a0ba9c] w-6 h-6" />
                            </div>
                            <span className="text-[#a0ba9c] text-xs font-medium">Certificadora Global</span>
                        </div>
                        {/* Node: Top Left (Auditor) */}
                        <div className="absolute top-[30%] left-[25%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full bg-[#1a2c17] border border-[#a0ba9c] border-dashed flex items-center justify-center">
                                <ClipboardCheck className="text-[#a0ba9c] w-6 h-6" />
                            </div>
                            <span className="text-[#a0ba9c] text-xs font-medium">Auditoria Independente</span>
                        </div>
                        {/* Node: Bottom Left (Investor) */}
                        <div className="absolute top-[70%] left-[30%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer opacity-90 hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-[#1a2c17] border border-sinarca-neon flex items-center justify-center shadow-[0_0_15px_rgba(64,243,32,0.1)]">
                                <Landmark className="text-sinarca-neon w-6 h-6" />
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-white text-xs font-medium">EcoInvest Fund</span>
                                <span className="text-sinarca-neon text-[10px]">Comprador</span>
                            </div>
                        </div>
                        {/* Node: Bottom Right (Community) */}
                        <div className="absolute top-[65%] left-[70%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-[#1a2c17] border border-[#a0ba9c] flex items-center justify-center">
                                <Users className="text-[#a0ba9c] w-5 h-5" />
                            </div>
                            <span className="text-[#a0ba9c] text-xs font-medium">Associação Local</span>
                        </div>
                        {/* Extra Small Nodes for visual complexity */}
                        <div className="absolute top-[15%] left-[85%] w-3 h-3 rounded-full bg-[#2a3928]"></div>
                        <div className="absolute top-[40%] left-[15%] w-3 h-3 rounded-full bg-[#2a3928]"></div>

                        {/* FLOATING SIDEBAR / DETAILS PANEL */}
                        <div className="absolute right-4 top-4 bottom-4 w-80 lg:w-96 bg-[#1a2c17]/70 backdrop-blur-md border border-[#a0ba9c]/10 rounded-xl flex flex-col overflow-hidden shadow-2xl z-20">
                            <div className="p-5 border-b border-[#a0ba9c]/10 bg-[#1a2c17]/50">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-0.5 rounded bg-sinarca-neon/20 text-sinarca-neon text-[10px] font-bold uppercase tracking-wider">Projeto Validado</span>
                                    <button className="text-[#a0ba9c] hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">Amazônia Verde #0821</h3>
                                <p className="text-[#a0ba9c] text-sm">Estado do Pará, Brasil</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                {/* Image placeholder */}
                                <div className="w-full h-40 rounded-lg bg-[#2a3928] overflow-hidden relative group">
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all"></div>
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a2c17] to-[#121811]">
                                        <Map className="text-[#2a3928] w-12 h-12" />
                                    </div>
                                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white backdrop-blur-sm">
                                        Satélite: 2h atrás
                                    </div>
                                </div>
                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#121811] p-3 rounded border border-[#2a3928]">
                                        <p className="text-[#a0ba9c] text-xs mb-1">Volume Total</p>
                                        <p className="text-white font-bold">50,000 t</p>
                                    </div>
                                    <div className="bg-[#121811] p-3 rounded border border-[#2a3928]">
                                        <p className="text-[#a0ba9c] text-xs mb-1">Preço Médio</p>
                                        <p className="text-white font-bold">R$ 85,00</p>
                                    </div>
                                </div>
                                {/* Timeline/Traceability */}
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <History className="text-sinarca-neon w-4 h-4" />
                                        Rastreabilidade
                                    </h4>
                                    <div className="relative pl-4 border-l border-[#2a3928] space-y-6">
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-sinarca-neon ring-4 ring-[#121811]"></div>
                                            <p className="text-xs text-[#a0ba9c]">Hoje, 10:42</p>
                                            <p className="text-sm text-white font-medium">Transferência para EcoInvest Fund</p>
                                            <p className="text-xs text-sinarca-neon mt-1">12,500 Créditos</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#2a3928] ring-4 ring-[#121811]"></div>
                                            <p className="text-xs text-[#a0ba9c]">Ontem, 15:30</p>
                                            <p className="text-sm text-white font-medium">Auditoria de Validação Concluída</p>
                                            <p className="text-xs text-[#a0ba9c] mt-1">Aprovado por Auditoria Independente</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#2a3928] ring-4 ring-[#121811]"></div>
                                            <p className="text-xs text-[#a0ba9c]">10 Out, 2023</p>
                                            <p className="text-sm text-white font-medium">Registro do Projeto</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t border-[#a0ba9c]/10 bg-[#1a2c17]/50 mt-auto">
                                <button className="w-full flex items-center justify-center gap-2 rounded-lg h-10 bg-sinarca-neon hover:bg-sinarca-neon/90 text-[#121811] text-sm font-bold transition-all">
                                    Ver Detalhes Completos
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Bottom Left Graph Controls */}
                        <div className="absolute bottom-6 left-6 z-10 flex gap-2">
                            <button className="w-10 h-10 rounded bg-[#1a2c17] border border-[#2a3928] text-white flex items-center justify-center hover:bg-[#2a3928]">
                                <Plus className="w-5 h-5" />
                            </button>
                            <button className="w-10 h-10 rounded bg-[#1a2c17] border border-[#2a3928] text-white flex items-center justify-center hover:bg-[#2a3928]">
                                <Minus className="w-5 h-5" />
                            </button>
                            <button className="w-10 h-10 rounded bg-[#1a2c17] border border-[#2a3928] text-white flex items-center justify-center hover:bg-[#2a3928]">
                                <Focus className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Legend */}
                        <div className="absolute top-6 left-6 z-10 bg-[#121811]/80 backdrop-blur border border-[#2a3928] p-3 rounded-lg">
                            <p className="text-xs font-bold text-white mb-2 uppercase tracking-wide">Legenda</p>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-sinarca-neon"></div>
                                    <span className="text-[10px] text-[#a0ba9c]">Projeto Ativo</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full border border-[#a0ba9c]"></div>
                                    <span className="text-[10px] text-[#a0ba9c]">Entidade</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-[2px] bg-sinarca-neon"></div>
                                    <span className="text-[10px] text-[#a0ba9c]">Fluxo de Crédito</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-[2px] border-t border-dashed border-[#a0ba9c]"></div>
                                    <span className="text-[10px] text-[#a0ba9c]">Conexão Legal</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
