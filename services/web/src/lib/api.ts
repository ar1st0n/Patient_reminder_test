export type ApiError = {
  status: number;
  message: string;
};

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export function getApiBaseUrl() {
  return baseUrl;
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('auth_token');
}

export function setAuthToken(token: string) {
  window.localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
  window.localStorage.removeItem('auth_token');
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const headers = new Headers(init?.headers);

  const auth = init?.auth ?? true;
  if (auth) {
    const token = getAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    if (res.status === 401 && auth && typeof window !== 'undefined') {
      clearAuthToken();
      window.location.href = '/login';
    }
    const text = await res.text().catch(() => '');
    throw { status: res.status, message: text || res.statusText } as ApiError;
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export function getErrorMessage(e: unknown) {
  if (typeof e === 'object' && e !== null) {
    const maybeMessage = (e as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
  }
  if (typeof e === 'string' && e.trim()) return e;
  return 'Unexpected error';
}
