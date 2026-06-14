import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { Order } from '../../lib/supabase';
import { fetchTerminatedOrdersByRange, getDateRange } from '../../lib/api';
import { exportSalesReportPdf } from '../../lib/pdf';

const SIDE_LABEL: Record<string, string> = {
  attieke_s: '500 FCFA', attieke_m: '1 000 FCFA', attieke_l: '1 500 FCFA',
  frites_m: '1 000 FCFA', frites_l: '1 500 FCFA',
};

const PERIOD_LABELS: Record<string, string> = {
  aujourd_hui: "Aujourd'hui",
  semaine: 'Cette semaine',
  mois: 'Ce mois',
  date_specifique: 'Période sélectionnée',
};

export function ReportSummaryScreen({ navigation, route }: any) {
  const { period, startDate, endDate } = route.params as { period: string; startDate?: string; endDate?: string };
  const label = PERIOD_LABELS[period] ?? period;

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

  const total = orders.reduce((s, o) => s + o.total_amount, 0);
  const allItems = orders.flatMap(o => o.items ?? []);
  const totalPoissons = allItems.reduce((s, i) => s + i.quantity, 0);

  const fishByPrice: Record<number, number> = {};
  const sideCount: Record<string, number> = {};
  let withMayo = 0, withoutMayo = 0;
  for (const it of allItems) {
    fishByPrice[it.unit_price] = (fishByPrice[it.unit_price] ?? 0) + it.quantity;
    for (const p of (it.accompaniment_id ?? '').split('+').filter(s => s && s !== 'none'))
      sideCount[p] = (sideCount[p] ?? 0) + it.quantity;
    if (it.with_mayo) withMayo += it.quantity;
    else withoutMayo += it.quantity;
  }
  const fishEntries = Object.entries(fishByPrice).sort((a, b) => +a[0] - +b[0]);
  const attiekeEntries = Object.entries(sideCount).filter(([k]) => k.startsWith('attieke')).sort();
  const fritesEntries  = Object.entries(sideCount).filter(([k]) => k.startsWith('frites')).sort();

  const handleExportPdf = async () => {
    if (orders.length === 0) { Alert.alert('Aucune donnée', 'Aucune commande sur cette période.'); return; }
    setExporting(true);
    try {
      await exportSalesReportPdf(orders, label);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setExporting(false);
    }
  };

  const subParams = { period, startDate, endDate };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rapport — {label}</Text>
        <TouchableOpacity onPress={handleExportPdf} disabled={exporting}>
          <Ionicons name="download-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.dateLabel}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardPrimary]}>
                <Ionicons name="cash-outline" size={20} color={Colors.textOnDark} />
                <Text style={[styles.statLabel, styles.statLabelOnDark]}>Total ventes</Text>
                <Text style={[styles.statValue, styles.statValueOnDark]}>{total.toLocaleString('fr-FR')} FCFA</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="fish-outline" size={20} color={Colors.green} />
                <Text style={styles.statLabel}>Poissons vendus</Text>
                <Text style={[styles.statValue, { color: Colors.green }]}>{totalPoissons}</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="receipt-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.statLabel}>Commandes</Text>
                <Text style={[styles.statValue, { color: Colors.textSecondary }]}>{orders.length}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Détails</Text>
            <View style={styles.links}>
              <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('ReportSalesDetail', subParams)}>
                <View>
                  <Text style={styles.linkTitle}>Détail des ventes</Text>
                  <Text style={styles.linkSub}>Liste complète des commandes</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('ReportPriceRanking', subParams)}>
                <View>
                  <Text style={styles.linkTitle}>Classement des prix</Text>
                  <Text style={styles.linkSub}>Poissons les plus vendus</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Breakdown poissons */}
            {fishEntries.length > 0 && (() => {
              const max = Math.max(1, ...fishEntries.map(([, v]) => v));
              return (
                <>
                  <Text style={styles.sectionTitle}>🐟 Poissons par prix</Text>
                  <View style={styles.bdCard}>
                    {fishEntries.map(([price, qty]) => (
                      <View key={price} style={styles.bdRow}>
                        <Text style={styles.bdLabel}>{Number(price).toLocaleString('fr-FR')} FCFA</Text>
                        <View style={styles.bdBarBg}>
                          <View style={{ flex: qty, backgroundColor: Colors.primary, height: 6, borderRadius: 3 }} />
                          <View style={{ flex: max - qty }} />
                        </View>
                        <Text style={styles.bdQty}>{qty}</Text>
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}

            {/* Breakdown attièké */}
            {attiekeEntries.length > 0 && (() => {
              const max = Math.max(1, ...attiekeEntries.map(([, v]) => v));
              return (
                <>
                  <Text style={styles.sectionTitle}>🍚 Attièké</Text>
                  <View style={styles.bdCard}>
                    {attiekeEntries.map(([key, qty]) => (
                      <View key={key} style={styles.bdRow}>
                        <Text style={styles.bdLabel}>{SIDE_LABEL[key]}</Text>
                        <View style={styles.bdBarBg}>
                          <View style={{ flex: qty, backgroundColor: '#16a34a', height: 6, borderRadius: 3 }} />
                          <View style={{ flex: max - qty }} />
                        </View>
                        <Text style={styles.bdQty}>{qty}</Text>
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}

            {/* Breakdown frites */}
            {fritesEntries.length > 0 && (() => {
              const max = Math.max(1, ...fritesEntries.map(([, v]) => v));
              return (
                <>
                  <Text style={styles.sectionTitle}>🍟 Frites</Text>
                  <View style={styles.bdCard}>
                    {fritesEntries.map(([key, qty]) => (
                      <View key={key} style={styles.bdRow}>
                        <Text style={styles.bdLabel}>{SIDE_LABEL[key]}</Text>
                        <View style={styles.bdBarBg}>
                          <View style={{ flex: qty, backgroundColor: '#ea580c', height: 6, borderRadius: 3 }} />
                          <View style={{ flex: max - qty }} />
                        </View>
                        <Text style={styles.bdQty}>{qty}</Text>
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}

            {/* Mayo */}
            {(withMayo + withoutMayo) > 0 && (
              <>
                <Text style={styles.sectionTitle}>🫙 Mayo</Text>
                <View style={styles.bdCard}>
                  <View style={styles.bdRow}>
                    <Text style={styles.bdLabel}>Avec mayo</Text>
                    <View style={styles.bdBarBg}>
                      <View style={{ flex: withMayo, backgroundColor: Colors.primary, height: 6, borderRadius: 3 }} />
                      <View style={{ flex: withoutMayo }} />
                    </View>
                    <Text style={styles.bdQty}>{withMayo}</Text>
                  </View>
                  <View style={styles.bdRow}>
                    <Text style={styles.bdLabel}>Sans mayo</Text>
                    <View style={styles.bdBarBg}>
                      <View style={{ flex: withoutMayo, backgroundColor: Colors.textMuted, height: 6, borderRadius: 3 }} />
                      <View style={{ flex: withMayo }} />
                    </View>
                    <Text style={styles.bdQty}>{withoutMayo}</Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label={exporting ? 'Génération...' : 'Exporter PDF'} onPress={handleExportPdf} variant="secondary" style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: 56, backgroundColor: Colors.bg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  content: { padding: 20, gap: 20, paddingBottom: 100 },
  dateLabel: { fontSize: 14, color: Colors.textSecondary, textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  statCardPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statLabelOnDark: { color: '#D7F4E4' },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  statValueOnDark: { color: Colors.textOnDark },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  links: { gap: 10 },
  linkCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: 8, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  linkTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  linkSub: { fontSize: 12, color: Colors.textMuted },
  footer: { flexDirection: 'row', padding: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: Colors.border },

  bdCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  bdRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bdLabel: { fontSize: 13, color: Colors.textPrimary, width: 110 },
  bdBarBg: {
    flex: 1, height: 6, borderRadius: 3, overflow: 'hidden',
    backgroundColor: Colors.separator, flexDirection: 'row',
  },
  bdQty: { fontSize: 14, fontWeight: '900', color: Colors.textPrimary, width: 24, textAlign: 'right' },
});
