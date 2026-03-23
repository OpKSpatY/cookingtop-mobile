import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { ApiUser } from '../types/auth';

export interface UserProfile {
  name: string;
  email: string;
  bio: string;
  avatar: any;
  xp: number;
  memberSince: string;
  totalCozinhadas: number;
}

interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<Pick<UserProfile, 'bio' | 'avatar'>>) => void;
}

export const AVATAR_OPTIONS: any[] = [
  require('../assets/avatars/chef-1.png'),
  require('../assets/avatars/chef-2.png'),
  require('../assets/avatars/chef-3.png'),
  require('../assets/avatars/chef-4.png'),
  require('../assets/avatars/chef-5.png'),
  require('../assets/avatars/chef-6.png'),
  require('../assets/avatars/chef-7.png'),
  require('../assets/avatars/chef-8.png'),
  require('../assets/avatars/chef-9.png'),
  require('../assets/avatars/chef-10.png'),
  require('../assets/avatars/chef-11.png'),
  require('../assets/avatars/chef-12.png'),
];

const defaultProfile: UserProfile = {
  name: 'Usuário',
  email: 'usuario@email.com',
  bio: '',
  avatar: AVATAR_OPTIONS[0],
  xp: 0,
  memberSince: '—',
  totalCozinhadas: 0,
};

export function mapApiUserToProfile(user: ApiUser): UserProfile {
  const idx = Math.max(0, Math.min((user.avatarId ?? 1) - 1, AVATAR_OPTIONS.length - 1));
  /** Só exibe bio quando a API enviar descrição; senão a tela mostra placeholder */
  const bio = user.profileDescription?.trim() ?? '';
  const d = new Date(user.createdAt);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const memberSince = `${months[d.getMonth()]} ${d.getFullYear()}`;
  return {
    name: user.name,
    email: user.email,
    bio,
    avatar: AVATAR_OPTIONS[idx],
    xp: user.xp,
    memberSince,
    totalCozinhadas: 0,
  };
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

interface UserProfileProviderProps {
  children: ReactNode;
  /** Dados do usuário vindos da API (login/registro) */
  apiUser: ApiUser | null;
}

export const UserProfileProvider = ({ children, apiUser }: UserProfileProviderProps) => {
  const [profile, setProfile] = useState<UserProfile>(() =>
    apiUser ? mapApiUserToProfile(apiUser) : defaultProfile
  );

  useEffect(() => {
    if (apiUser) {
      setProfile(mapApiUserToProfile(apiUser));
    }
  }, [
    apiUser?.id,
    apiUser?.name,
    apiUser?.email,
    apiUser?.xp,
    apiUser?.avatarId,
    apiUser?.profileDescription,
    apiUser?.createdAt,
  ]);

  const updateProfile = useCallback((updates: Partial<Pick<UserProfile, 'bio' | 'avatar'>>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <UserProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
};
