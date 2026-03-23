import Constants from 'expo-constants';

/**
 * URL base da API (sem barra no final).
 * Defina no `.env`: EXPO_PUBLIC_API_URL=https://seu-dominio.com
 */
export function getApiBaseUrl(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;

  if (!fromEnv || typeof fromEnv !== 'string' || !fromEnv.trim()) {
    console.warn(
      '[env] EXPO_PUBLIC_API_URL não definida. Adicione no .env: EXPO_PUBLIC_API_URL=https://sua-api.com'
    );
    return '';
  }

  return fromEnv.replace(/\/+$/, '');
}

/**
 * UUID opcional da unidade de medida padrão (POST /ingredients) quando GET /measure-units não estiver disponível.
 * Defina no `.env`: EXPO_PUBLIC_DEFAULT_MEASURE_UNIT_ID=uuid
 */
export function getDefaultMeasureUnitId(): string | undefined {
  const v =
    process.env.EXPO_PUBLIC_DEFAULT_MEASURE_UNIT_ID ??
    (Constants.expoConfig?.extra as { defaultMeasureUnitId?: string } | undefined)
      ?.defaultMeasureUnitId;
  if (v && typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}
