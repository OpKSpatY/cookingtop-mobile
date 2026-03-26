import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Search, Trash2, Package, ShoppingCart, MessageCircleQuestion, Send, Boxes } from 'lucide-react-native';
import { getIngredientImage } from '../data/ingredientImages';
import ShoppingPresets, { type ShoppingPreset, type ShoppingItem } from '../components/ShoppingPresets';
import PantryIngredientsCatalog from '../components/PantryIngredientsCatalog';
import { useAuth } from '../contexts/AuthContext';
import { useUserPantry } from '../contexts/UserPantryContext';
import { useToast } from '../contexts/ToastContext';
import { hydrateIngredientsCatalogFromDisk, syncIngredientsCatalog } from '../utils/ingredientsCatalogCache';
import type { ApiIngredient } from '../types/ingredients';
import type { ApiUserIngredient } from '../types/userIngredients';
import { colors } from '../theme/colors';

type Section = 'despensa' | 'compras' | 'catalogo';

function pantryItemImageSource(item: ApiUserIngredient) {
  if (item.imageUrl) {
    return { uri: item.imageUrl } as const;
  }
  return getIngredientImage(item.nome);
}

/** Ex.: "mililitro" → " mililitro(s)" para indicar singular ou plural */
function formatMeasureUnitLabel(name?: string) {
  const t = name?.trim();
  if (!t) return '';
  return ` ${t}(s)`;
}

const PantryScreen = () => {
  const { accessToken } = useAuth();
  const {
    items,
    loading: pantryLoading,
    refresh: refreshPantry,
    addToPantry,
    updatePantryQuantity,
    removeFromPantry,
    clearPantry,
  } = useUserPantry();
  const { showSuccess, showError } = useToast();
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([
    { id: 's1', nome: 'Tomate', quantidade: '6 unidades', checked: false },
    { id: 's2', nome: 'Creme de leite', quantidade: '2 caixas', checked: false },
  ]);
  const [activeSection, setActiveSection] = useState<Section>('despensa');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddShopping, setShowAddShopping] = useState(false);
  const [searchIngredient, setSearchIngredient] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [search, setSearch] = useState('');
  const [catalogIngredients, setCatalogIngredients] = useState<ApiIngredient[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [editItem, setEditItem] = useState<ApiUserIngredient | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [shoppingName, setShoppingName] = useState('');
  const [shoppingQty, setShoppingQty] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [presets, setPresets] = useState<ShoppingPreset[]>([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [pullRefreshingPantry, setPullRefreshingPantry] = useState(false);

  const onRefreshPantry = useCallback(async () => {
    setPullRefreshingPantry(true);
    try {
      await refreshPantry({ silent: true });
    } finally {
      setPullRefreshingPantry(false);
    }
  }, [refreshPantry]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  useEffect(() => {
    if (!showAdd || !accessToken) return;
    let cancelled = false;
    setCatalogLoading(true);
    (async () => {
      try {
        const cached = await hydrateIngredientsCatalogFromDisk();
        if (!cancelled && cached?.length) {
          setCatalogIngredients(cached);
        }
        const { ingredients } = await syncIngredientsCatalog(accessToken);
        if (!cancelled && ingredients !== null) {
          setCatalogIngredients(ingredients);
        }
      } catch {
        if (!cancelled) setCatalogIngredients([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAdd, accessToken]);

  const filteredCatalogForAdd = useMemo(() => {
    return catalogIngredients.filter((ing) => {
      const match = ing.name.toLowerCase().includes(searchIngredient.toLowerCase());
      const already = items.some((row) => row.ingredientId === ing.id);
      return match && !already;
    });
  }, [catalogIngredients, searchIngredient, items]);

  const filteredShoppingItems = useMemo(() => {
    if (!search.trim()) return shoppingList;
    return shoppingList.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase()));
  }, [shoppingList, search]);

  const handleAdd = async () => {
    if (!selectedIngredientId || !quantity.trim()) {
      showError('Selecione um ingrediente e informe a quantidade.', 'Campos obrigatórios');
      return;
    }
    setSavingAdd(true);
    try {
      await addToPantry(selectedIngredientId, quantity.trim());
      showSuccess('Item adicionado à despensa.');
      setSelectedIngredientId('');
      setQuantity('');
      setSearchIngredient('');
      setShowAdd(false);
    } catch {
      /* toast já mostrado no contexto */
    } finally {
      setSavingAdd(false);
    }
  };

  const handleAddShopping = () => {
    if (!shoppingName.trim()) return;
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      nome: shoppingName,
      quantidade: shoppingQty || '1',
      checked: false,
    };
    setShoppingList([newItem, ...shoppingList]);
    setShoppingName('');
    setShoppingQty('');
    setShowAddShopping(false);
  };

  const toggleShoppingCheck = (id: string) => {
    setShoppingList(shoppingList.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  };

  const removeShoppingItem = (id: string) => {
    setShoppingList(shoppingList.filter((i) => i.id !== id));
  };

  const handleRemove = async () => {
    if (!editItem) return;
    try {
      await removeFromPantry(editItem.id);
      showSuccess('Item removido da despensa.');
      setEditItem(null);
    } catch {
      /* toast no contexto */
    }
  };

  const handleEditSave = async () => {
    if (!editItem || !editQuantity.trim()) return;
    try {
      await updatePantryQuantity(editItem.id, editQuantity.trim());
      showSuccess('Quantidade atualizada.');
      setEditItem(null);
    } catch {
      /* toast no contexto */
    }
  };

  const uncheckedCount = shoppingList.filter((i) => !i.checked).length;

  const showClearButton =
    (activeSection === 'despensa' && items.length > 0) ||
    (activeSection === 'compras' && shoppingList.length > 0);

  const showSearch = activeSection === 'despensa' || activeSection === 'compras';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeSection === 'despensa' ? (
            <RefreshControl
              refreshing={pullRefreshingPantry}
              onRefresh={onRefreshPantry}
              tintColor={colors.primary}
              colors={Platform.OS === 'android' ? [colors.primary] : undefined}
            />
          ) : undefined
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Despensa</Text>
            <Text style={styles.subtitle}>
              {activeSection === 'despensa' && `${items.length} itens`}
              {activeSection === 'compras' && `${uncheckedCount} itens pendentes`}
              {activeSection === 'catalogo' && 'Ingredientes cadastrados na API'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {showClearButton && (
              <TouchableOpacity style={styles.clearButton} onPress={() => setShowClearConfirm(true)}>
                <Trash2 size={18} color={colors.destructive} />
              </TouchableOpacity>
            )}
            {(activeSection === 'despensa' || activeSection === 'compras') && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => (activeSection === 'despensa' ? setShowAdd(true) : setShowAddShopping(true))}
              >
                <Plus size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.sectionButtons}>
          <TouchableOpacity
            onPress={() => { setActiveSection('despensa'); setSearch(''); }}
            style={[styles.sectionBtn, activeSection === 'despensa' && styles.sectionBtnActive]}
          >
            <Package size={14} color={activeSection === 'despensa' ? '#fff' : colors.foreground} />
            <Text style={[styles.sectionBtnText, activeSection === 'despensa' && styles.sectionBtnTextActive]} numberOfLines={1}>
              Despensa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setActiveSection('compras'); setSearch(''); }}
            style={[styles.sectionBtn, activeSection === 'compras' && styles.sectionBtnActive]}
          >
            <ShoppingCart size={14} color={activeSection === 'compras' ? '#fff' : colors.foreground} />
            <Text style={[styles.sectionBtnText, activeSection === 'compras' && styles.sectionBtnTextActive]} numberOfLines={1}>
              Compras
            </Text>
            {uncheckedCount > 0 && activeSection !== 'compras' && (
              <View style={styles.uncheckedBadge}>
                <Text style={styles.uncheckedBadgeText}>{uncheckedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setActiveSection('catalogo'); setSearch(''); }}
            style={[styles.sectionBtn, activeSection === 'catalogo' && styles.sectionBtnActive]}
          >
            <Boxes size={14} color={activeSection === 'catalogo' ? '#fff' : colors.foreground} />
            <Text style={[styles.sectionBtnText, activeSection === 'catalogo' && styles.sectionBtnTextActive]} numberOfLines={1}>
              Catálogo
            </Text>
          </TouchableOpacity>
        </View>

        {showSearch && (
          <View style={styles.searchRow}>
            <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              placeholder={activeSection === 'despensa' ? 'Buscar ingrediente...' : 'Buscar na lista...'}
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
        )}

        {activeSection === 'despensa' ? (
          <>
            {pantryLoading && items.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptySubtitle, { marginTop: 16 }]}>Carregando sua despensa…</Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Package size={28} color={colors.secondaryForeground} />
                </View>
                <Text style={styles.emptyTitle}>{search ? 'Nenhum item encontrado' : 'Despensa vazia'}</Text>
                <Text style={styles.emptySubtitle}>
                  {search ? 'Tente buscar por outro nome' : 'Adicione ingredientes que você tem em casa'}
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {filteredItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridItem}
                    onPress={() => {
                      setEditItem(item);
                      setEditQuantity(item.quantity);
                    }}
                  >
                    <View style={styles.gridImageWrapper}>
                      <Image source={pantryItemImageSource(item)} style={styles.gridImage} />
                    </View>
                    <Text style={styles.gridName} numberOfLines={2}>{item.nome}</Text>
                    <Text style={styles.gridQty}>
                      {item.quantity}
                      {formatMeasureUnitLabel(item.measureUnitName)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.suggestionButton}
              onPress={() => { setShowSuggestion(true); setSuggestionSent(false); setSuggestionText(''); }}
            >
              <MessageCircleQuestion size={16} color={colors.mutedForeground} />
              <Text style={styles.suggestionButtonText}>Faltou algum produto?</Text>
            </TouchableOpacity>
          </>
        ) : activeSection === 'compras' ? (
          <>
            {filteredShoppingItems.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <ShoppingCart size={28} color={colors.secondaryForeground} />
                </View>
                <Text style={styles.emptyTitle}>{search ? 'Nenhum item encontrado' : 'Lista vazia'}</Text>
                <Text style={styles.emptySubtitle}>
                  {search ? 'Tente buscar por outro nome' : 'Adicione itens à sua lista de compras'}
                </Text>
              </View>
            ) : (
              <View style={styles.shoppingListContent}>
                {filteredShoppingItems.map((item) => (
                  <View key={item.id} style={[styles.shoppingRow, item.checked && { opacity: 0.5 }]}>
                    <TouchableOpacity
                      onPress={() => toggleShoppingCheck(item.id)}
                      style={[styles.checkbox, item.checked && styles.checkboxChecked]}
                    >
                      {item.checked && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.shoppingName, item.checked && { textDecorationLine: 'line-through' }]}>{item.nome}</Text>
                      <Text style={styles.shoppingQty}>{item.quantidade}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeShoppingItem(item.id)}>
                      <Trash2 size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <ShoppingPresets
              presets={presets}
              onPresetsChange={setPresets}
              onLoadPreset={(loadedItems) => setShoppingList((prev) => [...loadedItems, ...prev])}
            />
          </>
        ) : (
          <PantryIngredientsCatalog isActive={activeSection === 'catalogo'} />
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Add to Pantry Modal */}
      <Modal visible={showAdd} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAdd(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Produto</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Ingrediente</Text>
            <TextInput
              value={searchIngredient}
              onChangeText={(t) => {
                setSearchIngredient(t);
                setSelectedIngredientId('');
              }}
              style={styles.input}
              placeholder="Buscar na lista da API..."
              placeholderTextColor={colors.mutedForeground}
              editable={!savingAdd}
            />
            {catalogLoading && (
              <Text style={styles.hintLoading}>Carregando ingredientes cadastrados…</Text>
            )}
            {searchIngredient.trim() && !selectedIngredientId && !catalogLoading && (
              <ScrollView style={styles.dropdownList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredCatalogForAdd.length === 0 ? (
                  <Text style={styles.dropdownEmpty}>Nenhum ingrediente disponível ou já está na despensa.</Text>
                ) : (
                  filteredCatalogForAdd.slice(0, 8).map((ing) => (
                    <TouchableOpacity
                      key={ing.id}
                      onPress={() => {
                        setSelectedIngredientId(ing.id);
                        setSearchIngredient(ing.name);
                      }}
                      style={styles.dropdownItem}
                    >
                      <Image
                        source={ing.imageUrl ? { uri: ing.imageUrl } : getIngredientImage(ing.name)}
                        style={styles.dropdownImg}
                      />
                      <Text style={styles.dropdownText}>{ing.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
            <Text style={[styles.label, { marginTop: 12 }]}>Quantidade</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              style={styles.input}
              placeholder="Ex: 500g, 1 litro, 6 unidades"
              placeholderTextColor={colors.mutedForeground}
              maxLength={100}
              editable={!savingAdd}
            />
            <TouchableOpacity
              style={[styles.saveBtn, savingAdd && { opacity: 0.75 }]}
              onPress={handleAdd}
              disabled={savingAdd}
            >
              {savingAdd ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Adicionar à Despensa</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add to Shopping Modal */}
      <Modal visible={showAddShopping} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddShopping(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar à Lista</Text>
              <TouchableOpacity onPress={() => setShowAddShopping(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Produto</Text>
            <TextInput
              value={shoppingName}
              onChangeText={setShoppingName}
              style={styles.input}
              placeholder="Ex: Tomate, Creme de leite..."
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Quantidade</Text>
            <TextInput
              value={shoppingQty}
              onChangeText={setShoppingQty}
              style={styles.input}
              placeholder="Ex: 2 unidades, 500g"
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddShopping}>
              <Text style={styles.saveBtnText}>Adicionar à Lista</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editItem} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditItem(null)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Item</Text>
              <TouchableOpacity onPress={() => setEditItem(null)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {editItem && (
              <>
                <View style={styles.editPreview}>
                  <Image source={pantryItemImageSource(editItem)} style={styles.editPreviewImg} />
                  <View>
                    <Text style={styles.editPreviewName}>{editItem.nome}</Text>
                    <Text style={styles.editPreviewQty}>
                      Quantidade atual: {editItem.quantity}
                      {formatMeasureUnitLabel(editItem.measureUnitName)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.label}>Nova quantidade</Text>
                <TextInput
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  style={styles.input}
                  placeholder="Ex: 500g, 1 litro"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={100}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
                    <Trash2 size={16} color={colors.destructive} />
                    <Text style={styles.removeBtnText}>Remover</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn2} onPress={handleEditSave}>
                    <Text style={styles.saveBtnText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Clear Confirmation Modal */}
      <Modal visible={showClearConfirm} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowClearConfirm(false)}>
          <View style={styles.confirmModal} onStartShouldSetResponder={() => true}>
            <View style={styles.confirmIcon}>
              <Trash2 size={24} color={colors.destructive} />
            </View>
            <Text style={styles.confirmTitle}>
              Limpar {activeSection === 'despensa' ? 'despensa' : 'lista de compras'}?
            </Text>
            <Text style={styles.confirmSubtitle}>Todos os itens serão removidos. Esta ação não pode ser desfeita.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowClearConfirm(false)}>
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={() => {
                  void (async () => {
                    if (activeSection === 'despensa') {
                      try {
                        await clearPantry();
                        showSuccess('Despensa limpa.');
                      } catch {
                        /* erros exibidos no contexto */
                      }
                    } else {
                      setShoppingList([]);
                    }
                    setShowClearConfirm(false);
                  })();
                }}
              >
                <Text style={styles.confirmDeleteText}>Limpar tudo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Suggestion Modal */}
      <Modal visible={showSuggestion} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSuggestion(false)}>
          <View style={styles.confirmModal} onStartShouldSetResponder={() => true}>
            {suggestionSent ? (
              <View style={styles.suggestionSentContent}>
                <View style={styles.suggestionSentIcon}>
                  <Send size={24} color={colors.accent} />
                </View>
                <Text style={styles.confirmTitle}>Sugestão enviada!</Text>
                <Text style={styles.confirmSubtitle}>Obrigado por nos ajudar a melhorar.</Text>
                <TouchableOpacity style={[styles.saveBtn, { marginTop: 20, width: '100%' }]} onPress={() => setShowSuggestion(false)}>
                  <Text style={styles.saveBtnText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sugerir Produto</Text>
                  <TouchableOpacity onPress={() => setShowSuggestion(false)}>
                    <X size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.suggestionHint}>
                  Não encontrou um produto? Diga qual está faltando e vamos adicionar!
                </Text>
                <TextInput
                  value={suggestionText}
                  onChangeText={setSuggestionText}
                  style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
                  placeholder="Ex: Farinha de mandioca, Polpa de açaí..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[styles.suggestionSendBtn, !suggestionText.trim() && { opacity: 0.4 }]}
                  onPress={() => { if (suggestionText.trim()) setSuggestionSent(true); }}
                  disabled={!suggestionText.trim()}
                >
                  <Send size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Enviar sugestão</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearButton: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: colors.destructive + '4D',
    alignItems: 'center', justifyContent: 'center',
  },
  addButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', elevation: 3,
  },
  sectionButtons: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  sectionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  sectionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sectionBtnText: { fontSize: 12, fontWeight: '600', color: colors.foreground },
  sectionBtnTextActive: { color: '#fff' },
  uncheckedBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.destructive,
    alignItems: 'center', justifyContent: 'center',
  },
  uncheckedBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  searchRow: { paddingHorizontal: 16, marginTop: 12, position: 'relative' },
  searchIcon: { position: 'absolute', left: 28, top: 14, zIndex: 1 },
  searchInput: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, paddingLeft: 40, paddingRight: 16, fontSize: 14, color: colors.foreground,
  },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 16 },
  gridItem: { width: '25%', alignItems: 'center', paddingHorizontal: 4, marginBottom: 16 },
  gridImageWrapper: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridName: { fontSize: 11, fontWeight: '600', color: colors.foreground, textAlign: 'center', marginTop: 6, lineHeight: 14 },
  gridQty: { fontSize: 10, color: colors.mutedForeground },
  suggestionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 24,
    borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    paddingVertical: 12, backgroundColor: colors.card + '00',
  },
  suggestionButtonText: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  shoppingListContent: { paddingHorizontal: 16, marginTop: 16, gap: 8 },
  shoppingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 12, padding: 12, elevation: 1,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { fontSize: 12, fontWeight: '700', color: '#fff' },
  shoppingName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  shoppingQty: { fontSize: 12, color: colors.mutedForeground },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  label: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  input: {
    backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.foreground,
  },
  dropdownList: { maxHeight: 128, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 4, backgroundColor: colors.card },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  dropdownImg: { width: 32, height: 32, borderRadius: 6, resizeMode: 'cover' },
  dropdownText: { fontSize: 14, color: colors.foreground },
  dropdownEmpty: { fontSize: 13, color: colors.mutedForeground, padding: 12 },
  hintLoading: { fontSize: 12, color: colors.mutedForeground, marginTop: 6, fontStyle: 'italic' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  editPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.secondary, borderRadius: 12, padding: 12, marginBottom: 16,
  },
  editPreviewImg: { width: 56, height: 56, borderRadius: 8, resizeMode: 'cover' },
  editPreviewName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  editPreviewQty: { fontSize: 12, color: colors.mutedForeground },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  removeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, borderColor: colors.destructive, paddingVertical: 14,
  },
  removeBtnText: { fontSize: 14, fontWeight: '700', color: colors.destructive },
  saveBtn2: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmModal: { width: '85%', backgroundColor: colors.card, borderRadius: 20, padding: 20, alignItems: 'center' },
  confirmIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.destructive + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  confirmSubtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' },
  confirmActions: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  confirmCancel: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  confirmDelete: { flex: 1, borderRadius: 12, backgroundColor: colors.destructive, paddingVertical: 12, alignItems: 'center' },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  suggestionHint: { fontSize: 12, color: colors.mutedForeground, marginBottom: 12 },
  suggestionSendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, marginTop: 16, width: '100%',
  },
  suggestionSentContent: { alignItems: 'center', paddingVertical: 16 },
  suggestionSentIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
});

export default PantryScreen;
