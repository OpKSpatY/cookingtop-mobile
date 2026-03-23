/** Usuário retornado pela API após login ou registro */
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  xp: number;
  avatarId: number;
  profileDescription: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: ApiUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/** Corpo de PATCH /users/me — campos opcionais conforme a API */
export interface PatchMeRequest {
  avatarId?: number;
  profileDescription?: string;
}
