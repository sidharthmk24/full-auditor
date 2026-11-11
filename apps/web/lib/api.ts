const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auditor_token');
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auditor_token', token);
  }
}

export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auditor_token');
    localStorage.removeItem('auditor_user');
  }
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('auditor_user');
  return user ? JSON.parse(user) : null;
}

export function setCurrentUser(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auditor_user', JSON.stringify(user));
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMessage = 'Request failed';
    try {
      const errorJson = await res.json();
      errMessage = errorJson.message || errorJson.error || errMessage;
    } catch {
      errMessage = `HTTP error ${res.status}`;
    }
    throw new Error(errMessage);
  }

  return res.json();
}

