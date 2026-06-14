import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Order } from '../../lib/supabase';
import { fetchTerminatedOrdersByRange, getDateRange } from '../../lib/api';
import { exportSalesReportPdf } from '../../lib/pdf';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ReportSalesDetailScreen({ navigation, route }: any) {
  const { period = "Aujourd'hui", startDate, endDate } = route.params ?? {};

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const range = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : getDateRange(period);
    fetchTerminatedOrdersByRange(range.start, range.end)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grandTotal = orders.reduce((s, o) => s + o.total_amount, 0);

  const handleDownload = async () => {
    if (orders.length === 0) { Alert.alert('Aucune donnée', 'Aucune commande sur cette période.'); return; }
    setExporting(true);
    try {
      await exportSalesReportPdf(orders, period);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF. Réessaie.');
    } finally {
      setExporting(false);
    }
  };

  const renderItem = ({ item: order }: { item: Order }) => (
    <View style={styles.row}>
      <Text style={styles.rowDate}>{formatDate(order.created_at)}</Text>
      <Text style={styles.rowRef}>{order.reference}</Text>
      <Text style={styles.rowQty}>{(order.items ?? []).reduce((s, i) => s + i.quantity, 0)}</Text>
      <Text style={styles.rowPrice}>{order.items?.[0]?.unit_price.toLocaleString('fr-FR') ?? '—'}</Text>
      <Text style={styles.rowTotal}>{order.total_amount.toLocaleString('fr-FR')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail des ventes</Text>
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.8} disabled={exporting}>
          <Ionicons name="share-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.col, { flex: 2 }]}>Date</Text>
        <Text style={styles.col}>Réf.</Text>
        <Text style={styles.col}>Qté</Text>
        <Text style={styles.col}>Prix</Text>
        <Text style={[styles.col, { color: Colors.primary }]}>Total</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 40 }}>
              Aucune vente sur cette période
            </Text>
          )}
          ListFooterComponent={orders.length > 0 ? () => (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{grandTotal.toLocaleString('fr-FR')} FCFA</Text>
            </View>
          ) : null}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.footerBtn, exporting && { opacity: 0.6 }]} onPress={handleDownload} activeOpacity={0.85} disabled={exporting}>
          <Ionicons name="document-outline" size={18} color={Colors.textOnDark} />
          <Text style={styles.footerBtnText}>{exporting ? 'Génération PDF...' : 'Télécharger PDF'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginLeft: 8 },
  downloadBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: Colors.bgCard,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  col: { flex: 1, fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '700' },
  list: { paddingBottom: 100 },
  row: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.bgCard,
  },
  rowDate: { flex: 2, fontSize: 11, color: Colors.textSecondary },
  rowRef: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 1 },
  rowQty: { flex: 1, fontSize: 13, color: Colors.textPrimary, textAlign: 'center' },
  rowPrice: { flex: 1, fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  rowTotal: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.primary, textAlign: 'right' },
  separator: { height: 1, backgroundColor: Colors.separator },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 16, borderTopWidth: 2, borderTopColor: Colors.border,
    backgroundColor: Colors.bgCard, marginTop: 8,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  totalValue: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 28,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  footerBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  footerBtnText: { color: Colors.textOnDark, fontWeight: '800', fontSize: 15 },
});
