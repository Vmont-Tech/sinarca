import { useState, useEffect } from 'react';
import {
    User,
    Shield,
    Briefcase,
    FileSignature,
    Building2,
    Fingerprint,
    CheckCircle,
    XCircle,
    Calendar,
    MapPin,
    Hash,
    Link as LinkIcon,
    ChevronRight,
    Award,
    Activity,
    Lock,
    Leaf
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// --- MOCK CONSTANTS ---
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

const MOCK_DB: any = {
    'default': {
        id: 'USR-2023-8821',
        name: 'Carlos Mendes',
        cpf: '332.***.***-89',
        role: 'auditor',
        position: 'Auditor Sênior Líder',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
        joinedAt: '12 Ago 2022',
        lastActive: 'Online Agora',
        organization: { name: 'Global Verify Auditores Ltda', cnpj: '12.***.***/0001-90', authorizedBy: 'Roberto Silva (Diretor)', logo: 'GV' },
        stats: { projectsAudited: 42, hashesSigned: 156, reputationScore: 98 },
        activity: [
            { id: 'TX-9901', action: 'Auditoria Finalizada', target: 'Reserva Juma (Fase 2)', date: 'Hoje, 09:30', hash: '0x8f2...a9c1', type: 'audit' },
            { id: 'TX-9902', action: 'Validação de Documentos', target: 'Carbono Cerrado', date: 'Ontem, 16:45', hash: '0x3d4...g7h8', type: 'audit' },
            { id: 'TX-9903', action: 'Check-in de Campo', target: 'Recuperação Florestal Amazônia', date: '01 Jan 2025, 10:00', hash: '0x1a2...b3c4', type: 'audit' }
        ]
    },
    'banco-futuro': {
        id: 'USR-2024-BF01',
        name: 'Banco Futuro ESG',
        cpf: 'N/A (CNPJ)',
        role: 'company',
        position: 'Diretoria de Sustentabilidade',
        avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=200&auto=format&fit=crop',
        joinedAt: '10 Jan 2024',
        lastActive: 'Há 2 min',
        organization: { name: 'Banco Futuro S.A.', cnpj: '12.345.678/0001-90', authorizedBy: 'BACEN / CVM', logo: 'BF' },
        stats: { projectsAudited: 0, hashesSigned: 1240, reputationScore: 100 },
        activity: [
            { id: 'TX-9001', action: 'Aposentadoria de Créditos', target: 'Reserva Juma (1.2M tCO2e)', date: '15 Fev 2025, 10:00', hash: '0x7f9...e4r5', type: 'retire' }
        ]
    },
    'agrosustentavel': {
        id: 'USR-2024-AG03',
        name: 'AgroSustentável',
        cpf: 'N/A (CNPJ)',
        role: 'producer',
        position: 'Gestão de Ativos Ambientais',
        avatar: 'https://images.unsplash.com/photo-1625246333195-f8196ba083df?q=80&w=200&auto=format&fit=crop',
        joinedAt: '15 Jun 2023',
        lastActive: 'Há 5 horas',
        organization: { name: 'AgroSustentável Ltda', cnpj: '98.765.432/0001-21', authorizedBy: 'MAPA', logo: 'AS' },
        stats: { projectsAudited: 0, hashesSigned: 620, reputationScore: 95 },
        activity: [
            { id: 'TX-7001', action: 'Registro de Projeto', target: 'Carbono Cerrado', date: '01 Jan 2025, 05:00', hash: '0x1c9...f2a3', type: 'register' }
        ]
    }
};

export default function UserProfile() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'activity' | 'projects'>('activity');

    useEffect(() => {
        if (id && MOCK_DB[id]) {
            setProfile(MOCK_DB[id]);
        } else if (id) {
            setProfile({
                ...MOCK_DB['default'],
                name: `Organização ${id}`,
                id: `USR-GEN-${id.substring(0, 4).toUpperCase()}`,
                role: 'company'
            });
        } else if (user) {
            // Check if user matches any mock for better demo
            const mockKey = user.role === 'auditor' ? 'default' : 
                          user.role === 'producer' ? 'agrosustentavel' : 
                          user.role === 'company' ? 'banco-futuro' : 'default';
            
            const baseMock = MOCK_DB[mockKey] || MOCK_DB['default'];
            
            setProfile({
                ...baseMock,
                name: user.name || baseMock.name,
                id: user.id || baseMock.id,
                role: user.role || baseMock.role,
                position: user.role === 'producer' ? 'Gestor de Ativos' : (baseMock.position || 'Membro SINARCA')
            });
        }
    }, [id, user]);

    if (!profile) return <div className="p-20 text-center text-primary flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold uppercase tracking-widest text-xs">Sincronizando Perfil...</p>
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
function Share2(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
            <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
    )
}
