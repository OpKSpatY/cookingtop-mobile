export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@cookingtop/access_token',
  USER_JSON: '@cookingtop/user',
  /** ETag de GET /recipes/pantry-availability */
  PANTRY_AVAILABILITY_ETAG: '@cookingtop/pantry_availability_etag',
  /** Último JSON 200 dessa rota (string) para hidratar após reinício do app */
  PANTRY_AVAILABILITY_PAYLOAD: '@cookingtop/pantry_availability_payload',
  /** ETag de GET /ingredients */
  INGREDIENTS_LIST_ETAG: '@cookingtop/ingredients_list_etag',
  /** Último JSON 200 de GET /ingredients */
  INGREDIENTS_LIST_PAYLOAD: '@cookingtop/ingredients_list_payload',
} as const;
