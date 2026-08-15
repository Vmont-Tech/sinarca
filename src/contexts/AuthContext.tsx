import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiPost, apiGet, apiPatch } from '../services/api';

export type UserRole = 'producer' | 'auditor' | 'company' | 'certifier' | 'admin';

interface User {
    id: string;
    name: string;
    email: string;
    document: string;
    role: UserRole;
    organization?: string;
    phone?: string;
    avatar?: string;
    govLevel?: 'prata' | 'ouro';
}

interface UserDocumentUpload {
    success: boolean;
    id: string;
    filename: string;
    document_type: string;
    mime_type: string;
    size_bytes: number;
    sha256: string;
    storage_path: string;
    bucket: string;
    object_path: string;
    status: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string, role?: UserRole) => Promise<void>;
    register: (data: Partial<User> & { password: string }) => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    uploadAvatar: (file: File) => Promise<void>;
    uploadUserDocument: (file: File, documentType: string) => Promise<UserDocumentUpload | null>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_TTL_MS = Number(import.meta.env.VITE_SESSION_TTL_MS || 6 * 60 * 60 * 1000);
const PUBLIC_ROLES: UserRole[] = ['producer', 'auditor', 'company', 'certifier'];
const AUTH_ROLES: UserRole[] = [...PUBLIC_ROLES, 'admin'];

const normalizeRole = (role?: string, defaultRole?: UserRole): UserRole => {
    const normalized = (role || defaultRole || 'company') as UserRole;
    return AUTH_ROLES.includes(normalized) ? normalized : 'company';
};

const normalizePublicRegistrationRole = (role?: string): Exclude<UserRole, 'admin'> => {
    const normalized = (role || 'company') as UserRole;
    return PUBLIC_ROLES.includes(normalized) ? normalized as Exclude<UserRole, 'admin'> : 'company';
};

const normalizeUser = (raw: any, requestedRole?: UserRole): User => ({
    id: String(raw?.id || `user-${Date.now()}`),
    name: raw?.name || raw?.nome || raw?.username || 'Usuário SINARCA',
    email: raw?.email || '',
    document: raw?.document || raw?.cpf || raw?.cnpj || '',
    role: normalizeRole(raw?.role || raw?.tipo_usuario, requestedRole),
    organization: raw?.organization || raw?.organizacao,
    phone: raw?.phone || raw?.telefone,
    avatar: raw?.avatar,
    govLevel: raw?.govLevel,
});

const sessionIsExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() <= Date.now();
};

const clearSessionStorage = () => {
    localStorage.removeItem('sinarca_user');
    localStorage.removeItem('sinarca_token');
    localStorage.removeItem('sinarca_token_expires_at');
    localStorage.removeItem('sinarca.localAuthUser');
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('sinarca_token');
            const expiresAt = localStorage.getItem('sinarca_token_expires_at');
            
            if (token && !sessionIsExpired(expiresAt)) {
                try {
                    const userData = await apiGet<any>('/auth/me');
                    if (userData) {
                        const normalized = normalizeUser(userData);
                        setUser(normalized);
                        localStorage.setItem('sinarca_user', JSON.stringify(normalized));
                    } else {
                        throw new Error('No user data');
                    }
                } catch (e) {
                    console.error('Sessão inválida no backend:', e);
                    setUser(null);
                    clearSessionStorage();
                }
            } else {
                setUser(null);
                clearSessionStorage();
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const persistUser = (userData: User, token?: string, expiresAt?: string) => {
        const expiration = expiresAt || new Date(Date.now() + SESSION_TTL_MS).toISOString();
        setUser(userData);
        localStorage.setItem('sinarca_user', JSON.stringify(userData));
        localStorage.setItem('sinarca_token_expires_at', expiration);
        if (token) localStorage.setItem('sinarca_token', token);
    };

    const login = async (email: string, password: string, role?: UserRole): Promise<void> => {
        const response = await apiPost<any>('/auth/login', { email, dadoLogin: email, password, role });
        if (response?.user) {
            persistUser(normalizeUser(response.user, role), response.token || response.access_token, response.expires_at);
        }
    };

    const updateProfile = async (data: Partial<User>): Promise<void> => {
        const response = await apiPatch<any>('/auth/me', data);
        if (response) {
            const normalized = normalizeUser(response);
            setUser(normalized);
            localStorage.setItem('sinarca_user', JSON.stringify(normalized));
        }
    };

    const uploadAvatar = async (file: File): Promise<void> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiPost<any>('/auth/me/avatar', formData);
        if (response) {
            const normalized = normalizeUser(response);
            setUser(normalized);
            localStorage.setItem('sinarca_user', JSON.stringify(normalized));
        }
    };

    const uploadUserDocument = async (file: File, documentType: string): Promise<UserDocumentUpload | null> => {
        const formData = new FormData();
        formData.append('document_type', documentType);
        formData.append('file', file);
        return apiPost<UserDocumentUpload>('/auth/me/documents', formData);
    };

    const register = async (data: Partial<User> & { password: string }): Promise<void> => {
        const safeData = { ...data, role: normalizePublicRegistrationRole(data.role) };
        const response = await apiPost<any>('/auth/register', safeData);
        if (response?.user) {
            persistUser(normalizeUser(response.user, safeData.role), response.token || response.access_token, response.expires_at);
            return;
        }
        throw new Error('Cadastro indisponível. Verifique API ou payload.');
    };

    const logout = () => {
        setUser(null);
        clearSessionStorage();
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, updateProfile, uploadAvatar, uploadUserDocument, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};
