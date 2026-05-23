import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    User,
    Shield,
    FileSignature,
    Building2,
    Fingerprint,
    CheckCircle,
    XCircle,
    Calendar,
    Hash,
    Link as LinkIcon,
    Activity,
    Lock,
    Leaf
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../../services/database';

const USER_ROLES: any = {
    auditor: { label: 'Auditor Certificado', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    certifier: { label: 'Certificadora', color: 'text-sinarca-neon', bg: 'bg-sinarca-neon/10', border: 'border-sinarca-neon/20' },
    company: { label: 'Compensador (Buyer)', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    producer: { label: 'Produtor (Origem)', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
    admin: { label: 'Administrador Gov', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' }
};

const PERMISSIONS = [
    { id: 'register', label: 'Registrar Projetos', allowedRoles: ['certifier', 'admin', 'producer'] },
    { id: 'audit', label: 'Realizar Auditorias', allowedRoles: ['auditor'] },
    { id: 'retire', label: 'Aposentar Créditos', allowedRoles: ['company', 'admin', 'producer'] },
    { id: 'transfer', label: 'Transacionar Ativos', allowedRoles: ['company', 'certifier', 'admin', 'producer'] },
];

type ProfileView = {
    id: string;
    name: string;
    cpf: string;
    role: 'auditor' | 'certifier' | 'company' | 'producer' | 'admin';
    position: string;
    avatar?: string;
    joinedAt: string;
    lastActive: string;
    organization: {
        name: string;
        cnpj: string;
        authorizedBy: string;
        logo: string;
    };
    stats: {
        projectsAudited: number;
        hashesSigned: number;
        reputationScore: number;
    };
    activity: Array<{
        id: string;
        action: string;
        target: string;
        date: string;
        hash: string;
        type: string;
    }>;
};

const initialsFor = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'SI';

const roleFromCatalog = (entity: any): ProfileView['role'] => {
    const raw = String(entity?.role || '').toLowerCase();
    if (raw.includes('auditor')) return 'auditor';
    if (raw.includes('certifier')) return 'certifier';
    if (raw.includes('developer') || raw.includes('producer')) return 'producer';
    if (raw.includes('registry') || raw.includes('admin')) return 'admin';
    return 'company';
};

const positionForRole = (role: ProfileView['role']) => ({
    auditor: 'Auditoria Credenciada',
    certifier: 'Certificadora Autorizada',
    company: 'Empresa Compradora',
    producer: 'Gestão de Ativos Ambientais',
    admin: 'Administração SINARCA',
}[role]);

const profileFromCatalogEntity = (entity: any): ProfileView => {
    const role = roleFromCatalog(entity);
    return {
        id: String(entity.id),
        name: entity.name,
        cpf: entity.document || 'Documento não informado',
        role,
        position: positionForRole(role),
        avatar: entity.logo,
        joinedAt: entity.created_at || 'Registro SINARCA',
        lastActive: 'Sincronizado com banco',
        organization: {
            name: entity.name,
            cnpj: entity.document || 'Documento não informado',
            authorizedBy: entity.authorized || entity.verified ? 'SINARCA' : 'Pendente',
            logo: initialsFor(entity.name),
        },
        stats: {
            projectsAudited: Number(entity.projects_audited || entity.projects || 0),
            hashesSigned: 0,
            reputationScore: entity.verified === false || entity.authorized === false ? 0 : 100,
        },
        activity: [],
    };
};

const profileFromAuthenticatedUser = (user: any): ProfileView => {
    const role = user.role || 'company';
    const name = user.name || 'Usuário SINARCA';
    return {
        id: user.id,
        name,
        cpf: user.document || 'Documento não informado',
        role,
        position: positionForRole(role),
        avatar: user.avatar,
        joinedAt: 'Conta ativa',
        lastActive: 'Sessão atual',
        organization: {
            name: user.organization || name,
            cnpj: user.document || 'Documento não informado',
            authorizedBy: 'Cadastro SINARCA',
            logo: initialsFor(user.organization || name),
        },
        stats: {
            projectsAudited: 0,
            hashesSigned: 0,
            reputationScore: 100,
        },
        activity: [],
    };
};

export default function UserProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const [profile, setProfile] = useState<ProfileView | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState<'activity' | 'projects'>('activity');

    useEffect(() => {
        let mounted = true;
        const loadProfile = async () => {
            setLoaded(false);
            try {
                if (id) {
                    const [companies, auditors, certifiers] = await Promise.all([
                        database.getCompanies(),
                        database.getAuditors(),
                        database.getCertifiers(),
                    ]);
                    const entity = [...companies, ...auditors, ...certifiers].find((item: any) => String(item.id) === id || String(item.name) === id);
                    if (mounted) setProfile(entity ? profileFromCatalogEntity(entity) : null);
                    return;
                }

                if (user && mounted) {
                    setProfile(profileFromAuthenticatedUser(user));
                    return;
                }

                if (mounted) setProfile(null);
            } finally {
                if (mounted) setLoaded(true);
            }
        };

        loadProfile();
        return () => {
            mounted = false;
        };
    }, [id, user]);

    if (!loaded) return <div className="p-20 text-center text-primary flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold uppercase tracking-widest text-xs">Sincronizando Perfil...</p>
    </div>;

    if (!profile) return <div className="p-20 text-center text-primary flex flex-col items-center gap-4">
        <User className="w-10 h-10 text-text-muted" />
        <p className="font-bold uppercase tracking-widest text-xs">Perfil não encontrado no banco</p>
    </div>;

    const roleStyle = USER_ROLES[profile.role] || USER_ROLES.company;

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 max-w-[1440px] mx-auto w-full animate-in fade-in duration-500">
            {/* 1. Header & Identity */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <img
                            src={profile.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop'}
                            alt={profile.name}
                            className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-sinarca-neon shadow-[0_0_20px_rgba(0,255,148,0.2)] object-cover"
                        />
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-sinarca-neon rounded-full border-4 border-[#102210]" title="Online"></div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">{profile.name}</h1>
                            <span onClick={() => alert('Copiado!')} className="cursor-pointer bg-sinarca-deep hover:bg-sinarca-forest border border-sinarca-border text-text-muted text-[10px] font-mono px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                <Fingerprint className="w-3 h-3" />
                                {profile.id}
                            </span>
                        </div>
                        <p className="text-text-muted mt-1 flex items-center gap-2">
                            {profile.position} •
                            <span className="text-white font-medium">{profile.organization?.name || 'SINARCA Ecosystem'}</span>
                        </p>
                        <div className="flex gap-2 mt-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${roleStyle.bg} ${roleStyle.color} border ${roleStyle.border}`}>
                                <Shield className="w-3 h-3" />
                                {roleStyle.label}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sinarca-forest text-text-muted border border-sinarca-border flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                Membro desde {profile.joinedAt || '2024'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-sinarca-deep border border-sinarca-border rounded-lg text-white font-medium hover:border-sinarca-neon transition-colors text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Comparar
                    </button>
                    <button className="px-4 py-2 bg-sinarca-neon text-sinarca-forest rounded-lg font-bold hover:bg-[#00cc76] transition-colors text-sm shadow-[0_0_15px_rgba(0,255,148,0.3)] flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Ver na Blockchain
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 2. Left Column: Governance & Permissions */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Organization Card */}
                    <div className="bg-sinarca-deep rounded-2xl border border-sinarca-border p-6 shadow-lg">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Vínculo Institucional
                        </h3>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white text-sinarca-forest font-bold text-xl flex items-center justify-center rounded-lg shadow-inner">
                                {profile.organization.logo}
                            </div>
                            <div>
                                <p className="text-white font-bold">{profile.organization?.name || 'N/A'}</p>
                                <p className="text-xs text-text-muted font-mono">{profile.organization?.cnpj || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm py-2 border-t border-sinarca-border/50">
                                <span className="text-text-muted">Autorizado Por</span>
                                <span className="text-white font-medium">{profile.organization?.authorizedBy || 'Auto-Certificação'}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-t border-sinarca-border/50">
                                <span className="text-text-muted">Nível de Acesso</span>
                                <span className="text-sinarca-neon font-bold">Assinatura Nível 3</span>
                            </div>
                        </div>
                    </div>

                    {/* Permissions Card */}
                    <div className="bg-sinarca-deep rounded-2xl border border-sinarca-border p-6 shadow-lg">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            Permissões do Perfil
                        </h3>
                        <div className="space-y-3">
                            {PERMISSIONS.map(perm => {
                                const isAllowed = perm.allowedRoles.includes(profile.role);
                                return (
                                    <div key={perm.id} className={`flex items-center justify-between p-3 rounded-lg border ${isAllowed ? 'bg-sinarca-forest border-sinarca-neon/20' : 'bg-[#0a1610] border-transparent opacity-50'}`}>
                                        <span className={`text-sm font-medium ${isAllowed ? 'text-white' : 'text-text-muted'}`}>{perm.label}</span>
                                        {isAllowed ? <CheckCircle className="w-4 h-4 text-sinarca-neon" /> : <XCircle className="w-4 h-4 text-red-500/50" />}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-gradient-to-br from-sinarca-deep to-[#052216] rounded-2xl border border-sinarca-border p-6 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity className="w-24 h-24 text-sinarca-neon" />
                        </div>
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-6 relative z-10">Métricas de Performance</h3>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div>
                                <p className="text-3xl font-bold text-white">{profile.stats?.hashesSigned || 0}</p>
                                <p className="text-[10px] uppercase text-text-muted font-bold mt-1">Transações (Hash)</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-sinarca-neon">{profile.stats?.reputationScore || 100}%</p>
                                <p className="text-[10px] uppercase text-text-muted font-bold mt-1">Reputação</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Right Column: Traceability & History */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Tabs */}
                    <div className="flex border-b border-sinarca-border">
                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'activity' ? 'border-sinarca-neon text-white' : 'border-transparent text-text-muted hover:text-white'}`}
                        >
                            Log de Atividades
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="bg-sinarca-deep rounded-b-2xl rounded-tr-2xl border border-sinarca-border min-h-[500px] p-0 overflow-hidden shadow-xl">
                        {activeTab === 'activity' && (
                            <div className="divide-y divide-sinarca-border">
                                {profile.activity?.map((item: any) => (
                                    <div key={item.id} className="p-6 hover:bg-white/5 transition-colors group">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-sinarca-forest border border-sinarca-border flex items-center justify-center shrink-0">
                                                {item.type === 'audit' ? <FileSignature className="w-5 h-5 text-sinarca-neon" /> :
                                                    item.type === 'retire' ? <Leaf className="w-5 h-5 text-green-400" /> :
                                                        <Activity className="w-5 h-5 text-text-muted" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-white font-bold text-base group-hover:text-sinarca-neon transition-colors">{item.action}</h4>
                                                    <span className="text-xs text-text-muted font-mono">{item.date}</span>
                                                </div>
                                                <p className="text-sm text-gray-400 mt-1">{item.target}</p>
                                                {/* Hash Pill */}
                                                <div className="flex items-center gap-2 mt-3">
                                                    <div className="bg-black/30 border border-sinarca-border rounded px-2 py-1 flex items-center gap-2">
                                                        <Hash className="w-3 h-3 text-sinarca-neon" />
                                                        <span className="text-[10px] font-mono text-gray-300">{item.hash}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!profile.activity || profile.activity.length === 0) && (
                                    <div className="p-8 text-center text-text-muted">
                                        Nenhuma atividade pública recente registrada na blockchain.
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
