import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { FishPrice, Order } from '../../lib/supabase';
import { fetchPrices, createOrder } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

// Attièké options (independent of frites)
const ATTIEKE = [
  { id: 'none',      label: 'Sans',   price: 0    },
  { id: 'attieke_s', label: '500',    price: 500  },
  { id: 'attieke_m', label: '1 000',  price: 1000 },
  { id: 'attieke_l', label: '1 500',  price: 1500 },
] as const;

// Frites options (independent of attièké)
const FRITES = [
  { id: 'none',     label: 'Sans',   price: 0    },
  { id: 'frites_m', label: '1 000',  price: 1000 },
  { id: 'frites_l', label: '1 500',  price: 1500 },
] as const;

type AttriekeId = typeof ATTIEKE[number]['id'];
type FritesId   = typeof FRITES[number]['id'];

type CartItem = {
  cartId: string;
  priceId: string;
  unitPrice: number;
  quantity: number;
  attriekeId: AttriekeId;
  attriekePrice: number;
  fritesId: FritesId;
  fritesPrice: number;
  withMayo: boolean;
  notes: string;
  accompanimentId: string;
  lineTotal: number;
};

function genId()  { return Math.random().toString(36).substring(2, 10); }
function genRef() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

export function NewOrderScreen({ navigation }: any) {
  const { user } = useAuth();
  const [prices, setPrices] = useState<FishPrice[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [phone, setPhone] = useState('');
  const [mode, setMode] = useState<'sur_place' | 'a_emporter'>('sur_place');
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<FishPrice | null>(null);
  const [qty, setQty] = useState(1);
  const [attriekeId, setAttriekeId] = useState<AttriekeId>('none');
  const [fritesId, setFritesId] = useState<FritesId>('none');
  const [withMayo, setWithMayo] = useState(true);

  useEffect(() => {
    fetchPrices().then(all => setPrices(all.filter(p => p.active))).catch(() => {});
  }, []);

  const total = cart.reduce((s, i) => s + i.lineTotal, 0);

  const openModal = (price: FishPrice) => {
    setSelectedPrice(price);
    setQty(1);
    setAttriekeId('none');
    setFritesId('none');
    setWithMayo(true);
    setModalVisible(true);
  };

  // Computed totals in the modal
  const attriekePrice = ATTIEKE.find(a => a.id === attriekeId)!.price;
  const fritesPrice   = FRITES.find(f => f.id === fritesId)!.price;
  const modalTotal    = selectedPrice ? (selectedPrice.amount + attriekePrice + fritesPrice) * qty : 0;

  const handleAddToCart = () => {
    if (!selectedPrice) return;

    // Build human-readable notes
    const parts: string[] = [];
    if (attriekeId !== 'none') parts.push(`Attièké ${attriekePrice} FCFA`);
    if (fritesId !== 'none')   parts.push(`Frites ${fritesPrice} FCFA`);
    const sideText = parts.length > 0 ? parts.join(' + ') : 'Sans accompagnement';
    const notes    = `${sideText} · ${withMayo ? 'Avec mayo' : 'Sans mayo'}`;

    // Combined DB key (e.g. "attieke_m+frites_m" or "attieke_m" or "none")
    const accompParts = [
      attriekeId !== 'none' ? attriekeId : '',
      fritesId   !== 'none' ? fritesId   : '',
    ].filter(Boolean);
    const accompanimentId = accompParts.length > 0 ? accompParts.join('+') : 'none';

    const lineTotal = (selectedPrice.amount + attriekePrice + fritesPrice) * qty;

    setCart(prev => [...prev, {
      cartId: genId(),
      priceId: selectedPrice.id,
      unitPrice: selectedPrice.amount,
      quantity: qty,
      attriekeId,
      attriekePrice,
      fritesId,
      fritesPrice,
      withMayo,
      notes,
      accompanimentId,
      lineTotal,
    }]);
    setModalVisible(false);
  };

  const handleConfirm = async () => {
    if (cart.length === 0 || !user) return;
    setSubmitting(true);
    try {
      const order = await createOrder(
        user.id, genRef(), mode, total, phone || undefined,
        cart.map(i => ({
          fish_price_id:    i.priceId,
          quantity:         i.quantity,
          unit_price:       i.unitPrice,
          line_total:       i.lineTotal,
          notes:            i.notes,
          accompaniment_id: i.accompanimentId,
          with_mayo:        i.withMayo,
        }))
      );
      setSuccessOrder(order);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de créer la commande.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle commande</Text>
        <TouchableOpacity onPress={() => setCart([])} disabled={cart.length === 0}>
          <Ionicons name="trash-outline" size={22} color={cart.length > 0 ? Colors.error : Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          {(['sur_place', 'a_emporter'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
            >
              <Ionicons
                name={m === 'sur_place' ? 'restaurant-outline' : 'bag-outline'}
                size={16}
                color={mode === m ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'sur_place' ? 'Sur place' : 'À emporter'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fish price tiles */}
        <View>
          <Text style={styles.sectionLabel}>CHOISIR UN POISSON</Text>
          <Text style={styles.sectionHint}>Appuie sur plusieurs tuiles pour des poissons différents</Text>
          <View style={styles.priceGrid}>
            {prices.map(p => (
              <TouchableOpacity key={p.id} style={styles.priceTile} onPress={() => openModal(p)} activeOpacity={0.7}>
                <Text style={styles.priceTileEmoji}>🐟</Text>
                <Text style={styles.priceTileAmount}>{p.amount.toLocaleString('fr-FR')}</Text>
                <Text style={styles.priceTileFcfa}>FCFA</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cart */}
        {cart.length > 0 && (
          <View style={styles.cartSection}>
            <View style={styles.cartHeader}>
              <Text style={styles.sectionLabel}>PANIER</Text>
              <Text style={styles.cartBadge}>{cart.length} article{cart.length > 1 ? 's' : ''}</Text>
            </View>
            {cart.map((item, idx) => (
              <View key={item.cartId} style={[styles.cartRow, idx > 0 && styles.cartRowBorder]}>
                <View style={styles.cartRowLeft}>
                  <Text style={styles.cartRowTitle}>
                    🐟 {item.unitPrice.toLocaleString('fr-FR')} FCFA{item.quantity > 1 ? ` × ${item.quantity}` : ''}
                  </Text>
                  <Text style={styles.cartRowNotes}>{item.notes}</Text>
                </View>
                <View style={styles.cartRowRight}>
                  <Text style={styles.cartRowTotal}>{item.lineTotal.toLocaleString('fr-FR')}</Text>
                  <TouchableOpacity onPress={() => setCart(prev => prev.filter(i => i.cartId !== item.cartId))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={styles.cartTotal}>
              <Text style={styles.cartTotalLabel}>TOTAL</Text>
              <Text style={styles.cartTotalValue}>{total.toLocaleString('fr-FR')} FCFA</Text>
            </View>
          </View>
        )}

        {/* Phone */}
        <View style={styles.phoneCard}>
          <Ionicons name="call-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="Numéro client (optionnel)"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Confirm */}
        <TouchableOpacity
          style={[styles.confirmBtn, (cart.length === 0 || submitting) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={cart.length === 0 || submitting}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.textOnDark} />
          <Text style={styles.confirmBtnText}>
            {submitting ? 'Création...' : `Confirmer · ${total.toLocaleString('fr-FR')} FCFA`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Success modal */}
      <Modal visible={!!successOrder} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={44} color={Colors.textOnDark} />
            </View>
            <Text style={styles.successTitle}>Commande créée !</Text>
            <Text style={styles.successRef}>{successOrder?.reference}</Text>
            <Text style={styles.successTotal}>{successOrder?.total_amount.toLocaleString('fr-FR')} FCFA</Text>
            <TouchableOpacity
              style={styles.successBtnPrimary}
              onPress={() => { const o = successOrder; setSuccessOrder(null); navigation.navigate('Receipt', { order: o }); }}
            >
              <Ionicons name="document-text-outline" size={17} color={Colors.textOnDark} />
              <Text style={styles.successBtnPrimaryText}>Voir le reçu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successBtnSecondary}
              onPress={() => { setSuccessOrder(null); setCart([]); setPhone(''); }}
            >
              <Text style={styles.successBtnSecondaryText}>Nouvelle commande</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.successBtnSecondary, { borderTopWidth: 0, marginTop: -8 }]}
              onPress={() => {
                setSuccessOrder(null);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Tabs', params: { screen: 'Dashboard' } }],
                });
              }}
            >
              <Text style={styles.successBtnSecondaryText}>Retour au Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom sheet — item configurator */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Poisson {selectedPrice?.amount.toLocaleString('fr-FR')} FCFA</Text>

            {/* Quantity */}
            <Text style={styles.sheetLabel}>QUANTITÉ</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
                <Ionicons name="remove" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => q + 1)}>
                <Ionicons name="add" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Attièké — independent row */}
            <Text style={styles.sheetLabel}>ATTIÈKÉ</Text>
            <View style={styles.sideRow}>
              {ATTIEKE.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.sideBtn, attriekeId === a.id && styles.sideBtnActive]}
                  onPress={() => setAttriekeId(a.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.sideBtnLabel, attriekeId === a.id && styles.sideBtnLabelActive]}>{a.label}</Text>
                  {a.price > 0 && (
                    <Text style={[styles.sideBtnSub, attriekeId === a.id && styles.sideBtnSubActive]}>FCFA</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Frites — independent row */}
            <Text style={styles.sheetLabel}>FRITES</Text>
            <View style={styles.sideRow}>
              {FRITES.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.sideBtn, fritesId === f.id && styles.sideBtnActiveFrites]}
                  onPress={() => setFritesId(f.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.sideBtnLabel, fritesId === f.id && styles.sideBtnLabelActiveFrites]}>{f.label}</Text>
                  {f.price > 0 && (
                    <Text style={[styles.sideBtnSub, fritesId === f.id && styles.sideBtnSubActiveFrites]}>FCFA</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Mayo */}
            <Text style={styles.sheetLabel}>INGRÉDIENTS</Text>
            <View style={styles.mayoRow}>
              <TouchableOpacity style={[styles.mayoBtn, withMayo && styles.mayoBtnActive]} onPress={() => setWithMayo(true)} activeOpacity={0.75}>
                <Text style={[styles.mayoText, withMayo && styles.mayoTextActive]}>Avec mayo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mayoBtn, !withMayo && styles.mayoBtnActive]} onPress={() => setWithMayo(false)} activeOpacity={0.75}>
                <Text style={[styles.mayoText, !withMayo && styles.mayoTextActive]}>Sans mayo</Text>
              </TouchableOpacity>
            </View>

            {/* Add */}
            <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.textOnDark} />
              <Text style={styles.addBtnText}>Ajouter · {modalTotal.toLocaleString('fr-FR')} FCFA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: 16, gap: 20, paddingBottom: 48 },

  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  modeBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  modeBtnTextActive: { color: Colors.primary },

  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  sectionHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 10, fontStyle: 'italic' },

  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  priceTile: {
    width: '30%', flexGrow: 1,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    paddingVertical: 20, alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: Colors.border,
    elevation: 2,
  },
  priceTileEmoji: { fontSize: 28 },
  priceTileAmount: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  priceTileFcfa: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },

  cartSection: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  cartBadge: { fontSize: 11, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  cartRowBorder: { borderTopWidth: 1, borderTopColor: Colors.separator },
  cartRowLeft: { flex: 1, gap: 2 },
  cartRowTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cartRowNotes: { fontSize: 12, color: Colors.textMuted },
  cartRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartRowTotal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  cartTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 2, borderTopColor: Colors.primary + '30', backgroundColor: Colors.primaryLight,
  },
  cartTotalLabel: { fontSize: 12, fontWeight: '800', color: Colors.primary, letterSpacing: 1 },
  cartTotalValue: { fontSize: 20, fontWeight: '900', color: Colors.primary },

  phoneCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgCard, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border,
  },
  phoneInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 17,
  },
  confirmBtnDisabled: { backgroundColor: Colors.textMuted },
  confirmBtnText: { fontSize: 16, fontWeight: '800', color: Colors.textOnDark },

  sheetOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 14 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sheetLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden' },
  qtyBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCardLight },
  qtyVal: { width: 52, textAlign: 'center', fontSize: 20, fontWeight: '800', color: Colors.textPrimary },

  // Accompaniment rows (independent: attièké + frites)
  sideRow: { flexDirection: 'row', gap: 8 },
  sideBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', gap: 1,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg,
  },
  sideBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  sideBtnActiveFrites: { borderColor: Colors.accent, backgroundColor: Colors.orangeLight },
  sideBtnLabel: { fontSize: 14, fontWeight: '800', color: Colors.textSecondary },
  sideBtnLabelActive: { color: Colors.primary },
  sideBtnLabelActiveFrites: { color: Colors.accentDark },
  sideBtnSub: { fontSize: 9, color: Colors.textMuted },
  sideBtnSubActive: { color: Colors.primaryDark },
  sideBtnSubActiveFrites: { color: Colors.accentDark },

  mayoRow: { flexDirection: 'row', gap: 10 },
  mayoBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg },
  mayoBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  mayoText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  mayoTextActive: { color: Colors.primary },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16 },
  addBtnText: { fontSize: 16, fontWeight: '800', color: Colors.textOnDark },

  // Success modal
  successOverlay: { flex: 1, backgroundColor: Colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 28 },
  successCard: {
    width: '100%', backgroundColor: Colors.bgCard, borderRadius: 20,
    padding: 28, alignItems: 'center', gap: 12,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  successRef: { fontSize: 26, fontWeight: '900', color: Colors.primary, letterSpacing: 3 },
  successTotal: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  successBtnPrimary: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  successBtnPrimaryText: { fontSize: 15, fontWeight: '800', color: Colors.textOnDark },
  successBtnSecondary: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 13,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  successBtnSecondaryText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
});
