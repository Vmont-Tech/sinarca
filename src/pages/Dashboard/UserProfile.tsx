import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    Activity,
    Building2,
    CheckCircle,
    ExternalLink,
    FileSignature,
    Fingerprint,
    Hash,
    Leaf,
    Shield,
    User,
    XCircle
} from 'lucide-react';
import { useAuth, type UserRole } from '../../contexts/AuthContext';
import { database } from '../../services/database';

type ProfileRole = UserRole | 'developer' | 'buyer';

type PublicProfile = {
    id: string;
    name: string;
    role: ProfileRole;
    document?: string;
    website?: string;
    logo?: string;
    authorized?: boolean;
    verified?: boolean;
    organization?: {
        id?: string;
        name?: string;
        document?: string;
        website?: string;
        logo?: string;
        authorized?: boolean;
        verified?: boolean;
    };
    metrics?: {
        projects?: number;
        totalImpact?: number;
        transactions?: number;
        [key: string]: unknown;
    };
    projects?: Array<{
        id: string;
        friendlyId?: string;
        name: string;
        status?: string;
        location?: string;
        carbonStock?: number;
    }>;
    activity?: Array<{
        id: string;
        action: string;
        target?: string;
        date?: string;
        hash?: string;
        type?: string;
    }>;
};

const ROLE_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
    auditor: { label: 'Auditor Certificado', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    certifier: { label: 'Certificadora', color: 'text-sinarca-neon', bg: 'bg-sinarca-neon/10', border: 'border-sinarca-neon/20' },
    company: { label: 'Empresa Compradora', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    buyer: { label: 'Empresa Compradora', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    producer: { label: 'Produtor', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
    developer: { label: 'Desenvolvedor de Projeto', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
    admin: { label: 'Operação SINARCA', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
};

const PERMISSIONS = [
    { id: 'register', label: 'Originação de projetos', allowedRoles: ['producer', 'developer'] },
    { id: 'certify', label: 'Certificação e emissão', allowedRoles: ['certifier'] },
    { id: 'audit', label: 'Auditoria independente', allowedRoles: ['auditor'] },
    { id: 'retire', label: 'Compra e aposentadoria', allowedRoles: ['company', 'buyer'] },
];

const initialsFor = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'SI';

const normalizeRole = (role?: string): ProfileRole => {
    const raw = String(role || '').toLowerCase();
    if (raw.includes('auditor')) return 'auditor';
    if (raw.includes('certifier') || raw.includes('certificadora')) return 'certifier';
    if (raw.includes('producer') || raw.includes('produtor')) return 'producer';
    if (raw.includes('developer') || raw.includes('desenvolvedor')) return 'developer';
    if (raw.includes('buyer') || raw.includes('comprador')) return 'buyer';
    if (raw.includes('admin') || raw.includes('registry')) return 'admin';
    return 'company';
};

const formatDate = (value?: string) => {
    if (!value) return 'Registro público';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
};

const formatImpact = (value?: number) =>
    Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export default function UserProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'activity' | 'projects'>('activity');

    useEffect(() => {
        let mounted = true;

        const loadProfile = async () => {
            setLoading(true);
            setError('');
            try {
                if (id) {
                    const publicProfile = await database.getPublicProfile(id);
                    if (mounted) {
                        setProfile(publicProfile ? { ...publicProfile, role: normalizeRole(publicProfile.role) } as PublicProfile : null);
                    }
                    return;
                }

                if (user && mounted) {
                    setProfile({
                        id: user.id,
                        name: user.name || 'Usuário SINARCA',
                        role: normalizeRole(user.role),
                        document: user.document,
                        logo: user.avatar,
                        organization: {
                            name: user.organization || user.name,
                            document: user.document,
                            logo: user.avatar,
                            verified: true,
                        },
                        metrics: {
                            projects: 0,
                            totalImpact: 0,
                            transactions: 0,
                        },
                        projects: [],
                        activity: [],
                    });
                    return;
                }

                if (mounted) setProfile(null);
            } catch (err: any) {
                if (mounted) {
                    setError(err.message || 'Não foi possível carregar o perfil público.');
                    setProfile(null);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadProfile();
        return () => {
            mounted = false;
        };
    }, [id, user]);

    const role = normalizeRole(profile?.role);
    const roleStyle = ROLE_STYLES[role] || ROLE_STYLES.company;
    const verified = Boolean(profile?.verified || profile?.authorized || profile?.organization?.verified || profile?.organization?.authorized);
    const organizationName = profile?.organization?.name || profile?.name || 'SINARCA';
    const organizationDocument = profile?.organization?.document || profile?.document || 'Documento não informado';
    const organizationLogo = profile?.organization?.logo || profile?.logo;

    const summary = useMemo(() => ([
        { label: 'Projetos', value: formatImpact(Number(profile?.metrics?.projects || profile?.projects?.length || 0)), accent: false },
        { label: 'Impacto tCO2e', value: formatImpact(Number(profile?.metrics?.totalImpact || 0)), accent: true },
        { label: 'Transações', value: formatImpact(Number(profile?.metrics?.transactions || profile?.activity?.length || 0)), accent: false },
    ]), [profile]);

    const copyProfileId = async () => {
        if (!profile?.id) return;
        await navigator.clipboard?.writeText(profile.id).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    if (loading) {
        return (
            <div className="p-20 text-center text-primary flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold uppercase tracking-widest text-xs">Sincronizando perfil...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="p-20 text-center text-primary flex flex-col items-center gap-4">
                <User className="w-10 h-10 text-text-muted" />
                <p className="font-bold uppercase tracking-widest text-xs">{error || 'Perfil não encontrado no banco'}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 max-w-[1440px] mx-auto w-full animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        {organizationLogo ? (
                            <img
                                src={organizationLogo}
                                alt={profile.name}
                                className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-sinarca-neon shadow-[0_0_20px_rgba(0,255,148,0.2)] object-cover bg-white"
                            />
                        ) : (
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-sinarca-neon shadow-[0_0_20px_rgba(0,255,148,0.2)] bg-sinarca-forest text-sinarca-neon flex items-center justify-center font-bold text-2xl">
                                {initialsFor(profile.name)}
                            </div>
                        )}
                        <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-[#102210] ${verified ? 'bg-sinarca-neon' : 'bg-gray-500'}`} title={verified ? 'Verificado' : 'Pendente'}></div>
                    </div>
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">{profile.name}</h1>
                            <button
                                type="button"
                                onClick={copyProfileId}
                                className="bg-sinarca-deep hover:bg-sinarca-forest border border-sinarca-border text-text-muted text-[10px] font-mono px-2 py-1 rounded flex items-center gap-1 transition-colors w-fit"
                            >
                                {copied ? <CheckCircle className="w-3 h-3 text-sinarca-neon" /> : <Fingerprint className="w-3 h-3" />}
                                {copied ? 'copiado' : profile.id}
                            </button>
                        </div>
                        <p className="text-text-muted mt-1 flex flex-wrap items-center gap-2">
                            <span>{organizationName}</span>
                            <span className="text-sinarca-neon">•</span>
                            <span>{organizationDocument}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${roleStyle.bg} ${roleStyle.color} border ${roleStyle.border}`}>
                                <Shield className="w-3 h-3" />
                                {roleStyle.label}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${verified ? 'bg-sinarca-forest text-sinarca-neon border-sinarca-neon/20' : 'bg-sinarca-forest text-text-muted border-sinarca-border'}`}>
                                {verified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {verified ? 'Verificado' : 'Pendente'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {profile.website && (
                        <a
                            href={profile.website}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-sinarca-deep border border-sinarca-border rounded-lg text-white font-medium hover:border-sinarca-neon transition-colors text-sm flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" /> Site
                        </a>
                    )}
                    <Link
                        to="/feed"
                        className="px-4 py-2 bg-sinarca-neon text-sinarca-forest rounded-lg font-bold hover:bg-[#00cc76] transition-colors text-sm shadow-[0_0_15px_rgba(0,255,148,0.3)] flex items-center gap-2"
                    >
                        <Hash className="w-4 h-4" /> Explorer
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-sinarca-deep rounded-xl border border-sinarca-border p-6 shadow-lg">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Vínculo institucional
                        </h3>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white text-sinarca-forest font-bold text-xl flex items-center justify-center rounded-lg shadow-inner overflow-hidden">
                                {organizationLogo ? <img src={organizationLogo} alt="" className="w-full h-full object-contain" /> : initialsFor(organizationName)}
                            </div>
                            <div>
                                <p className="text-white font-bold">{organizationName}</p>
                                <p className="text-xs text-text-muted font-mono">{organizationDocument}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm py-2 border-t border-sinarca-border/50">
                                <span className="text-text-muted">Autorização</span>
                                <span className="text-white font-medium">{verified ? 'Cadastro validado' : 'Validação pendente'}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-t border-sinarca-border/50">
                                <span className="text-text-muted">Atualização</span>
                                <span className="text-white font-medium">{formatDate(profile.activity?.[0]?.date)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-sinarca-deep rounded-xl border border-sinarca-border p-6 shadow-lg">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Escopo público
                        </h3>
                        <div className="space-y-3">
                            {PERMISSIONS.map(perm => {
                                const isAllowed = perm.allowedRoles.includes(role);
                                return (
                                    <div key={perm.id} className={`flex items-center justify-between p-3 rounded-lg border ${isAllowed ? 'bg-sinarca-forest border-sinarca-neon/20' : 'bg-[#0a1610] border-transparent opacity-50'}`}>
                                        <span className={`text-sm font-medium ${isAllowed ? 'text-white' : 'text-text-muted'}`}>{perm.label}</span>
                                        {isAllowed ? <CheckCircle className="w-4 h-4 text-sinarca-neon" /> : <XCircle className="w-4 h-4 text-red-500/50" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-sinarca-deep to-[#052216] rounded-xl border border-sinarca-border p-6 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity className="w-24 h-24 text-sinarca-neon" />
                        </div>
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-6 relative z-10">Métricas públicas</h3>
                        <div className="grid grid-cols-3 gap-4 relative z-10">
                            {summary.map(item => (
                                <div key={item.label}>
                                    <p className={`text-2xl font-bold ${item.accent ? 'text-sinarca-neon' : 'text-white'}`}>{item.value}</p>
                                    <p className="text-[10px] uppercase text-text-muted font-bold mt-1">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <div className="flex border-b border-sinarca-border overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'activity' ? 'border-sinarca-neon text-white' : 'border-transparent text-text-muted hover:text-white'}`}
                        >
                            Log de atividades
                        </button>
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'projects' ? 'border-sinarca-neon text-white' : 'border-transparent text-text-muted hover:text-white'}`}
                        >
                            Projetos
                        </button>
                    </div>

                    <div className="bg-sinarca-deep rounded-b-xl rounded-tr-xl border border-sinarca-border min-h-[500px] overflow-hidden shadow-xl">
                        {activeTab === 'activity' && (
                            <div className="divide-y divide-sinarca-border">
                                {profile.activity?.map(item => (
                                    <div key={item.id} className="p-6 hover:bg-white/5 transition-colors group">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-sinarca-forest border border-sinarca-border flex items-center justify-center shrink-0">
                                                {item.type === 'audit' ? <FileSignature className="w-5 h-5 text-sinarca-neon" /> :
                                                    item.type === 'retire' ? <Leaf className="w-5 h-5 text-green-400" /> :
                                                        <Activity className="w-5 h-5 text-text-muted" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                    <h4 className="text-white font-bold text-base group-hover:text-sinarca-neon transition-colors">{item.action}</h4>
                                                    <span className="text-xs text-text-muted font-mono">{formatDate(item.date)}</span>
                                                </div>
                                                {item.target && <p className="text-sm text-gray-400 mt-1">{item.target}</p>}
                                                {item.hash && (
                                                    <Link to={`/tx/${item.hash}`} className="inline-flex items-center gap-2 mt-3 bg-black/30 border border-sinarca-border rounded px-2 py-1 hover:border-sinarca-neon transition-colors">
                                                        <Hash className="w-3 h-3 text-sinarca-neon" />
                                                        <span className="text-[10px] font-mono text-gray-300 break-all">{item.hash}</span>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!profile.activity || profile.activity.length === 0) && (
                                    <div className="p-8 text-center text-text-muted">
                                        Nenhuma atividade pública recente registrada.
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'projects' && (
                            <div className="divide-y divide-sinarca-border">
                                {profile.projects?.map(project => (
                                    <Link
                                        key={project.id}
                                        to={`/projeto/${project.friendlyId || project.id}`}
                                        className="p-6 hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                    >
                                        <div>
                                            <p className="text-white font-bold">{project.name}</p>
                                            <p className="text-xs text-text-muted font-mono mt-1">{project.friendlyId || project.id} • {project.location || 'Localização não informada'}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-sinarca-neon font-bold">{formatImpact(Number(project.carbonStock || 0))} tCO2e</span>
                                            <span className="text-[10px] uppercase tracking-wider text-text-muted border border-sinarca-border rounded px-2 py-1">{project.status || 'N/A'}</span>
                                        </div>
                                    </Link>
                                ))}
                                {(!profile.projects || profile.projects.length === 0) && (
                                    <div className="p-8 text-center text-text-muted">
                                        Nenhum projeto público vinculado a este perfil.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
