import React, { useState } from 'react';
import {
  View, Text, Image, TextInput, ScrollView, TouchableOpacity, Modal, StyleSheet, Alert, Dimensions,
} from 'react-native';
import { Plus, X, Edit3, Trash2, Check, BookOpen, ArrowDownToLine, Search, Minus } from 'lucide-react-native';
import { ingredientDatabase, getIngredientImage } from '../data/ingredientImages';
import { colors } from '../theme/colors';

export interface ShoppingItem {
  id: string;
  nome: string;
  quantidade: string;
  checked: boolean;
}

export interface ShoppingPreset {
  id: string;
  nome: string;
  observacoes: string;
  foto: string;
  itens: ShoppingItem[];
}

const STOCK_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80', label: 'Supermercado' },
  { url: 'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=400&q=80', label: 'Frutas' },
  { url: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&q=80', label: 'Legumes' },
  { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80', label: 'Padaria' },
  { url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&q=80', label: 'Açougue' },
  { url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80', label: 'Laticínios' },
  { url: 'https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=400&q=80', label: 'Orgânicos' },
  { url: 'https://images.unsplash.com/photo-1526470608268-f674ce90edf4?w=400&q=80', label: 'Feira' },
  { url: 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=400&q=80', label: 'Cozinha' },
];

const UNITS = ['unidade', 'kg', 'g', 'litro', 'ml', 'xícara', 'colher', 'pacote', 'caixa', 'lata', 'dúzia'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  presets: ShoppingPreset[];
  onPresetsChange: (presets: ShoppingPreset[]) => void;
  onLoadPreset: (items: ShoppingItem[]) => void;
}

const ShoppingPresets = ({ presets, onPresetsChange, onLoadPreset }: Props) => {
  const [showCreate, setShowCreate] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ShoppingPreset | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetNotes, setPresetNotes] = useState('');
  const [presetPhoto, setPresetPhoto] = useState(STOCK_PHOTOS[0].url);
  const [presetItems, setPresetItems] = useState<ShoppingItem[]>([]);
  const [showDetail, setShowDetail] = useState<ShoppingPreset | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState(0);

  const filteredProducts = itemSearch.trim()
    ? ingredientDatabase.filter(
        (i) =>
          i.nome.toLowerCase().includes(itemSearch.toLowerCase()) &&
          !presetItems.some((p) => p.nome === i.nome)
      )
    : [];

  const resetForm = () => {
    setPresetName('');
    setPresetNotes('');
    setPresetPhoto(STOCK_PHOTOS[0].url);
    setPresetItems([]);
    setEditingPreset(null);
    setShowCreate(false);
    setItemSearch('');
    setItemQty('1');
    setSelectedUnit(0);
  };

  const addItemToPreset = (nome: string) => {
    const qty = itemQty || '1';
    const newItem: ShoppingItem = {
      id: Date.now().toString() + Math.random(),
      nome,
      quantidade: `${qty} ${UNITS[selectedUnit]}`,
      checked: false,
    };
    setPresetItems((prev) => [...prev, newItem]);
    setItemSearch('');
    setItemQty('1');
  };

  const addCustomItem = () => {
    if (!itemSearch.trim()) return;
    addItemToPreset(itemSearch.trim());
  };

  const removePresetItem = (id: string) => {
    setPresetItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSave = () => {
    if (!presetName.trim() || presetItems.length === 0) return;
    if (editingPreset) {
      onPresetsChange(
        presets.map((p) =>
          p.id === editingPreset.id
            ? { ...p, nome: presetName, observacoes: presetNotes, foto: presetPhoto, itens: presetItems }
            : p
        )
      );
    } else {
      if (presets.length >= 5) return;
      const newPreset: ShoppingPreset = {
        id: Date.now().toString(),
        nome: presetName,
        observacoes: presetNotes,
        foto: presetPhoto,
        itens: presetItems,
      };
      onPresetsChange([...presets, newPreset]);
    }
    resetForm();
  };

  const handleEdit = (preset: ShoppingPreset) => {
    setEditingPreset(preset);
    setPresetName(preset.nome);
    setPresetNotes(preset.observacoes);
    setPresetPhoto(preset.foto);
    setPresetItems([...preset.itens]);
    setShowDetail(null);
    setShowCreate(true);
  };

  const handleDelete = (id: string) => {
    onPresetsChange(presets.filter((p) => p.id !== id));
    setShowDeleteConfirm(null);
    setShowDetail(null);
  };

  const handleLoad = (preset: ShoppingPreset) => {
    onLoadPreset(
      preset.itens.map((i) => ({ ...i, id: Date.now().toString() + Math.random(), checked: false }))
    );
    setShowDetail(null);
  };

  const cardWidth = (SCREEN_WIDTH - 48 - 10) / 2;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <BookOpen size={16} color={colors.primary} />
          <Text style={styles.headerTitle}>Listas Salvas</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{presets.length}/5</Text>
          </View>
        </View>
        {presets.length < 5 && (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Plus size={12} color="#fff" />
            <Text style={styles.createBtnText}>Criar lista</Text>
          </TouchableOpacity>
        )}
      </View>

      {presets.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={() => setShowCreate(true)}>
          <Plus size={24} color={colors.primary} />
          <Text style={styles.emptyTitle}>Criar lista personalizada</Text>
          <Text style={styles.emptySubtitle}>Monte listas de compras para reutilizar</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.presetsGrid}>
          {presets.map((preset) => (
            <TouchableOpacity key={preset.id} style={[styles.presetCard, { width: cardWidth }]} onPress={() => setShowDetail(preset)}>
              <Image source={{ uri: preset.foto }} style={styles.presetImage} />
              <View style={styles.presetInfo}>
                <Text style={styles.presetName} numberOfLines={1}>{preset.nome}</Text>
                <Text style={styles.presetCount}>{preset.itens.length} {preset.itens.length === 1 ? 'item' : 'itens'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Detail Modal */}
      <Modal visible={!!showDetail} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDetail(null)}>
          <View style={styles.detailModal} onStartShouldSetResponder={() => true}>
            {showDetail && (
              <>
                <View style={styles.detailImageWrap}>
                  <Image source={{ uri: showDetail.foto }} style={styles.detailImage} />
                  <View style={styles.detailImageOverlay} />
                  <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setShowDetail(null)}>
                    <X size={16} color={colors.foreground} />
                  </TouchableOpacity>
                  <View style={styles.detailImageText}>
                    <Text style={styles.detailTitle}>{showDetail.nome}</Text>
                    <Text style={styles.detailCount}>{showDetail.itens.length} itens</Text>
                  </View>
                </View>

                <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
                  {showDetail.observacoes ? (
                    <View style={styles.detailNotes}>
                      <Text style={styles.detailNotesText}>{showDetail.observacoes}</Text>
                    </View>
                  ) : null}

                  {showDetail.itens.map((item) => (
                    <View key={item.id} style={styles.detailItem}>
                      <Text style={styles.detailItemName}>{item.nome}</Text>
                      <Text style={styles.detailItemQty}>{item.quantidade}</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.deleteSmallBtn} onPress={() => setShowDeleteConfirm(showDetail.id)}>
                    <Trash2 size={16} color={colors.destructive} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editSmallBtn} onPress={() => handleEdit(showDetail)}>
                    <Edit3 size={16} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.loadBtn} onPress={() => handleLoad(showDetail)}>
                    <ArrowDownToLine size={16} color="#fff" />
                    <Text style={styles.loadBtnText}>Carregar Lista</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={resetForm}>
          <View style={styles.createModal} onStartShouldSetResponder={() => true}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.createHeader}>
                <Text style={styles.createTitle}>{editingPreset ? 'Editar Lista' : 'Nova Lista'}</Text>
                <TouchableOpacity onPress={resetForm}>
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.photoPreview} onPress={() => setShowPhotoPicker(true)}>
                <Image source={{ uri: presetPhoto }} style={styles.photoImage} />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoOverlayText}>Trocar foto</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Nome da lista</Text>
              <TextInput
                value={presetName}
                onChangeText={setPresetName}
                style={styles.fieldInput}
                placeholder="Ex: Compras da semana, Churrasco..."
                placeholderTextColor={colors.mutedForeground}
                maxLength={40}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Observações</Text>
              <TextInput
                value={presetNotes}
                onChangeText={setPresetNotes}
                style={[styles.fieldInput, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Anotações sobre esta lista..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={200}
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Adicionar produtos</Text>
              <View style={styles.searchWrap}>
                <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
                <TextInput
                  value={itemSearch}
                  onChangeText={setItemSearch}
                  style={styles.searchInput}
                  placeholder="Buscar produto..."
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={styles.qtyRow}>
                <TextInput
                  value={itemQty}
                  onChangeText={setItemQty}
                  style={[styles.fieldInput, { flex: 1 }]}
                  placeholder="Qtd"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                  {UNITS.map((u, i) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setSelectedUnit(i)}
                      style={[styles.unitChip, selectedUnit === i && styles.unitChipActive]}
                    >
                      <Text style={[styles.unitChipText, selectedUnit === i && styles.unitChipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {itemSearch.trim() ? (
                <View style={styles.searchResults}>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.slice(0, 6).map((ing) => (
                      <TouchableOpacity key={ing.nome} style={styles.searchItem} onPress={() => addItemToPreset(ing.nome)}>
                        <Image source={ing.imagem} style={styles.searchItemImg} />
                        <Text style={styles.searchItemText}>{ing.nome}</Text>
                        <Plus size={14} color={colors.primary} />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <TouchableOpacity style={styles.searchItem} onPress={addCustomItem}>
                      <View style={styles.customItemIcon}>
                        <Plus size={14} color={colors.secondaryForeground} />
                      </View>
                      <Text style={styles.searchItemText}>Adicionar "{itemSearch.trim()}"</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {presetItems.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.fieldLabel}>Itens na lista ({presetItems.length})</Text>
                  {presetItems.map((item) => (
                    <View key={item.id} style={styles.presetItemRow}>
                      <Image source={getIngredientImage(item.nome)} style={styles.presetItemImg} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.presetItemName} numberOfLines={1}>{item.nome}</Text>
                        <Text style={styles.presetItemQty}>{item.quantidade}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removePresetItem(item.id)}>
                        <Minus size={12} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveListBtn, (!presetName.trim() || presetItems.length === 0) && { opacity: 0.4 }]}
                onPress={handleSave}
                disabled={!presetName.trim() || presetItems.length === 0}
              >
                <Text style={styles.saveListBtnText}>{editingPreset ? 'Salvar Alterações' : 'Salvar Lista'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Photo Picker Modal */}
      <Modal visible={showPhotoPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPhotoPicker(false)}>
          <View style={styles.photoPickerModal} onStartShouldSetResponder={() => true}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>Escolher Foto</Text>
              <TouchableOpacity onPress={() => setShowPhotoPicker(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.photoGrid}>
              {STOCK_PHOTOS.map((photo) => (
                <TouchableOpacity
                  key={photo.url}
                  onPress={() => { setPresetPhoto(photo.url); setShowPhotoPicker(false); }}
                  style={[styles.photoOption, presetPhoto === photo.url && styles.photoOptionActive]}
                >
                  <Image source={{ uri: photo.url }} style={styles.photoOptionImg} />
                  {presetPhoto === photo.url && (
                    <View style={styles.photoOptionCheck}>
                      <Check size={20} color="#fff" />
                    </View>
                  )}
                  <View style={styles.photoLabelWrap}>
                    <Text style={styles.photoLabelText}>{photo.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={!!showDeleteConfirm} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeleteConfirm(null)}>
          <View style={styles.confirmModal} onStartShouldSetResponder={() => true}>
            <View style={styles.confirmIcon}>
              <Trash2 size={24} color={colors.destructive} />
            </View>
            <Text style={styles.confirmTitle}>Excluir esta lista?</Text>
            <Text style={styles.confirmSubtitle}>Esta ação não pode ser desfeita.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowDeleteConfirm(null)}>
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              >
                <Text style={styles.confirmDeleteText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginTop: 20, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  countBadge: { backgroundColor: colors.secondary, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  countText: { fontSize: 10, fontWeight: '600', color: colors.mutedForeground },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  createBtnText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  emptyCard: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 12,
    padding: 24, alignItems: 'center', backgroundColor: colors.card + '80',
  },
  emptyTitle: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginTop: 8 },
  emptySubtitle: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetCard: { borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden', elevation: 2 },
  presetImage: { width: '100%', aspectRatio: 16 / 10 },
  presetInfo: { padding: 10 },
  presetName: { fontSize: 12, fontWeight: '700', color: colors.foreground },
  presetCount: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
  detailModal: { width: '100%', maxHeight: '70%', backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  detailImageWrap: { height: 144, overflow: 'hidden' },
  detailImage: { width: '100%', height: '100%' },
  detailImageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  detailCloseBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailImageText: { position: 'absolute', bottom: 12, left: 16 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  detailCount: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  detailBody: { padding: 16, maxHeight: 200 },
  detailNotes: { backgroundColor: colors.secondary, borderRadius: 8, padding: 12, marginBottom: 12 },
  detailNotesText: { fontSize: 12, color: colors.mutedForeground },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  detailItemName: { fontSize: 12, fontWeight: '600', color: colors.foreground },
  detailItemQty: { fontSize: 10, color: colors.mutedForeground },
  detailActions: { flexDirection: 'row', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  deleteSmallBtn: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.destructive + '4D',
    alignItems: 'center', justifyContent: 'center',
  },
  editSmallBtn: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  loadBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 12,
  },
  loadBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  createModal: {
    width: '92%', maxHeight: '80%', backgroundColor: colors.card, borderRadius: 20, padding: 20,
    marginBottom: 20,
  },
  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  createTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  photoPreview: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', marginBottom: 16, backgroundColor: colors.secondary },
  photoImage: { width: '100%', height: '100%' },
  photoOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  photoOverlayText: { fontSize: 9, color: colors.mutedForeground },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  fieldInput: {
    backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.foreground,
  },
  searchWrap: { marginTop: 4, position: 'relative' },
  searchIcon: { position: 'absolute', left: 12, top: 12, zIndex: 1 },
  searchInput: {
    backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 10, paddingLeft: 36, paddingRight: 12, fontSize: 14, color: colors.foreground,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  unitScroll: { flex: 2 },
  unitChip: { borderRadius: 8, backgroundColor: colors.secondary, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  unitChipActive: { backgroundColor: colors.primary },
  unitChipText: { fontSize: 11, color: colors.foreground },
  unitChipTextActive: { color: '#fff', fontWeight: '600' },
  searchResults: { marginTop: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.card, maxHeight: 180 },
  searchItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  searchItemImg: { width: 32, height: 32, borderRadius: 6 },
  searchItemText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.foreground },
  customItemIcon: { width: 32, height: 32, borderRadius: 6, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  presetItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.secondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 6,
  },
  presetItemImg: { width: 28, height: 28, borderRadius: 6 },
  presetItemName: { fontSize: 12, fontWeight: '600', color: colors.foreground },
  presetItemQty: { fontSize: 10, color: colors.mutedForeground },
  saveListBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveListBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  photoPickerModal: { width: '92%', backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoOption: { width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  photoOptionActive: { borderColor: colors.primary },
  photoOptionImg: { width: '100%', height: '100%' },
  photoOptionCheck: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  photoLabelWrap: { position: 'absolute', bottom: 2, left: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  photoLabelText: { fontSize: 8, fontWeight: '600', color: '#fff' },
  confirmModal: { width: '85%', backgroundColor: colors.card, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 40 },
  confirmIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.destructive + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  confirmSubtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  confirmActions: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  confirmCancel: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  confirmDelete: { flex: 1, borderRadius: 12, backgroundColor: colors.destructive, paddingVertical: 12, alignItems: 'center' },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default ShoppingPresets;
