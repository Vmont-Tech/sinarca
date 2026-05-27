import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    User,
    ShieldCheck,
    Bell,
    Lock,
    Save,
    FileText,
    LogOut,
    Upload
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
    producer: 'Produtor Rural',
    company: 'Empresa Compradora',
    auditor: 'Auditor Ambiental',
    certifier: 'Certificadora',
    admin: 'Administrador',
};

export default function Settings() {
    const navigate = useNavigate();
    const { user, updateProfile, uploadAvatar, uploadUserDocument, logout } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [company, setCompany] = useState(user?.organization || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [document, setDocument] = useState(user?.document || '');
    const [documentType, setDocumentType] = useState('IDENTITY');
    
    const [saving, setSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [documentUploading, setDocumentUploading] = useState(false);
    const [message, setMessage] = useState('');
    const avatarSrc = useMemo(() => {
        const trimmed = (user?.avatar || '').trim();
        if (trimmed.startsWith('http')) return trimmed;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'SINARCA')}&background=16a34a&color=fff&size=200`;
    }, [user?.avatar, name]);

    useEffect(() => {
        setName(user?.name || '');
        setEmail(user?.email || '');
        setCompany(user?.organization || '');
        setPhone(user?.phone || '');
        setDocument(user?.document || '');
    }, [user?.id, user?.name, user?.email, user?.organization, user?.phone, user?.document]);

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            await updateProfile({ name, email, organization: company, phone, document } as any);
            setMessage('Perfil atualizado com sucesso!');
        } catch (e: any) {
            setMessage(e.message || 'Erro ao salvar perfil.');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        setMessage('');
        try {
            await uploadAvatar(file);
            setMessage('Avatar salvo no bucket profiles.');
        } catch (e: any) {
            setMessage(e.message || 'Erro ao enviar avatar.');
        } finally {
            setAvatarUploading(false);
            event.target.value = '';
        }
    };

    const handleUserDocumentSelected = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setDocumentUploading(true);
        setMessage('');
        try {
            await uploadUserDocument(file, documentType);
            setMessage('Documento salvo no bucket user-documents.');
        } catch (e: any) {
            setMessage(e.message || 'Erro ao enviar documento.');
        } finally {
            setDocumentUploading(false);
            event.target.value = '';
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h1 className="text-3xl font-bold text-black tracking-tight">Configurações da Conta</h1>
                <p className="text-gray-400 mt-1">Gerencie seu perfil e preferências de segurança</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="w-32 h-32 rounded-full bg-gray-50 border-2 border-white shadow-xl overflow-hidden">
                                <img 
                                    src={avatarSrc}
                                    alt="Avatar" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-black uppercase tracking-tight">{name}</h3>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                            {ROLE_LABELS[user?.role || 'company'] || 'Usuário SINARCA'}
                        </p>
                        
                        <div className="w-full mt-8 pt-8 border-t border-gray-50 space-y-4">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 font-bold uppercase tracking-widest">ID Usuário</span>
                                <span className="text-black font-mono font-bold truncate max-w-[160px]">{user?.id || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 font-bold uppercase tracking-widest">Status</span>
                                <span className="text-primary font-bold uppercase tracking-widest flex items-center gap-1.5">
                                    <ShieldCheck className="w-3 h-3" /> Verificado
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10">
                        <div className="flex items-center gap-3 mb-4">
                            <FileText className="w-5 h-5 text-primary" />
                            <h4 className="text-sm font-bold text-black uppercase tracking-widest">Documentação</h4>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Seus documentos de identidade e comprovantes corporativos estão salvos em nossa custódia segura e criptografada.
                        </p>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h4 className="text-lg font-bold text-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <User className="w-5 h-5 text-primary" /> Dados do Perfil
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-4 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                                <div className="relative">
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-4 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Organização / Razão Social</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                        className="w-full pl-4 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Telefone de Contato</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full pl-4 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Documento</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={document}
                                        onChange={(e) => setDocument(e.target.value)}
                                        className="w-full pl-4 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Avatar / Logo</label>
                                <div>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={handleAvatarSelected}
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor="avatar-upload"
                                        className="w-full px-4 py-4 bg-primary text-black font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-primary/80 transition-all cursor-pointer"
                                    >
                                        <Upload className="w-4 h-4" /> {avatarUploading ? 'Enviando...' : 'Selecionar avatar'}
                                    </label>
                                    <p className="text-[11px] text-gray-500 mt-2 ml-1">
                                        PNG, JPG ou WebP até 5 MB. O arquivo é salvo no bucket profiles.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                            <div className="flex flex-col md:flex-row md:items-end gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Documento do usuário</label>
                                    <select
                                        value={documentType}
                                        onChange={(e) => setDocumentType(e.target.value)}
                                        className="mt-2 w-full px-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    >
                                        <option value="IDENTITY">Identidade / CPF / CNPJ</option>
                                        <option value="ORGANIZATION_PROOF">Comprovante da organização</option>
                                        <option value="POWER_OF_ATTORNEY">Procuração</option>
                                        <option value="OTHER">Outro documento</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <input
                                        id="user-document-upload"
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
                                        onChange={handleUserDocumentSelected}
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor="user-document-upload"
                                        className="w-full px-4 py-4 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-primary hover:text-black transition-all cursor-pointer"
                                    >
                                        <Upload className="w-4 h-4" /> {documentUploading ? 'Enviando...' : 'Enviar documento'}
                                    </label>
                                    <p className="text-[11px] text-gray-500 mt-2 ml-1">
                                        PDF, PNG, JPG, CSV ou XLSX até 10 MB. O arquivo é salvo no bucket user-documents.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex flex-col items-end gap-3">
                            {message && (
                                <div className={`text-xs font-bold px-4 py-2 rounded-lg ${message.includes('sucesso') ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-500'}`}>
                                    {message}
                                </div>
                            )}
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="px-8 py-4 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:bg-primary transition-all shadow-xl disabled:opacity-50">
                                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h4 className="text-lg font-bold text-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <Lock className="w-5 h-5 text-primary" /> Segurança
                        </h4>
                        
                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm">
                                    <Bell className="w-6 h-6" />
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-black uppercase tracking-tight">Autenticação em Duas Etapas</h5>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Proteção adicional via aplicativo ou SMS</p>
                                </div>
                            </div>
                            <div className="w-14 h-8 bg-primary rounded-full relative cursor-pointer p-1">
                                <div className="w-6 h-6 bg-white rounded-full absolute right-1"></div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-gray-100">
                            <div>
                                <h5 className="text-sm font-bold text-black uppercase tracking-tight">Sessão ativa</h5>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sair do SINARCA</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="shrink-0 px-5 py-3 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 hover:bg-red-600 transition-colors"
                            >
                                <LogOut className="w-4 h-4" /> Sair
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
