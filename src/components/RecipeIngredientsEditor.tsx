import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Search, Trash2, Plus } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hydrateIngredientsCatalogFromDisk, syncIngredientsCatalog } from '../utils/ingredientsCatalogCache';
import type { ApiIngredient } from '../types/ingredients';
import { AuthApiError } from '../services/authApi';
import { colors } from '../theme/colors';

/** Linha no formulário de receita (catálogo + quantidade numérica + observação opcional) */
export type RecipeFormIngredientRow = {
  ingredientId: string;
  name: string;
  /** Valor numérico como texto (enviado como `amount` na API) */
  amount: string;
  /** Observação opcional (tipo de farinha, etc.) → campo `note` */
  note: string;
};

type RecipeIngredientsEditorProps = {
  rows: RecipeFormIngredientRow[];
  onChange: (rows: RecipeFormIngredientRow[]) => void;
  disabled?: boolean;
};

const RecipeIngredientsEditor = ({ rows, onChange, disabled }: RecipeIngredientsEditorProps) => {
  const { accessToken } = useAuth();
  const { showError } = useToast();
  const [catalog, setCatalog] = useState<ApiIngredient[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!accessToken) {
      setCatalog([]);
      return;
    }
    let cancelled = false;
    setLoadingCatalog(true);
    void (async () => {
      try {
        const cached = await hydrateIngredientsCatalogFromDisk();
        if (!cancelled && cached?.length) {
          setCatalog(cached);
        }
        const { ingredients } = await syncIngredientsCatalog(accessToken);
        if (!cancelled && ingredients !== null) {
          setCatalog(ingredients);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof AuthApiError ? e.message : 'Não foi possível carregar ingredientes.';
          showError(msg, 'Catálogo');
          setCatalog([]);
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, showError]);

  const addedIds = useMemo(() => new Set(rows.map((r) => r.ingredientId)), [rows]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = catalog.filter((c) => !addedIds.has(c.id));
    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list.slice(0, 40);
  }, [catalog, search, addedIds]);

  const addIngredient = useCallback(
    (ing: ApiIngredient) => {
      if (addedIds.has(ing.id)) {
        showError('Este ingrediente já está na lista.', 'Receita');
        return;
      }
      onChange([
        ...rows,
        { ingredientId: ing.id, name: ing.name, amount: '', note: '' },
      ]);
      setSearch('');
    },
    [addedIds, onChange, rows, showError]
  );

  const removeRow = (ingredientId: string) => {
    onChange(rows.filter((r) => r.ingredientId !== ingredientId));
  };

  const setAmount = (ingredientId: string, amount: string) => {
    const cleaned = amount.replace(/[^0-9.,-]/g, '').replace(',', '.');
    onChange(rows.map((r) => (r.ingredientId === ingredientId ? { ...r, amount: cleaned } : r)));
  };

  const setNote = (ingredientId: string, note: string) => {
    onChange(rows.map((r) => (r.ingredientId === ingredientId ? { ...r, note } : r)));
  };

  if (!accessToken) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.muted}>Faça login para adicionar ingredientes do catálogo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Ingredientes</Text>
      <Text style={styles.hint}>
        Busque no catálogo, toque para adicionar. Informe a quantidade numérica (ex.: 200 ou 0,5) e, se quiser, uma
        observação (ex.: tipo de farinha). Isso é enviado como amount + note na API.
      </Text>

      <View style={styles.searchBox}>
        <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholder="Buscar ingrediente cadastrado..."
          placeholderTextColor={colors.mutedForeground}
          editable={!disabled && !loadingCatalog}
        />
        {loadingCatalog && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {search.trim().length > 0 && suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          <ScrollView style={styles.suggestScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {suggestions.map((ing) => (
              <TouchableOpacity
                key={ing.id}
                style={styles.suggestRow}
                onPress={() => addIngredient(ing)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Plus size={16} color={colors.primary} />
                <Text style={styles.suggestText} numberOfLines={2}>
                  {ing.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {search.trim().length > 0 && !loadingCatalog && suggestions.length === 0 && (
        <Text style={styles.emptySuggest}>Nenhum ingrediente encontrado. Cadastre no catálogo (aba Despensa).</Text>
      )}

      {rows.length > 0 && (
        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row.ingredientId} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowName} numberOfLines={2}>
                  {row.name}
                </Text>
                <Text style={styles.subLabel}>Quantidade (número) *</Text>
                <TextInput
                  value={row.amount}
                  onChangeText={(t) => setAmount(row.ingredientId, t)}
                  style={styles.qtyInput}
                  placeholder="Ex.: 200 ou 0.5"
                  placeholderTextColor={colors.mutedForeground}
                  editable={!disabled}
                  keyboardType="decimal-pad"
                />
                <Text style={[styles.subLabel, { marginTop: 8 }]}>Observação (opcional)</Text>
                <TextInput
                  value={row.note}
                  onChangeText={(t) => setNote(row.ingredientId, t)}
                  style={styles.noteInput}
                  placeholder="Ex.: integral, em pó…"
                  placeholderTextColor={colors.mutedForeground}
                  editable={!disabled}
                  maxLength={500}
                />
              </View>
              <TouchableOpacity
                style={styles.trashBtn}
                onPress={() => removeRow(row.ingredientId)}
                disabled={disabled}
                accessibilityLabel="Remover ingrediente"
              >
                <Trash2 size={18} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {rows.length === 0 && !loadingCatalog && (
        <Text style={styles.emptyRows}>Nenhum ingrediente adicionado. Use a busca acima.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 6 },
  hint: { fontSize: 11, color: colors.mutedForeground, lineHeight: 16, marginBottom: 10 },
  muted: { fontSize: 13, color: colors.mutedForeground },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground, paddingVertical: 8 },
  suggestBox: {
    marginTop: 8,
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  suggestScroll: { maxHeight: 200 },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestText: { flex: 1, fontSize: 14, color: colors.foreground },
  emptySuggest: { fontSize: 12, color: colors.mutedForeground, marginTop: 8, fontStyle: 'italic' },
  rows: { marginTop: 12, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.secondary,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLeft: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 6 },
  subLabel: { fontSize: 11, fontWeight: '600', color: colors.mutedForeground, marginBottom: 4 },
  qtyInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.foreground,
  },
  noteInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.foreground,
    minHeight: 40,
  },
  trashBtn: { padding: 8, marginTop: 4 },
  emptyRows: { fontSize: 12, color: colors.mutedForeground, marginTop: 8, fontStyle: 'italic' },
});

export default RecipeIngredientsEditor;
