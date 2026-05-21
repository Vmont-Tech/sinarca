import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Leaf, TrendingUp, ArrowLeft, Target } from 'lucide-react';
import { database } from '../../services/database';
import { ProjectCardMRCA } from '../../components/ProjectCardMRCA';

export default function CompanyProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            const allCompanies = await database.getCompanies();
            const found = allCompanies.find((c: any) => c.id === id);
            setCompany(found);

            const allProjects = await database.getMarketProjects({ limit: 100 });
            if (found) {
                // If it's a developer, filter by developer name.
                // If compensator, we don't have direct link in projects mock yet, but we will infer ownership or "support"
                // For now, filter by institution name (developer)
                const related = allProjects.filter((p: any) => p.institution.name === found.name);
                setProjects(related);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-white">Carregando perfil...</div>;
    if (!company) return <div className="p-10 text-center text-white">Empresa não encontrada.</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1440px]">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            {/* Header */}
            <div className="bg-sinarca-deep border border-sinarca-border rounded-xl p-8 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 rounded-lg bg-sinarca-forest flex items-center justify-center text-sinarca-neon border border-sinarca-border">
                    <Building2 className="w-10 h-10" />
                </div>

                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-white mb-2 font-display">{company.name}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                        <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider ${company.role === 'Developer' ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-blue-900/40 text-blue-400 border border-blue-800'}`}>
                            {company.role === 'Developer' ? 'Desenvolvedor de Projetos' : 'Compensador / Comprador'}
                        </span>
                        <span className="text-text-muted font-mono">ID: {company.id}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-center border-l-0 md:border-l border-sinarca-border pl-0 md:pl-8">
                    <div>
                        <p className="text-3xl font-bold text-white mb-1">{projects.length}</p>
                        <p className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Projetos Ativos</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-white mb-1 text-sinarca-neon">
                            {(projects.reduce((acc, curr) => acc + (curr.quantity || 0), 0) / 1000).toFixed(1)}k
                        </p>
                        <p className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Impacto tCO₂e</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="mb-8">
                <div className="flex items-center gap-4 border-b border-sinarca-border pb-4 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-sinarca-neon" /> Portfólio de Projetos
                    </h2>
                </div>

                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((proj) => (
                            <ProjectCardMRCA key={proj.id} data={proj} compact={true} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-sinarca-deep/50 rounded-xl border border-dashed border-sinarca-border">
                        <p className="text-text-muted">Nenhum projeto público vinculado a este perfil.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
