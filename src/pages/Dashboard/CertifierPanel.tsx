import React from 'react';
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Eye,
    Edit3,
    ShieldCheck,
    TreePine,
    MapPin,
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CertifierPanel() {
    const navigate = useNavigate();

    const projects = [
        { id: 1, name: 'Floresta Viva Amazônia', location: 'Pará, PA', status: 'Ativo', credits: 120, date: '20/05/2024' },
        { id: 2, name: 'Mata Nativa do Cerrado', location: 'Goiás, GO', status: 'Ativo', credits: 80, date: '18/05/2024' },
        { id: 3, name: 'Restauração do Xingu', location: 'Mato Grosso, MT', status: 'Ativo', credits: 50, date: '15/05/2024' },
        { id: 4, name: 'Carbono Verde Sul', location: 'Paraná, PR', status: 'Em Auditoria', credits: 0, date: '10/05/2024' },
        { id: 5, name: 'Sertão Sustentável', location: 'Bahia, BA', status: 'Planejamento', credits: 0, date: '05/05/2024' },
    ];

    return (
        <div className="flex flex-col gap-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight">Gestão de Projetos</h1>
                    <p className="text-sm text-gray-500">Administre seu inventário de ativos ambientais e acompanhe certificações.</p>
                </div>
                <button 
                    onClick={() => navigate('/painel/registrar-inventario')}
                    className="bg-primary text-white px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" />
                    Novo Registro de Área
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar projeto por nome, local ou ID..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-primary/30 transition-all text-sm"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 border border-gray-100 rounded-xl text-xs font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-all">
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black/90 transition-all">
                        Exportar Relatório
                    </button>
                </div>
            </div>

            {/* Projects Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome do Projeto</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Créditos</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Última Atualização</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {projects.map((project) => (
                            <tr key={project.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                                            <TreePine className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-black">{project.name}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{project.location}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                        project.status === 'Ativo' ? 'bg-green-50 text-green-600' : 
                                        project.status === 'Em Auditoria' ? 'bg-orange-50 text-orange-600' : 
                                        'bg-gray-100 text-gray-500'
                                    }`}>
                                        {project.status}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <p className="text-sm font-bold text-black">{project.credits}</p>
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">tCO2e</p>
                                </td>
                                <td className="px-8 py-6 text-sm text-gray-500 font-medium">
                                    {project.date}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-all">
                                            <Eye className="w-3.5 h-3.5" />
                                            Detalhes
                                        </button>
                                        <button className="p-2 text-gray-300 hover:text-black transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">Exibindo 5 de 24 projetos registrados</p>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-lg border border-gray-200 text-gray-400 disabled:opacity-50" disabled>
                            <ArrowRight className="w-4 h-4 rotate-180" />
                        </button>
                        <button className="p-2 rounded-lg border border-gray-200 text-black hover:bg-white transition-all">
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
