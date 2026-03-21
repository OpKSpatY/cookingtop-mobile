import React, {
  createContext, useContext, useState, useCallback, useEffect, type ReactNode,
} from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/storageKeys';
import type { ApiUser } from '../types/auth';
import { colors } from '../theme/colors';

interface AuthSession {
  accessToken: string;
  user: ApiUser;
}

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: ApiUser | null;
  isHydrating: boolean;
  setSession: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function persistSession(session: AuthSession): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, session.accessToken],
    [STORAGE_KEYS.USER_JSON, JSON.stringify(session.user)],
  ]);
}

async function clearPersistedSession(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.USER_JSON]);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [[, token], [, userJson]] = await AsyncStorage.multiGet([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.USER_JSON,
        ]);
        if (cancelled) return;
        if (token && userJson) {
          const parsed = JSON.parse(userJson) as ApiUser;
          setAccessToken(token);
          setUser(parsed);
        }
      } catch {
        // ignore parse errors
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setSession = useCallback(async (session: AuthSession) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    await persistSession(session);
  }, []);

  const logout = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    await clearPersistedSession();
  }, []);

  const value: AuthContextType = {
    isAuthenticated: !!accessToken && !!user,
    accessToken,
    user,
    isHydrating,
    setSession,
    logout,
  };

  if (isHydrating) {
    return (
      <View style={styles.hydrate}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const styles = StyleSheet.create({
  hydrate: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
