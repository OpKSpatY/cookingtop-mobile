import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
  RefreshControl,
} from 'react-native';
import { Plus, X, Trash2, Boxes, ChevronDown, Check } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getDefaultMeasureUnitId } from '../config/env';
import type { ApiIngredient, ApiMeasureUnit } from '../types/ingredients';
import {
  listIngredientsApi,
  listMeasureUnitsApi,
  createIngredientApi,
  patchIngredientApi,
  deleteIngredientApi,
} from '../services/ingredientsApi';
import { upsertIngredientUnitApi } from '../services/ingredientUnitsApi';
import { AuthApiError } from '../services/authApi';
import { colors } from '../theme/colors';

type PantryIngredientsCatalogProps = {
  /** Recarrega quando a aba fica visível */
  isActive: boolean;
};

const PantryIngredientsCatalog = ({ isActive }: PantryIngredientsCatalogProps) => {
  const { accessToken } = useAuth();
  const { showSuccess, showError } = useToast();

  const [ingredients, setIngredients] = useState<ApiIngredient[]>([]);
  const [measureUnits, setMeasureUnits] = useState<ApiMeasureUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editIngredient, setEditIngredient] = useState<ApiIngredient | null>(null);
  const [editName, setEditName] = useState('');
  const [editMeasureUnitId, setEditMeasureUnitId] = useState('');
  const [editGramsEquivalent, setEditGramsEquivalent] = useState('');
  const [showEditUnitPicker, setShowEditUnitPicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [newName, setNewName] = useState('');
  const [newMeasureUnitId, setNewMeasureUnitId] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const fetchIngredientsOnly = useCallback(async () => {
    if (!accessToken) {
      setIngredients([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const list = await listIngredientsApi(accessToken);
      setIngredients(list);
    } catch (e) {
      const msg =
        e instanceof AuthApiError
          ? e.message
          : 'Não foi possível carregar os ingredientes.';
      showError(msg, 'Erro');
      setIngredients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, showError]);

  useEffect(() => {
    if (!isActive || !accessToken) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const units = await listMeasureUnitsApi(accessToken);
        if (!cancelled) setMeasureUnits(units);
        const def = getDefaultMeasureUnitId();
        if (!cancelled) {
          if (units.length > 0) {
            setNewMeasureUnitId((prev) => prev || units[0].id);
          } else if (def) {
            setNewMeasureUnitId((prev) => prev || def);
          }
        }
      } catch {
        /* endpoint opcional */
      }
      if (cancelled) return;
      await fetchIngredientsOnly();
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive, accessToken, fetchIngredientsOnly]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchIngredientsOnly();
  }, [fetchIngredientsOnly]);

  const selectedUnitLabel = useMemo(() => {
    if (!newMeasureUnitId.trim()) return '';
    const u = measureUnits.find((x) => x.id === newMeasureUnitId);
    if (u) return u.name || u.symbol || u.id;
    return newMeasureUnitId.length > 12 ? `${newMeasureUnitId.slice(0, 8)}…` : newMeasureUnitId;
  }, [measureUnits, newMeasureUnitId]);

  const selectedEditUnitLabel = useMemo(() => {
    if (!editMeasureUnitId.trim()) return '';
    const u = measureUnits.find((x) => x.id === editMeasureUnitId);
    if (u) return u.name || u.symbol || u.id;
    return editMeasureUnitId.length > 12 ? `${editMeasureUnitId.slice(0, 8)}…` : editMeasureUnitId;
  }, [measureUnits, editMeasureUnitId]);

  const openAdd = () => {
    setNewName('');
    setNewImageUrl('');
    setShowUnitPicker(false);
    const def = getDefaultMeasureUnitId();
    if (measureUnits.length > 0) {
      setNewMeasureUnitId(measureUnits[0].id);
    } else if (def) {
      setNewMeasureUnitId(def);
    } else {
      setNewMeasureUnitId('');
    }
    setShowAdd(true);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      showError('Informe o nome do ingrediente.', 'Campo obrigatório');
      return;
    }
    const muid = newMeasureUnitId.trim();
    if (!muid) {
      showError('Selecione ou informe a unidade de medida (UUID).', 'Campo obrigatório');
      return;
    }
    if (!accessToken) return;
    setSaving(true);
    try {
      const created = await createIngredientApi(accessToken, {
        name,
        measureUnitsId: muid,
        imageUrl: newImageUrl.trim() || undefined,
      });
      setIngredients((prev) => [created, ...prev]);
      setShowAdd(false);
      showSuccess('Ingrediente criado com sucesso.');
    } catch (e) {
      const msg =
        e instanceof AuthApiError
          ? e.message
          : 'Não foi possível criar o ingrediente.';
      showError(msg, 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (ing: ApiIngredient) => {
    Alert.alert(
      'Excluir ingrediente',
      `Remover "${ing.name}" do cadastro? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => void handleDelete(ing.id),
        },
      ]
    );
  };

  const openEdit = (ing: ApiIngredient) => {
    setEditIngredient(ing);
    setEditName(ing.name);
    const def = getDefaultMeasureUnitId();
    if (ing.measureUnitsId?.trim()) {
      setEditMeasureUnitId(ing.measureUnitsId);
    } else if (measureUnits.length > 0) {
      setEditMeasureUnitId(measureUnits[0].id);
    } else if (def) {
      setEditMeasureUnitId(def);
    } else {
      setEditMeasureUnitId('');
    }
    setEditGramsEquivalent('');
    setShowEditUnitPicker(false);
  };

  const closeEdit = () => {
    if (!savingEdit) {
      setEditIngredient(null);
      setEditName('');
      setEditMeasureUnitId('');
      setEditGramsEquivalent('');
      setShowEditUnitPicker(false);
    }
  };

  const parseGramsInput = (raw: string): number | null => {
    const t = raw.trim().replace(/\s/g, '').replace(',', '.');
    if (t === '') return null;
    const n = Number(t);
    if (Number.isNaN(n) || !Number.isFinite(n)) return null;
    return n;
  };

  const handleSaveEdit = async () => {
    const name = editName.trim();
    if (!name) {
      showError('Informe o nome do ingrediente.', 'Campo obrigatório');
      return;
    }
    if (!accessToken || !editIngredient) return;

    const nameChanged = name !== editIngredient.name.trim();
    const gramsParsed = parseGramsInput(editGramsEquivalent);
    const wantsUpsert = editGramsEquivalent.trim() !== '';

    if (!nameChanged && !wantsUpsert) {
      closeEdit();
      return;
    }

    if (wantsUpsert) {
      if (gramsParsed === null) {
        showError('Informe um número válido para gramas equivalentes.', 'Validação');
        return;
      }
      if (gramsParsed < 0) {
        showError('O valor em gramas não pode ser negativo.', 'Validação');
        return;
      }
      const muid = editMeasureUnitId.trim();
      if (!muid) {
        showError('Selecione a unidade de medida para salvar a equivalência em gramas.', 'Campo obrigatório');
        return;
      }
    }

    setSavingEdit(true);
    try {
      let latestIngredient = editIngredient;

      if (nameChanged) {
        const updated = await patchIngredientApi(accessToken, editIngredient.id, { name });
        latestIngredient = updated;
        setIngredients((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }

      if (wantsUpsert && gramsParsed !== null) {
        const muid = editMeasureUnitId.trim();
        await upsertIngredientUnitApi(accessToken, {
          ingredientId: latestIngredient.id,
          measureUnitsId: muid,
          gramsEquivalent: gramsParsed,
        });
      }

      showSuccess(
        nameChanged && wantsUpsert
          ? 'Ingrediente e equivalência em gramas atualizados.'
          : nameChanged
            ? 'Ingrediente atualizado com sucesso.'
            : 'Equivalência em gramas salva com sucesso.'
      );
      setEditIngredient(null);
      setEditName('');
      setEditMeasureUnitId('');
      setEditGramsEquivalent('');
      setShowEditUnitPicker(false);
    } catch (e) {
      const msg =
        e instanceof AuthApiError
          ? e.message
          : 'Não foi possível salvar as alterações.';
      showError(msg, 'Erro');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    setDeletingId(id);
    try {
      await deleteIngredientApi(accessToken, id);
      setIngredients((prev) => prev.filter((i) => i.id !== id));
      showSuccess('Ingrediente excluído com sucesso.');
    } catch (e) {
      const msg =
        e instanceof AuthApiError
          ? e.message
          : 'Não foi possível excluir.';
      showError(msg, 'Erro');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredForSearch = ingredients;

  if (!accessToken) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.muted}>Faça login para gerenciar ingredientes cadastrados.</Text>
      </View>
    );
  }

  if (loading && ingredients.length === 0) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.muted, { marginTop: 12 }]}>Carregando ingredientes…</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.addWideBtn} onPress={openAdd} activeOpacity={0.85}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addWideBtnText}>Adicionar ingrediente</Text>
        </TouchableOpacity>
      </View>

      {filteredForSearch.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Boxes size={28} color={colors.secondaryForeground} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum ingrediente cadastrado</Text>
          <Text style={styles.emptySubtitle}>
            Toque em &quot;Adicionar ingrediente&quot; para incluir na API usando nome e unidade de medida.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={styles.list}>
            {filteredForSearch.map((ing) => (
              <View key={ing.id} style={styles.row}>
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => openEdit(ing)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${ing.name}`}
                >
                  <View style={styles.thumbWrap}>
                    {ing.imageUrl ? (
                      <Image source={{ uri: ing.imageUrl }} style={styles.thumb} />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Boxes size={20} color={colors.mutedForeground} />
                      </View>
                    )}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={2}>
                      {ing.name}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trashBtn}
                  onPress={() => confirmDelete(ing)}
                  disabled={deletingId === ing.id}
                  accessibilityLabel="Excluir ingrediente"
                >
                  {deletingId === ing.id ? (
                    <ActivityIndicator size="small" color={colors.destructive} />
                  ) : (
                    <Trash2 size={18} color={colors.destructive} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={showAdd}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) {
            setShowUnitPicker(false);
            setShowAdd(false);
          }
        }}
      >
        <TouchableWithoutFeedback onPress={() => !saving && setShowAdd(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Novo ingrediente</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (!saving) {
                        setShowUnitPicker(false);
                        setShowAdd(false);
                      }
                    }}
                    disabled={saving}
                  >
                    <X size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Nome *</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.input}
                  placeholder="Ex: Farinha de trigo"
                  placeholderTextColor={colors.mutedForeground}
                  editable={!saving}
                />

                <Text style={[styles.label, { marginTop: 12 }]}>Unidade de medida *</Text>
                {measureUnits.length > 0 ? (
                  <>
                    <TouchableOpacity
                      style={styles.selectBox}
                      onPress={() => !saving && setShowUnitPicker(true)}
                      disabled={saving}
                      activeOpacity={0.75}
                      accessibilityLabel="Selecionar unidade de medida"
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.selectBoxText,
                          !newMeasureUnitId.trim() && styles.selectBoxPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {newMeasureUnitId.trim() ? selectedUnitLabel : 'Selecione a unidade'}
                      </Text>
                      <ChevronDown size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>

                    <Modal
                      visible={showUnitPicker}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setShowUnitPicker(false)}
                    >
                      <View style={styles.unitPickerRoot}>
                        <TouchableOpacity
                          style={styles.unitPickerBackdrop}
                          activeOpacity={1}
                          onPress={() => setShowUnitPicker(false)}
                        />
                        <View style={styles.unitPickerSheet}>
                          <View style={styles.unitPickerGrab} />
                          <Text style={styles.unitPickerTitle}>Unidade de medida</Text>
                          <ScrollView
                            style={styles.unitPickerList}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator
                          >
                            {measureUnits.map((u) => {
                              const label = u.name || u.symbol || u.id;
                              const selected = newMeasureUnitId === u.id;
                              return (
                                <TouchableOpacity
                                  key={u.id}
                                  style={[styles.unitPickerRow, selected && styles.unitPickerRowActive]}
                                  onPress={() => {
                                    setNewMeasureUnitId(u.id);
                                    setShowUnitPicker(false);
                                  }}
                                  activeOpacity={0.65}
                                >
                                  <Text
                                    style={[styles.unitPickerRowText, selected && styles.unitPickerRowTextActive]}
                                    numberOfLines={2}
                                  >
                                    {label}
                                  </Text>
                                  {selected ? (
                                    <Check size={20} color={colors.primary} />
                                  ) : (
                                    <View style={{ width: 20 }} />
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                          <TouchableOpacity
                            style={styles.unitPickerCloseBtn}
                            onPress={() => setShowUnitPicker(false)}
                          >
                            <Text style={styles.unitPickerCloseBtnText}>Fechar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  </>
                ) : (
                  <>
                    <Text style={styles.hint}>
                      Não encontramos GET /measure-units. Informe o UUID da unidade (ou configure
                      EXPO_PUBLIC_DEFAULT_MEASURE_UNIT_ID no .env).
                    </Text>
                    <TextInput
                      value={newMeasureUnitId}
                      onChangeText={setNewMeasureUnitId}
                      style={styles.input}
                      placeholder="UUID da measureUnitsId"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      editable={!saving}
                    />
                  </>
                )}

                <Text style={[styles.label, { marginTop: 12 }]}>URL da imagem (opcional)</Text>
                <TextInput
                  value={newImageUrl}
                  onChangeText={setNewImageUrl}
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                />

                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={!!editIngredient}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <TouchableWithoutFeedback onPress={closeEdit}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Editar ingrediente</Text>
                    <TouchableOpacity onPress={closeEdit} disabled={savingEdit}>
                      <X size={20} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionTitle}>Dados do ingrediente</Text>
                  <Text style={styles.label}>Nome *</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    style={styles.input}
                    placeholder="Nome do ingrediente"
                    placeholderTextColor={colors.mutedForeground}
                    editable={!savingEdit}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Equivalência em gramas</Text>
                  <Text style={styles.hint}>
                    Opcional: vincula o ingrediente a uma unidade com quantidade equivalente em gramas
                    (POST /ingredient-units/upsert). Preencha os dois campos abaixo para salvar.
                  </Text>

                  <Text style={[styles.label, { marginTop: 8 }]}>Unidade de medida</Text>
                  {measureUnits.length > 0 ? (
                    <>
                      <TouchableOpacity
                        style={styles.selectBox}
                        onPress={() => !savingEdit && setShowEditUnitPicker(true)}
                        disabled={savingEdit}
                        activeOpacity={0.75}
                        accessibilityLabel="Selecionar unidade para equivalência em gramas"
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.selectBoxText,
                            !editMeasureUnitId.trim() && styles.selectBoxPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {editMeasureUnitId.trim() ? selectedEditUnitLabel : 'Selecione a unidade'}
                        </Text>
                        <ChevronDown size={18} color={colors.mutedForeground} />
                      </TouchableOpacity>

                      <Modal
                        visible={showEditUnitPicker}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setShowEditUnitPicker(false)}
                      >
                        <View style={styles.unitPickerRoot}>
                          <TouchableOpacity
                            style={styles.unitPickerBackdrop}
                            activeOpacity={1}
                            onPress={() => setShowEditUnitPicker(false)}
                          />
                          <View style={styles.unitPickerSheet}>
                            <View style={styles.unitPickerGrab} />
                            <Text style={styles.unitPickerTitle}>Unidade de medida</Text>
                            <ScrollView
                              style={styles.unitPickerList}
                              keyboardShouldPersistTaps="handled"
                              showsVerticalScrollIndicator
                            >
                              {measureUnits.map((u) => {
                                const label = u.name || u.symbol || u.id;
                                const selected = editMeasureUnitId === u.id;
                                return (
                                  <TouchableOpacity
                                    key={u.id}
                                    style={[styles.unitPickerRow, selected && styles.unitPickerRowActive]}
                                    onPress={() => {
                                      setEditMeasureUnitId(u.id);
                                      setShowEditUnitPicker(false);
                                    }}
                                    activeOpacity={0.65}
                                  >
                                    <Text
                                      style={[styles.unitPickerRowText, selected && styles.unitPickerRowTextActive]}
                                      numberOfLines={2}
                                    >
                                      {label}
                                    </Text>
                                    {selected ? (
                                      <Check size={20} color={colors.primary} />
                                    ) : (
                                      <View style={{ width: 20 }} />
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                            <TouchableOpacity
                              style={styles.unitPickerCloseBtn}
                              onPress={() => setShowEditUnitPicker(false)}
                            >
                              <Text style={styles.unitPickerCloseBtnText}>Fechar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Modal>
                    </>
                  ) : (
                    <>
                      <Text style={styles.hint}>
                        Sem GET /measure-units: informe o UUID da unidade (ou configure
                        EXPO_PUBLIC_DEFAULT_MEASURE_UNIT_ID).
                      </Text>
                      <TextInput
                        value={editMeasureUnitId}
                        onChangeText={setEditMeasureUnitId}
                        style={styles.input}
                        placeholder="UUID da measureUnitsId"
                        placeholderTextColor={colors.mutedForeground}
                        autoCapitalize="none"
                        editable={!savingEdit}
                      />
                    </>
                  )}

                  <Text style={[styles.label, { marginTop: 12 }]}>Gramas equivalentes</Text>
                  <TextInput
                    value={editGramsEquivalent}
                    onChangeText={setEditGramsEquivalent}
                    style={styles.input}
                    placeholder="Ex: 100.5"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                    editable={!savingEdit}
                  />
                </ScrollView>

                <TouchableOpacity
                  style={[styles.saveBtn, savingEdit && { opacity: 0.7 }]}
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 200 },
  centerBox: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', paddingHorizontal: 24 },
  toolbar: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  addWideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    elevation: 2,
  },
  addWideBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  thumbWrap: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  trashBtn: { padding: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: { backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
  },
  hint: { fontSize: 11, color: colors.mutedForeground, marginBottom: 8, lineHeight: 16 },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  selectBoxText: { flex: 1, fontSize: 14, color: colors.foreground },
  selectBoxPlaceholder: { color: colors.mutedForeground },
  unitPickerRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  unitPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  unitPickerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    maxHeight: '55%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  unitPickerGrab: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 12,
  },
  unitPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 12,
    textAlign: 'center',
  },
  unitPickerList: { maxHeight: 320 },
  unitPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitPickerRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  unitPickerRowText: { flex: 1, fontSize: 15, color: colors.foreground },
  unitPickerRowTextActive: { fontWeight: '600', color: colors.primary },
  unitPickerCloseBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.secondary,
  },
  unitPickerCloseBtnText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default PantryIngredientsCatalog;
