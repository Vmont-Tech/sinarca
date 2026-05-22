const DEFAULT_API_URL = '/api/v1';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

type RequestOptions = Omit<RequestInit, 'body'> & {
    body?: unknown;
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

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        body,
    });

    if (!response.ok) {
        let message = '';
        try {
            const errData = await response.json();
            message = errData.detail || errData.message || `HTTP ${response.status}`;
        } catch {
            message = await response.text().catch(() => `HTTP ${response.status}`);
        }
        throw new Error(message);
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
