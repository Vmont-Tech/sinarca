import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Fingerprint, Star, ExternalLink, UserCheck, Shield } from 'lucide-react';
import { database } from '../../services/database';

export default function Auditors() {
    const [auditors, setAuditors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await database.getAuditors();
            setAuditors(data);
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
                        <span className="bg-sinarca-deep text-blue-400 text-xs font-mono px-2 py-0.5 rounded border border-blue-400/30">ECOSYSTEM</span>
                        <span className="text-text-muted text-xs font-mono uppercase tracking-wider">Verificação Independente</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif font-medium leading-tight text-white flex items-center gap-3">
                        Auditores Credenciados <Shield className="w-8 h-8 text-blue-400" />
                    </h1>
                    <p className="text-text-muted text-base max-w-2xl">
                        Lista oficial de auditores de terceira parte (VVBs) habilitados a validar projetos e verificar emissões no ecossistema SINARCA.
                    </p>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-white text-center py-20 animate-pulse">Carregando auditores...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {auditors.map((auditor) => (
                        <div key={auditor.id} className="bg-sinarca-deep border border-sinarca-border rounded-xl p-6 hover:border-blue-500/30 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-800/50">
                                    <UserCheck className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-bold text-white leading-tight font-display">{auditor.name}</h3>
                                        {auditor.verified && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded border border-blue-500/30 font-bold uppercase">Verificado</span>}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-text-muted">
                                        <span className="flex items-center gap-1"><Fingerprint className="w-3.5 h-3.5" /> ID: {auditor.id}</span>
                                        <span className="flex items-center gap-1 text-yellow-400"><Star className="w-3.5 h-3.5 fill-current" /> {auditor.rating}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 md:justify-end">
                                <div className="text-center px-4 md:border-l border-sinarca-border">
                                    <p className="text-2xl font-bold text-white">{auditor.projects_audited}</p>
                                    <p className="text-[10px] uppercase text-text-muted tracking-wide font-bold">Projetos Auditados</p>
                                </div>
                                <Link to={`/perfil/${auditor.id}`} className="flex items-center gap-2 bg-[#1A2E22] hover:bg-blue-900/40 text-blue-400 hover:text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-blue-900/30 hover:border-blue-500">
                                    Ver Perfil <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
