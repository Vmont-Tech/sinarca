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
    avatar?: string;
    govLevel?: 'prata' | 'ouro';
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string, role?: UserRole) => Promise<void>;
    loginWithGovBr: () => Promise<void>;
    register: (data: Partial<User> & { password: string }) => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_TTL_MS = Number(import.meta.env.VITE_SESSION_TTL_MS || 6 * 60 * 60 * 1000);
const ALLOW_LOCAL_AUTH_FALLBACK = String(import.meta.env.VITE_ALLOW_LOCAL_AUTH_FALLBACK || 'false').toLowerCase() === 'true';
const PUBLIC_ROLES: UserRole[] = ['producer', 'auditor', 'company', 'certifier'];

const normalizeRole = (role?: string, fallback?: UserRole): UserRole => {
    const normalized = (role || fallback || 'company') as UserRole;
    if (normalized === 'admin') return 'company';
    return PUBLIC_ROLES.includes(normalized) ? normalized : 'company';
};

const normalizeUser = (raw: any, fallbackRole?: UserRole): User => ({
    id: String(raw?.id || `user-${Date.now()}`),
    name: raw?.name || raw?.nome || raw?.username || 'Usuário SINARCA',
    email: raw?.email || '',
    document: raw?.document || raw?.cpf || raw?.cnpj || '',
    role: normalizeRole(raw?.role || raw?.tipo_usuario, fallbackRole),
    avatar: raw?.avatar,
    govLevel: raw?.govLevel,
});

const sessionIsExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() <= Date.now();
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
                    localStorage.removeItem('sinarca_user');
                    localStorage.removeItem('sinarca_token');
                    localStorage.removeItem('sinarca_token_expires_at');
                }
            } else {
                setUser(null);
                localStorage.removeItem('sinarca_user');
                localStorage.removeItem('sinarca_token');
                localStorage.removeItem('sinarca_token_expires_at');
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

    const loginWithGovBr = async (): Promise<void> => {
        if (!ALLOW_LOCAL_AUTH_FALLBACK) throw new Error('Gov.br simulado desativado neste ambiente.');
        persistUser({
            id: `gov-${Date.now()}`,
            name: 'Cidadão Gov.br',
            email: 'usuario@sinarca.com.br',
            document: 'XXX.XXX.XXX-XX',
            role: 'company',
            govLevel: 'ouro',
        });
    };

    const register = async (data: Partial<User> & { password: string }): Promise<void> => {
        const safeData = { ...data, role: normalizeRole(data.role) };
        try {
            const response = await apiPost<any>('/auth/register', safeData);
            if (response?.user) return;
        } catch (apiError) {
            console.warn('[SINARCA] Cadastro via API falhou.', apiError);
            if (!ALLOW_LOCAL_AUTH_FALLBACK) throw new Error('Cadastro indisponível. Verifique API ou payload.');
        }

        if (!ALLOW_LOCAL_AUTH_FALLBACK) throw new Error('Cadastro local desativado.');

        const newUser = {
            id: `user-${Date.now()}`,
            name: data.name || 'Novo Usuário',
            email: data.email || '',
            document: data.document || '',
            role: safeData.role,
            password: data.password,
        };

        const usersDb = JSON.parse(localStorage.getItem('sinarca_users_db') || '[]');
        usersDb.push(newUser);
        localStorage.setItem('sinarca_users_db', JSON.stringify(usersDb));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('sinarca_user');
        localStorage.removeItem('sinarca_token');
        localStorage.removeItem('sinarca_token_expires_at');
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, loginWithGovBr, register, updateProfile, logout, isLoading }}>
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
