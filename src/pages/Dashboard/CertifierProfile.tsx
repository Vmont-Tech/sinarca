import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Globe, CheckCircle, ArrowLeft, FolderOpen, PieChart } from 'lucide-react';
import { database } from '../../services/database';
import { ProjectCardMRCA } from '../../components/ProjectCardMRCA';

export default function CertifierProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [certifier, setCertifier] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!id) return;

            // 1. Get Certifier Data
            const allCertifiers = await database.getCertifiers();
            const found = allCertifiers.find((c: any) => c.id === id);
            setCertifier(found);

            // 2. Get Related Projects
            const allProjects = await database.getMarketProjects({ limit: 100 });
            // The mapping in database.ts puts certifier name in chain.emitter.name, but let's check raw DB structure if possible
            // Actually getMarketProjects returns mapped data. Let's filter by the certifier name since ID might not be in mapped view usually
            // Ideally we check `chain.emitter.name` matches `found.name`

            if (found) {
                const related = allProjects.filter((p: any) => p.chain.emitter.name === found.name);
                setProjects(related);
            }

            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-white">Carregando perfil...</div>;
    if (!certifier) return <div className="p-10 text-center text-white">Certificadora não encontrada.</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1440px]">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            {/* Profile Header */}
            <div className="bg-sinarca-deep border border-sinarca-border rounded-xl p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sinarca-neon/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center p-4 shadow-xl">
                        {certifier.logo ? <img src={certifier.logo} alt={certifier.name} /> : <ShieldCheck className="w-12 h-12 text-black" />}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-white font-display">{certifier.name}</h1>
                            {certifier.authorized && (
                                <span className="bg-sinarca-neon/10 text-sinarca-neon border border-sinarca-neon/20 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5">
                                    Oficialmente Autorizada <CheckCircle className="w-3.5 h-3.5" />
                                </span>
                            )}
                        </div>
                        <p className="text-text-muted max-w-2xl mb-4">
                            Entidade responsável pela emissão e verificação de conformidade dos padrões globais de crédito de carbono.
                        </p>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                            <a href={certifier.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sinarca-neon hover:text-white text-sm font-bold uppercase tracking-wide transition-colors">
                                <Globe className="w-4 h-4" /> Website Oficial
                            </a>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <span className="w-1.5 h-1.5 bg-gray-600 rounded-full"></span>
                                ID: <span className="font-mono text-gray-300">{certifier.id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-8 border-l border-sinarca-border pl-8">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-white mb-1">{projects.length}</p>
                            <p className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Projetos Registrados</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-white mb-1">
                                {(projects.reduce((acc, curr) => acc + (curr.quantity || 0), 0) / 1000).toFixed(1)}k
                            </p>
                            <p className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Milhões tCO₂e</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Projects Tab */}
            <div className="mb-8">
                <div className="flex items-center gap-4 border-b border-sinarca-border pb-4 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-sinarca-neon" /> Projetos sob Gestão
                    </h2>
                    <span className="bg-sinarca-forest text-text-muted px-2 py-0.5 rounded text-xs font-mono">{projects.length}</span>
                </div>

                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((proj) => (
                            <ProjectCardMRCA key={proj.id} data={proj} compact={true} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-sinarca-deep/50 rounded-xl border border-dashed border-sinarca-border">
                        <p className="text-text-muted">Nenhum projeto encontrado para esta certificadora no ambiente atual.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
