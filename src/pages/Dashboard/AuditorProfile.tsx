import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserCheck, Star, ArrowLeft, ClipboardCheck, Award } from 'lucide-react';
import { database } from '../../services/database';
import { ProjectCardMRCA } from '../../components/ProjectCardMRCA';

export default function AuditorProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [auditor, setAuditor] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            const allAuditors = await database.getAuditors();
            const found = allAuditors.find((a: any) => a.id === id);
            setAuditor(found);

            const allProjects = await database.getMarketProjects({ limit: 100 });
            if (found) {
                // Filter by auditor name from chain
                const related = allProjects.filter((p: any) => p.chain.auditor.name === found.name);
                setProjects(related);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-white">Carregando perfil...</div>;
    if (!auditor) return <div className="p-10 text-center text-white">Auditor não encontrado.</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1440px]">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            {/* Header */}
            <div className="bg-sinarca-deep border border-sinarca-border rounded-xl p-8 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 rounded-full bg-blue-900/20 flex items-center justify-center text-blue-400 border-2 border-blue-500/30">
                    <UserCheck className="w-10 h-10" />
                </div>

                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-white mb-2 font-display">{auditor.name}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            Auditor Credenciado
                        </span>
                        <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-bold">{auditor.rating} / 5.0</span>
                        </div>
                        <span className="text-text-muted font-mono">ID: {auditor.id}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-center border-l-0 md:border-l border-sinarca-border pl-0 md:pl-8">
                    <div>
                        <p className="text-3xl font-bold text-white mb-1">{projects.length}</p>
                        <p className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Projetos Auditados</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-white mb-1">100%</p>
                        <p className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Taxa de Aprovação</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="mb-8">
                <div className="flex items-center gap-4 border-b border-sinarca-border pb-4 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-blue-400" /> Histórico de Auditorias
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
                        <p className="text-text-muted">Nenhum projeto auditado encontrado para este auditor no banco.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
