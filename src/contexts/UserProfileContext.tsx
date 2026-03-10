import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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
  name: 'Pedro Henrique',
  email: 'mcpedrohenriquelc@gmail.com',
  bio: 'Apaixonado por culinária brasileira e pratos rápidos do dia a dia 🍳',
  avatar: AVATAR_OPTIONS[0],
  xp: 350,
  memberSince: 'Março 2025',
  totalCozinhadas: 42,
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

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
