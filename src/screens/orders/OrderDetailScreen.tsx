import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Order } from '../../lib/supabase';
import { markOrderTerminated } from '../../lib/api';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function OrderDetailScreen({ navigation, route }: any) {
  const { order } = route.params as { order: Order };
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const isEnCours = order.status === 'en_cours';

  const handleMarkDone = async () => {
    setLoading(true);
    try {
      await markOrderTerminated(order.id);
      setShowSuccess(true);
    } catch {
      Alert.alert('Erreur', 'Impossible de terminer la commande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail de la commande</Text>
        <View style={[styles.statusBadge, { backgroundColor: isEnCours ? Colors.orangeLight : Colors.primaryLight }]}>
          <Text style={[styles.statusBadgeText, { color: isEnCours ? Colors.accentDark : Colors.primary }]}>
            {isEnCours ? 'En cours' : 'Terminée'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Reference */}
        <Text style={styles.refCode}>{order.reference}</Text>
        <Text style={styles.dateText}>{formatDateTime(order.created_at)}</Text>

        {/* Produits */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Produits</Text>
          {(order.items ?? []).map((item, i) => (
            <View key={i} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
              <Text style={styles.itemLeft}>
                {item.unit_price.toLocaleString('fr-FR')} FCFA
                <Text style={styles.itemQty}> × {item.quantity}</Text>
              </Text>
              <Text style={styles.itemRight}>
                {item.line_total.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{order.total_amount.toLocaleString('fr-FR')} FCFA</Text>
          </View>
        </View>

        {/* Informations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          {order.client_phone ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{order.client_phone}</Text>
            </View>
          ) : null}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Lieu</Text>
            <Text style={styles.infoValue}>
              {order.mode === 'a_emporter' ? 'À emporter' : 'Sur place'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Success modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={44} color={Colors.textOnDark} />
            </View>
            <Text style={styles.successTitle}>Commande terminée !</Text>
            <Text style={styles.successRef}>{order.reference}</Text>
            <Text style={styles.successTotal}>{order.total_amount.toLocaleString('fr-FR')} FCFA</Text>
            <TouchableOpacity
              style={styles.successBtnPrimary}
              onPress={() => { 
                setShowSuccess(false); 
                navigation.navigate('Receipt', { order: { ...order, status: 'terminee' } }); 
              }}
            >
              <Ionicons name="document-text-outline" size={17} color={Colors.textOnDark} />
              <Text style={styles.successBtnPrimaryText}>Voir le reçu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successBtnSecondary}
              onPress={() => { 
                setShowSuccess(false); 
                navigation.navigate('Tabs', { screen: 'Orders' });
              }}
            >
              <Text style={styles.successBtnSecondaryText}>Retour aux commandes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Footer buttons */}
      <View style={styles.footer}>
        {isEnCours && (
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBtnPrimary, loading && styles.footerBtnLoading]}
            onPress={handleMarkDone}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.footerBtnPrimaryText}>
              {loading ? 'En cours…' : 'Marquer terminée'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.footerBtn, styles.footerBtnOutline]}
          onPress={() => navigation.navigate('Receipt', { order })}
          activeOpacity={0.85}
        >
          <Text style={styles.footerBtnOutlineText}>Voir le reçu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: { padding: 2 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  content: { padding: 20, gap: 16, paddingBottom: 24 },

  refCode: { fontSize: 34, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 2, marginBottom: -8 },
  dateText: { fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },

  card: {
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 0,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },

  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  itemBorder: { borderTopWidth: 1, borderTopColor: Colors.separator },
  itemLeft: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itemQty: { fontSize: 14, color: Colors.textSecondary, fontWeight: '400' },
  itemRight: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  totalValue: { fontSize: 22, fontWeight: '900', color: Colors.accent },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },

  footer: {
    flexDirection: 'row', gap: 12,
    padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  footerBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  footerBtnPrimary: { backgroundColor: Colors.primary },
  footerBtnLoading: { backgroundColor: Colors.textMuted },
  footerBtnPrimaryText: { color: Colors.textOnDark, fontWeight: '800', fontSize: 15 },
  footerBtnOutline: { borderWidth: 1.5, borderColor: Colors.primary },
  footerBtnOutlineText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },

  successOverlay: { flex: 1, backgroundColor: Colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 28 },
  successCard: {
    width: '100%', backgroundColor: Colors.bgCard, borderRadius: 20,
    padding: 28, alignItems: 'center', gap: 12,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
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
