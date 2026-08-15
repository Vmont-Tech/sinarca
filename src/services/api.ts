const DEFAULT_API_URL = '/api/v1';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

type RequestOptions = Omit<RequestInit, 'body'> & {
    body?: unknown;
};

export const SESSION_EXPIRED_EVENT = 'sinarca:session-expired';

const clearAuthSession = () => {
    localStorage.removeItem('sinarca_user');
    localStorage.removeItem('sinarca_token');
    localStorage.removeItem('sinarca_token_expires_at');
    localStorage.removeItem('sinarca.localAuthUser');
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

const friendlyError = (status: number, fallback: string) => {
    if (status === 401) return 'Credenciais inválidas ou sessão expirada. Faça login novamente.';
    if (status === 403) return 'Seu perfil não possui permissão para esta ação.';
    if (status === 409) return 'Este e-mail já está cadastrado.';
    if (status === 422) return 'Dados inválidos. Revise os campos e tente novamente.';
    if (status >= 500) return 'API indisponível no momento. Tente novamente em instantes.';
    return fallback || `Erro HTTP ${status}`;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
    const token = localStorage.getItem('sinarca_token');
    const headers = new Headers(options.headers || {});

    if (token) headers.set('Authorization', `Bearer ${token}`);

    let body: BodyInit | undefined;
    if (options.body instanceof FormData) {
        body = options.body;
    } else if (options.body !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
            body,
        });
    } catch {
        throw new Error('API indisponível. Verifique sua conexão ou se o serviço local está ativo.');
    }

    if (!response.ok) {
        let message = '';
        try {
            const errData = await response.json();
            message = errData.detail || errData.message || `HTTP ${response.status}`;
        } catch {
            message = await response.text().catch(() => `HTTP ${response.status}`);
        }
        if (response.status === 401) clearAuthSession();
        throw new Error(friendlyError(response.status, message));
    }

    return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T | null> {
    return request<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T | null> {
    return request<T>(path, { method: 'POST', body });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T | null> {
    return request<T>(path, { method: 'PATCH', body });
}
