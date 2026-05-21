import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Verified, Search, ExternalLink, ShieldCheck, Globe, CheckCircle } from 'lucide-react';
import { database } from '../../services/database';

export default function Certifiers() {
    const [certifiers, setCertifiers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await database.getCertifiers();
            setCertifiers(data);
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
                        <span className="text-text-muted text-xs font-mono uppercase tracking-wider">Entidades Globais</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif font-medium leading-tight text-white flex items-center gap-3">
                        Certificadoras Globais <Verified className="w-8 h-8 text-sinarca-neon" />
                    </h1>
                    <p className="text-text-muted text-base max-w-2xl">
                        Explore as instituições responsáveis pelos padrões de certificação de carbono aceitos no ecossistema SINARCA.
                        Estas entidades definem as metodologias e garantem a integridade dos créditos.
                    </p>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-white text-center py-20 animate-pulse">Carregando certificadoras...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certifiers.map((cert) => (
                        <div key={cert.id} className="bg-sinarca-deep border border-sinarca-border rounded-xl p-6 group hover:border-sinarca-neon/50 transition-all hover:shadow-lg hover:shadow-sinarca-neon/5 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-2 overflow-hidden border border-gray-700">
                                    {cert.logo ? (
                                        <img src={cert.logo} alt={cert.name} className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <ShieldCheck className="w-8 h-8 text-black" />
                                    )}
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${cert.authorized ? 'bg-sinarca-neon/10 text-sinarca-neon border border-sinarca-neon/20' : 'bg-gray-800 text-gray-400'}`}>
                                    {cert.authorized ? 'Autorizado' : 'Inativo'} <CheckCircle className="w-3.5 h-3.5" />
                                </span>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2 font-display">{cert.name}</h3>
                                <div className="flex items-center gap-2 text-text-muted text-sm mb-4">
                                    <Globe className="w-4 h-4" />
                                    <span className="truncate">{cert.website}</span>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                                    Entidade emissora de padrões internacionais para o mercado voluntário de carbono.
                                </p>
                            </div>

                            <div className="mt-auto pt-6 border-t border-sinarca-border flex gap-3">
                                <a
                                    href={cert.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 bg-sinarca-forest text-sinarca-neon hover:bg-sinarca-neon hover:text-sinarca-forest py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    WebSite Oficial <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <Link
                                    to={`/painel/certificadoras/${cert.id}`}
                                    className="px-4 py-2.5 rounded-lg border border-sinarca-border text-text-muted hover:text-white hover:bg-sinarca-deep transition-colors text-xs font-bold uppercase flex items-center justify-center"
                                >
                                    Ver Projetos
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
