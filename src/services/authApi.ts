import { getApiBaseUrl } from '../config/env';
import type {
  ApiUser,
  AuthResponse,
  LoginRequest,
  PatchMeRequest,
  RegisterRequest,
} from '../types/auth';

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

/** Quando o proxy/servidor devolve página HTML (404 nginx, SPA, etc.) em vez de JSON */
export const RESPONSE_WAS_HTML_OR_NON_JSON =
  'O servidor respondeu com HTML em vez de JSON. Verifique EXPO_PUBLIC_API_URL (URL base da API com porta correta), se o backend está no ar e — no celular — use o IP da máquina (não localhost).';

export function isProbablyHtmlResponse(text: string): boolean {
  const s = text.slice(0, 1200).trim().toLowerCase();
  if (s.startsWith('<!doctype') || s.startsWith('<html')) return true;
  if (/<\s*html[\s>]/.test(s)) return true;
  if (s.startsWith('<head') || s.startsWith('<body') || s.startsWith('<title')) return true;
  return false;
}

/**
 * Faz parse do corpo HTTP; se não for JSON (ex.: HTML de erro), lança mensagem legível — nunca o HTML inteiro.
 */
export function parseResponseJsonBody(
  text: string,
  res: Response,
  emptyWhenBlank: unknown
): unknown {
  const trimmed = text.trim();
  if (!trimmed) return emptyWhenBlank;
  try {
    return JSON.parse(trimmed);
  } catch {
    if (isProbablyHtmlResponse(trimmed)) {
      throw new AuthApiError(RESPONSE_WAS_HTML_OR_NON_JSON, res.status);
    }
    throw new AuthApiError(
      trimmed.length > 160
        ? 'Resposta inválida do servidor (não é JSON). Verifique a URL da API.'
        : trimmed,
      res.status
    );
  }
}

export function parseErrorMessage(data: unknown): string {
  if (typeof data === 'string' && data.trim()) {
    if (isProbablyHtmlResponse(data)) return RESPONSE_WAS_HTML_OR_NON_JSON;
    return data.length > 280 ? `${data.slice(0, 280)}…` : data.trim();
  }
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
  const data = parseResponseJsonBody(text, res, {});

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  return data as T;
}

async function patchJson<T>(path: string, body: object, accessToken: string): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new AuthApiError('Configure EXPO_PUBLIC_API_URL no arquivo .env');
  }

  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(
      'Não foi possível conectar ao servidor. Verifique se a API está rodando, a URL no .env e se o celular está na mesma rede (use o IP do PC, não 127.0.0.1).'
    );
  }

  const text = await res.text();
  const data = parseResponseJsonBody(text, res, {});

  if (!res.ok) {
    throw new AuthApiError(parseErrorMessage(data), res.status, data);
  }

  return data as T;
}

/**
 * Interpreta a resposta do PATCH /users/me (usuário completo, parcial ou { user }).
 */
function mergePatchMeResponse(data: unknown, current: ApiUser): ApiUser {
  if (!data || typeof data !== 'object') return current;
  const o = data as Record<string, unknown>;

  if (o.user && typeof o.user === 'object') {
    const u = o.user as Record<string, unknown>;
    return normalizeUserPayload(u, current);
  }

  return normalizeUserPayload(o, current);
}

function normalizeUserPayload(o: Record<string, unknown>, current: ApiUser): ApiUser {
  if (typeof o.id === 'string' && typeof o.email === 'string' && typeof o.name === 'string') {
    return o as unknown as ApiUser;
  }

  return {
    ...current,
    ...(typeof o.avatarId === 'number' ? { avatarId: o.avatarId } : {}),
    ...(o.profileDescription !== undefined
      ? {
          profileDescription:
            o.profileDescription === null || o.profileDescription === undefined
              ? null
              : String(o.profileDescription),
        }
      : {}),
    ...(typeof o.xp === 'number' ? { xp: o.xp } : {}),
    ...(typeof o.name === 'string' ? { name: o.name } : {}),
    ...(typeof o.email === 'string' ? { email: o.email } : {}),
    ...(typeof o.createdAt === 'string' ? { createdAt: o.createdAt } : {}),
    ...(typeof o.lastLoginAt === 'string' ? { lastLoginAt: o.lastLoginAt } : {}),
  };
}

function applyPatchBodyToUser(current: ApiUser, body: PatchMeRequest): ApiUser {
  return {
    ...current,
    ...(body.avatarId !== undefined ? { avatarId: body.avatarId } : {}),
    ...(body.profileDescription !== undefined
      ? {
          profileDescription:
            body.profileDescription.trim() === '' ? null : body.profileDescription.trim(),
        }
      : {}),
  };
}

/**
 * Atualiza perfil do usuário autenticado (avatar e descrição).
 */
export async function patchMeApi(
  accessToken: string,
  body: PatchMeRequest,
  currentUser: ApiUser
): Promise<ApiUser> {
  const raw = await patchJson<unknown>('/users/me', body, accessToken);
  const looksEmpty =
    raw === null ||
    raw === undefined ||
    (typeof raw === 'object' && raw !== null && Object.keys(raw as object).length === 0);
  if (looksEmpty) {
    return applyPatchBodyToUser(currentUser, body);
  }
  return mergePatchMeResponse(raw, currentUser);
}

export async function loginApi(payload: LoginRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>('/auth/login', payload);
}

export async function registerApi(payload: RegisterRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>('/auth/register', payload);
}
