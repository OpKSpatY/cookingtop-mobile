import { getApiBaseUrl } from '../config/env';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';

export class AuthApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

function parseErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (Array.isArray(o.message) && o.message.length > 0) {
      return o.message.map((m) => (typeof m === 'string' ? m : String(m))).join(' ');
    }
    if (typeof o.error === 'string' && o.error.trim()) return o.error.trim();
    if (typeof o.error === 'object' && o.error !== null) {
      const err = o.error as Record<string, unknown>;
      if (typeof err.message === 'string') return err.message;
    }
  }
  return 'Não foi possível completar a operação. Tente novamente.';
}

async function postJson<T>(path: string, body: object): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');
  }

  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(
      'Não foi possível conectar ao servidor. Verifique se a API está rodando, a URL no .env e se o celular está na mesma rede (use o IP do PC, não 127.0.0.1).'
    );
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new AuthApiError(text || 'Resposta inválida do servidor', res.status);
  }

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  return data as T;
}

export async function loginApi(payload: LoginRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>('/auth/login', payload);
}

export async function registerApi(payload: RegisterRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>('/auth/register', payload);
}
