import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import {
  Animated, Pressable, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle } from 'lucide-react-native';

export type ToastVariant = 'success' | 'error';

interface ToastPayload {
  variant: ToastVariant;
  title: string;
  /** Linha secundária (só sucesso costuma usar; erro pode repetir detalhe) */
  message: string;
}

interface ToastContextType {
  /** Toast verde — título em destaque + texto opcional abaixo */
  showSuccess: (title: string, message?: string) => void;
  /** Toast vermelho — texto principal (ex.: mensagem da API); título opcional no topo */
  showError: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DURATION_MS = { success: 2800, error: 4200 };

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -12, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const present = useCallback(
    (payload: ToastPayload) => {
      if (hideRef.current) clearTimeout(hideRef.current);
      setToast(payload);
      opacity.setValue(0);
      translateY.setValue(-16);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      const ms = payload.variant === 'success' ? DURATION_MS.success : DURATION_MS.error;
      hideRef.current = setTimeout(() => {
        hide();
      }, ms);
    },
    [hide, opacity, translateY]
  );

  useEffect(() => () => {
    if (hideRef.current) clearTimeout(hideRef.current);
  }, []);

  const showSuccess = useCallback(
    (title: string, message = '') => {
      present({ variant: 'success', title, message });
    },
    [present]
  );

  const showError = useCallback(
    (message: string, title = 'Algo deu errado') => {
      present({ variant: 'error', title, message });
    },
    [present]
  );

  const isError = toast?.variant === 'error';

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              paddingTop: insets.top + 8,
              paddingHorizontal: Math.max(16, (width - 400) / 2),
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Pressable
            onPress={hide}
            style={({ pressed }) => [
              styles.banner,
              isError ? styles.bannerError : styles.bannerSuccess,
              pressed && { opacity: 0.92 },
            ]}
          >
            {isError ? (
              <XCircle size={22} color="#B91C1C" style={styles.icon} />
            ) : (
              <CheckCircle2 size={22} color="#15803D" style={styles.icon} />
            )}
            <View style={styles.textCol}>
              <Text style={[styles.title, isError ? styles.titleError : styles.titleSuccess]}>
                {toast.title}
              </Text>
              {!!toast.message.trim() && (
                <Text style={[styles.message, isError ? styles.messageError : styles.messageSuccess]}>
                  {toast.message}
                </Text>
              )}
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: 400,
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  icon: { marginTop: 1 },
  textCol: { flex: 1, marginLeft: 12 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  titleSuccess: { color: '#14532D' },
  titleError: { color: '#991B1B' },
  message: { fontSize: 14, lineHeight: 20 },
  messageSuccess: { color: '#166534' },
  messageError: { color: '#B91C1C' },
});

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
