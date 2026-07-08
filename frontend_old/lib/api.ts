const getDefaultApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';

  const hostname = window.location.hostname;
  const normalizedHostname = hostname === '0.0.0.0' || hostname === '[::]' || hostname === '::1'
    ? 'localhost'
    : hostname;

  return `${window.location.protocol}//${normalizedHostname}:3001`;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || getDefaultApiUrl();

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let cachedSupabaseClient: any = null;

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null; // No SSR token fetching this way
  
  if (!cachedSupabaseClient) {
    const { createClient } = await import('./supabase/client');
    cachedSupabaseClient = createClient();
  }
  
  try {
    const { data: { session } } = await cachedSupabaseClient.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    return null;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new ApiError(body.error || `Erro ${res.status}`, res.status);
    }

    // Para downloads (PDF/Excel)
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/pdf') || ct.includes('spreadsheet') || ct.includes('octet-stream')) {
      return res.blob() as Promise<T>;
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const message = error instanceof Error && error.message
      ? error.message
      : 'Não foi possível conectar à API. Verifique se o backend está rodando.';

    throw new ApiError(message, 0);
  }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

// ── Helpers de download ─────────────────────────────────────
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
