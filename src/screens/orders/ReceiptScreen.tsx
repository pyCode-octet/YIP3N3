import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Order } from '../../lib/supabase';
import { BrandLogo } from '../../components/BrandLogo';
import { exportReceiptPdf, printReceipt } from '../../lib/pdf';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} à ${time}`;
}

function Dashes() {
  return (
    <View style={styles.dashes}>
      {Array.from({ length: 30 }).map((_, i) => (
        <View key={i} style={styles.dash} />
      ))}
    </View>
  );
}

export function ReceiptScreen({ navigation, route }: any) {
  const { order } = route.params as { order: Order };
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try { await exportReceiptPdf(order); }
    catch { Alert.alert('Erreur', 'Impossible d\'exporter le reçu.'); }
    finally { setSharing(false); }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try { await printReceipt(order); }
    catch { Alert.alert('Erreur', 'Impossible d\'imprimer.'); }
    finally { setPrinting(false); }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reçu de commande</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Ticket card */}
        <View style={styles.ticket}>
          {/* Logo */}
          <View style={styles.logoArea}>
            <BrandLogo size="medium" />
          </View>

          <Dashes />

          {/* Commande & Date */}
          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Commande :</Text>
              <Text style={styles.metaRef}>{order.reference}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date :</Text>
              <Text style={styles.metaValue}>{formatDateTime(order.created_at)}</Text>
            </View>
          </View>

          <Dashes />

          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colH, { flex: 2 }]}>Produit</Text>
            <Text style={[styles.colH, styles.colCenter]}>Qté</Text>
            <Text style={[styles.colH, styles.colCenter]}>Prix</Text>
            <Text style={[styles.colH, styles.colRight]}>Total</Text>
          </View>

          {/* Items */}
          {(order.items ?? []).map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.colV, { flex: 2 }]}>
                {item.unit_price.toLocaleString('fr-FR')} FCFA
              </Text>
              <Text style={[styles.colV, styles.colCenter]}>{item.quantity}</Text>
              <Text style={[styles.colV, styles.colCenter]}>
                {item.unit_price.toLocaleString('fr-FR')}
              </Text>
              <Text style={[styles.colV, styles.colRight]}>
                {item.line_total.toLocaleString('fr-FR')}
              </Text>
            </View>
          ))}

          <Dashes />

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{order.total_amount.toLocaleString('fr-FR')} FCFA</Text>
          </View>

          {/* Mode & Tél */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoLine}>
              Mode : <Text style={styles.infoBold}>
                {order.mode === 'a_emporter' ? 'À emporter' : 'Sur place'}
              </Text>
            </Text>
            {order.client_phone ? (
              <Text style={styles.infoLine}>
                Tél : <Text style={styles.infoBold}>{order.client_phone}</Text>
              </Text>
            ) : null}
          </View>

          <Dashes />

          {/* Merci */}
          <Text style={styles.merci}>Merci et à bientôt !</Text>
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWhatsapp, sharing && { opacity: 0.6 }]} onPress={handleShare} disabled={sharing} activeOpacity={0.85}>
          <Ionicons name="logo-whatsapp" size={18} color={Colors.textOnDark} />
          <Text style={[styles.actionBtnText, { color: Colors.textOnDark }]}>{sharing ? '...' : 'Partager'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, sharing && { opacity: 0.6 }]} onPress={handleShare} disabled={sharing} activeOpacity={0.85}>
          <Ionicons name="document-outline" size={18} color={Colors.textPrimary} />
          <Text style={styles.actionBtnText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, printing && { opacity: 0.6 }]} onPress={handlePrint} disabled={printing} activeOpacity={0.85}>
          <Ionicons name="print-outline" size={18} color={Colors.textPrimary} />
          <Text style={styles.actionBtnText}>{printing ? '...' : 'Imprimer'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: 20, paddingBottom: 20 },

  ticket: {
    backgroundColor: Colors.bgCard,
    borderRadius: 4,
    paddingHorizontal: 20, paddingVertical: 24,
    gap: 14,
    // ticket shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  logoArea: { alignItems: 'center', paddingBottom: 4 },

  // Dashed divider
  dashes: { flexDirection: 'row', justifyContent: 'space-between' },
  dash: { width: 5, height: 1.5, backgroundColor: Colors.border, borderRadius: 1 },

  metaBlock: { gap: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 13, color: Colors.textSecondary },
  metaRef: { fontSize: 16, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 1 },
  metaValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  // Table
  tableHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  colH: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  colCenter: { width: 40, textAlign: 'center' },
  colRight: { width: 70, textAlign: 'right' },

  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  colV: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },

  // Total
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  totalValue: { fontSize: 22, fontWeight: '900', color: Colors.accent },

  // Info block
  infoBlock: { gap: 4 },
  infoLine: { fontSize: 13, color: Colors.textSecondary },
  infoBold: { fontWeight: '700', color: Colors.textPrimary },

  merci: {
    textAlign: 'center', fontSize: 14, fontWeight: '700',
    color: Colors.textPrimary, paddingTop: 4,
  },

  // Footer buttons
  footer: {
    flexDirection: 'row', gap: 10,
    padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  actionBtnWhatsapp: { backgroundColor: '#25D366', borderColor: '#25D366' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
});
