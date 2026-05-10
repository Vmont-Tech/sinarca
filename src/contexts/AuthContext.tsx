import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tipos
interface User {
    id: string;
    name: string;
    email: string;
    document: string; // CPF/CNPJ
    role: 'producer' | 'auditor' | 'company' | 'admin';
    avatar?: string;
    // Dados extras que podem vir do Gov.br
    govLevel?: 'prata' | 'ouro';
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string, role?: User['role']) => Promise<void>;
    loginWithGovBr: () => Promise<void>;
    register: (data: Partial<User> & { password: string }) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Carregar usuário do localStorage na inicialização
    useEffect(() => {
        const storedUser = localStorage.getItem('sinarca_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Erro ao recuperar sessão:", e);
                localStorage.removeItem('sinarca_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string, role?: User['role']): Promise<void> => {
        // Simulação de delay de rede
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const usersDb = JSON.parse(localStorage.getItem('sinarca_users_db') || '[]');
                const found = usersDb.find((u: any) => (u.email === email || u.document === email) && u.password === password);

                if (found) {
                    const { password, ...userData } = found;
                    persistUser(userData);
                    resolve();
                } else if (email === 'admin@sinarca.com.br' && password === 'admin') {
                    const adminUser: User = {
                        id: 'admin-001',
                        name: 'Administrador SINARCA',
                        email: 'admin@sinarca.com.br',
                        document: '000.000.000-00',
                        role: 'admin',
                        govLevel: 'ouro'
                    };
                    persistUser(adminUser);
                    resolve();
                } else {
                    // Se não tiver no DB, permitir login genérico com papel selecionado
                    if (email && password) {
                        const demoUser: User = {
                            id: 'demo-' + (role || 'producer') + '-' + Date.now(),
                            name: role === 'auditor' ? 'Carlos Mendes' : 
                                  role === 'company' ? 'Banco Futuro' : 'Produtor Demo',
                            email: email,
                            document: '123.456.789-00',
                            role: role || 'producer'
                        };
                        persistUser(demoUser);
                        resolve();
                    } else {
                        reject(new Error("Credenciais inválidas."));
                    }
                }
            }, 1000);
        });
    };

    const loginWithGovBr = async (): Promise<void> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const govUser: User = {
                    id: 'gov-' + Date.now(),
                    name: 'Cidadão Gov.br',
                    email: 'usuario@sinarca.com.br',
                    document: 'XXX.XXX.XXX-XX',
                    role: 'company', // Default to company for gov.br in this demo
                    govLevel: 'ouro',
                    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4JFxo_HYfIfvQvE50ooFUkw6Sbd3nOb8Kg-KtlSBUW803bjIlq8QW-QMvBB1DGFvFpp3kUfF713aR9_wXIxfjn_1JhYqR6JqQs9ix2JAt_jQSeSk2q8FfmghXe7mGtsRUAgFGx9owCTYhLBEJggq-NWp9cRzOa4wP33RbVkUrw6g8i5v4wlyZ0OqaFcfU5XCMOrswkHNR7RBzeEgUDbexJi9xa-YgZg0yW_vVgzd4UB3OBHFCOrXcznF8M8Q9SznyvC9oHi6SR6E'
                };
                persistUser(govUser);
                resolve();
            }, 1500);
        });
    };

    const register = async (data: Partial<User> & { password: string }): Promise<void> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newUser = {
                    id: 'user-' + Date.now(),
                    name: data.name || 'Novo Usuário',
                    email: data.email || '',
                    document: data.document || '',
                    role: data.role || 'company',
                    password: data.password 
                };

                const usersDb = JSON.parse(localStorage.getItem('sinarca_users_db') || '[]');
                usersDb.push(newUser);
                localStorage.setItem('sinarca_users_db', JSON.stringify(usersDb));

                resolve();
            }, 1000);
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('sinarca_user');
    };

    const persistUser = (userData: User) => {
        setUser(userData);
        localStorage.setItem('sinarca_user', JSON.stringify(userData));
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, loginWithGovBr, register, logout, isLoading }}>
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
