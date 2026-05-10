import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Globe, ExternalLink, Leaf, TrendingUp } from 'lucide-react';
import { database } from '../../services/database';

export default function Companies() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await database.getCompanies();
            setCompanies(data);
            setLoading(false);
        };
        load();
    }, []);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1440px]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-sinarca-deep text-sinarca-neon text-xs font-mono px-2 py-0.5 rounded border border-sinarca-neon/30">ECOSYSTEM</span>
                        <span className="text-text-muted text-xs font-mono uppercase tracking-wider">Desenvolvedores & Empresas</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif font-medium leading-tight text-white flex items-center gap-3">
                        Empresas Participantes <Building2 className="w-8 h-8 text-sinarca-neon" />
                    </h1>
                    <p className="text-text-muted text-base max-w-2xl">
                        Conheça as empresas que estão desenvolvendo projetos de conservação ou compensando suas emissões através do ecossistema SINARCA.
                    </p>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-white text-center py-20 animate-pulse">Carregando empresas...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map((company) => (
                        <div key={company.id} className="bg-sinarca-deep border border-sinarca-border rounded-xl p-6 hover:border-sinarca-neon/50 transition-all group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-lg bg-sinarca-forest flex items-center justify-center text-sinarca-neon border border-sinarca-border">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${company.role === 'Developer' ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-blue-900/40 text-blue-400 border border-blue-800'}`}>
                                    {company.role === 'Developer' ? 'Desenvolvedor' : 'Compensador'}
                                </span>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-1 font-display">{company.name}</h3>
                                <p className="text-xs text-text-muted font-mono mb-6">{company.id}</p>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-sinarca-forest/50 rounded-lg border border-sinarca-border">
                                        <div className="flex items-center gap-2 text-text-muted text-xs uppercase font-bold tracking-wide">
                                            <Leaf className="w-3.5 h-3.5" /> Projetos
                                        </div>
                                        <span className="text-white font-mono font-bold">{company.projects}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-sinarca-forest/50 rounded-lg border border-sinarca-border">
                                        <div className="flex items-center gap-2 text-text-muted text-xs uppercase font-bold tracking-wide">
                                            <TrendingUp className="w-3.5 h-3.5" /> Impacto (tCO₂e)
                                        </div>
                                        <span className="text-white font-mono font-bold">{company.total_impact.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-sinarca-border">
                                <Link
                                    to={`/painel/empresas/${company.id}`}
                                    className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-sinarca-forest text-text-muted hover:text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-transparent hover:border-sinarca-border"
                                >
                                    Ver Perfil Completo <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
