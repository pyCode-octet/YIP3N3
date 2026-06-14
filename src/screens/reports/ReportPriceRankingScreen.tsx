import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { FishPrice, Order } from '../../lib/supabase';
import { fetchTerminatedOrdersByRange, fetchPrices, getDateRange } from '../../lib/api';

const MEDALS = ['🥇', '🥈', '🥉'];

type RankedPrice = { price: FishPrice; qty: number; revenue: number };

export function ReportPriceRankingScreen({ navigation, route }: any) {
  const { period, startDate, endDate } = route.params as { period: string; startDate?: string; endDate?: string };

  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<RankedPrice[]>([]);

  useEffect(() => {
    const range = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : getDateRange(period);

    Promise.all([
      fetchTerminatedOrdersByRange(range.start, range.end),
      fetchPrices(),
    ]).then(([orders, prices]: [Order[], FishPrice[]]) => {
      const result = prices.map(price => {
        const items = orders.flatMap(o => o.items ?? []).filter(i => i.unit_price === price.amount);
        const qty = items.reduce((s, i) => s + i.quantity, 0);
        const revenue = items.reduce((s, i) => s + i.line_total, 0);
        return { price, qty, revenue };
      }).sort((a, b) => b.qty - a.qty);
      setRanking(result);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const maxQty = Math.max(...ranking.map(r => r.qty), 1);
  const totalRevenue = ranking.reduce((s, r) => s + r.revenue, 0);
  const totalQty = ranking.reduce((s, r) => s + r.qty, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Classement des prix</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>Poissons les plus vendus par tarif</Text>

          {ranking.map((item, index) => (
            <View key={item.price.id} style={[styles.rankCard, index === 0 && styles.rankCardFirst]}>
              <Text style={styles.medal}>{MEDALS[index] ?? `${index + 1}.`}</Text>
              <View style={styles.rankInfo}>
                <Text style={styles.rankPrice}>{item.price.amount.toLocaleString('fr-FR')} FCFA</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, {
                    width: `${(item.qty / maxQty) * 100}%`,
                    backgroundColor: index === 0 ? Colors.accent : index === 1 ? Colors.primary : Colors.textSecondary,
                  }]} />
                </View>
                <Text style={styles.rankRevenue}>{item.revenue.toLocaleString('fr-FR')} FCFA générés</Text>
              </View>
              <View style={styles.rankCount}>
                <Text style={styles.rankQty}>{item.qty}</Text>
                <Text style={styles.rankQtyLabel}>vendus</Text>
              </View>
            </View>
          ))}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total général</Text>
            <Text style={styles.summaryValue}>{totalRevenue.toLocaleString('fr-FR')} FCFA</Text>
            <Text style={styles.summaryLabel}>{totalQty} poissons vendus au total</Text>
          </View>
        </ScrollView>
      )}
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: 20, gap: 12, paddingBottom: 80 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  rankCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 8, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  rankCardFirst: { borderColor: Colors.accent, backgroundColor: Colors.orangeLight },
  medal: { fontSize: 24, width: 32, textAlign: 'center' },
  rankInfo: { flex: 1, gap: 6 },
  rankPrice: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  barContainer: { height: 6, backgroundColor: Colors.bgInput, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  rankRevenue: { fontSize: 11, color: Colors.textMuted },
  rankCount: { alignItems: 'center' },
  rankQty: { fontSize: 26, fontWeight: '900', color: Colors.accentDark },
  rankQtyLabel: { fontSize: 11, color: Colors.textMuted },
  summaryCard: {
    backgroundColor: Colors.bgCard, borderRadius: 8, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 6, marginTop: 8,
  },
  summaryTitle: { fontSize: 13, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { fontSize: 28, fontWeight: '900', color: Colors.primary },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
});
