import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Order, OrderItem } from '../../lib/supabase';
import { fetchTerminatedOrdersByRange } from '../../lib/api';

const SIDE_LABELS: Record<string, string> = {
  none:       'Sans accompagnement',
  attieke_s:  'Attièké 500 FCFA',
  attieke_m:  'Attièké 1 000 FCFA',
  attieke_l:  'Attièké 1 500 FCFA',
  frites_m:   'Frites 1 000 FCFA',
  frites_l:   'Frites 1 500 FCFA',
};

const MEDALS = ['🥇', '🥈', '🥉'];

type FishStat = { price: number; qty: number; revenue: number };
type SideStat = { id: string; label: string; qty: number };

export function BestSellersScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [fishRanking, setFishRanking] = useState<FishStat[]>([]);
  const [sideStats, setSideStats] = useState<SideStat[]>([]);
  const [withMayo, setWithMayo] = useState(0);
  const [withoutMayo, setWithoutMayo] = useState(0);

  useEffect(() => {
    fetchTerminatedOrdersByRange(new Date(2020, 0, 1), new Date())
      .then((orders: Order[]) => {
        const allItems: OrderItem[] = orders.flatMap(o => o.items ?? []);

        // Fish ranking by price
        const fishMap = new Map<number, { qty: number; revenue: number }>();
        for (const item of allItems) {
          const existing = fishMap.get(item.unit_price) ?? { qty: 0, revenue: 0 };
          fishMap.set(item.unit_price, {
            qty: existing.qty + item.quantity,
            revenue: existing.revenue + item.line_total,
          });
        }
        setFishRanking(
          Array.from(fishMap.entries())
            .map(([price, { qty, revenue }]) => ({ price, qty, revenue }))
            .sort((a, b) => b.qty - a.qty)
        );

        // Accompaniment breakdown (support combined: "attieke_m+frites_m")
        const sideMap = new Map<string, number>();
        let mayo = 0, noMayo = 0;
        for (const item of allItems) {
          const raw = item.accompaniment_id ?? 'none';
          const parts = raw.split('+').filter(Boolean);
          if (parts.length === 0 || (parts.length === 1 && parts[0] === 'none')) {
            sideMap.set('none', (sideMap.get('none') ?? 0) + item.quantity);
          } else {
            for (const part of parts) {
              if (part !== 'none') sideMap.set(part, (sideMap.get(part) ?? 0) + item.quantity);
            }
          }
          if (item.with_mayo) mayo += item.quantity;
          else noMayo += item.quantity;
        }
        setSideStats(
          Array.from(sideMap.entries())
            .map(([id, qty]) => ({ id, label: SIDE_LABELS[id] ?? id, qty }))
            .sort((a, b) => b.qty - a.qty)
        );
        setWithMayo(mayo);
        setWithoutMayo(noMayo);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const attiekeStats = sideStats.filter(s => s.id.startsWith('attieke'));
  const fritesStats  = sideStats.filter(s => s.id.startsWith('frites'));

  const maxFishQty    = fishRanking[0]?.qty ?? 1;
  const maxAttiekeQty = attiekeStats[0]?.qty ?? 1;
  const maxFritesQty  = fritesStats[0]?.qty ?? 1;
  const totalMayo = withMayo + withoutMayo;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistiques des ventes</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Fish ranking */}
          <Text style={styles.sectionTitle}>🐟 Poissons vendus</Text>
          {fishRanking.length === 0 ? (
            <Text style={styles.empty}>Aucune vente enregistrée</Text>
          ) : fishRanking.map(({ price, qty, revenue }, i) => (
            <View key={price} style={styles.rankCard}>
              <Text style={styles.rankPos}>{i < 3 ? MEDALS[i] : `#${i + 1}`}</Text>
              <View style={styles.rankInfo}>
                <Text style={styles.rankLabel}>Poisson {price.toLocaleString('fr-FR')} FCFA</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(qty / maxFishQty) * 100}%` as any, backgroundColor: Colors.primary }]} />
                </View>
              </View>
              <View style={styles.rankRight}>
                <Text style={styles.qtyText}>{qty} vendus</Text>
                <Text style={styles.revenueText}>{revenue.toLocaleString('fr-FR')} FCFA</Text>
              </View>
            </View>
          ))}

          {/* Attièké */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>🍚 Attièké</Text>
          {attiekeStats.length === 0 ? (
            <Text style={styles.empty}>Aucune vente</Text>
          ) : attiekeStats.map(({ id, label, qty }) => (
            <View key={id} style={styles.rankCard}>
              <View style={styles.rankInfo}>
                <Text style={styles.rankLabel}>{label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(qty / maxAttiekeQty) * 100}%` as any, backgroundColor: '#16a34a' }]} />
                </View>
              </View>
              <View style={styles.rankRight}>
                <Text style={[styles.qtyText, { color: '#16a34a' }]}>{qty} vendus</Text>
              </View>
            </View>
          ))}

          {/* Frites */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>🍟 Frites</Text>
          {fritesStats.length === 0 ? (
            <Text style={styles.empty}>Aucune vente</Text>
          ) : fritesStats.map(({ id, label, qty }) => (
            <View key={id} style={styles.rankCard}>
              <View style={styles.rankInfo}>
                <Text style={styles.rankLabel}>{label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(qty / maxFritesQty) * 100}%` as any, backgroundColor: '#ea580c' }]} />
                </View>
              </View>
              <View style={styles.rankRight}>
                <Text style={[styles.qtyText, { color: '#ea580c' }]}>{qty} vendus</Text>
              </View>
            </View>
          ))}

          {/* Mayo breakdown */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>🫙 Mayo</Text>
          <View style={styles.mayoCard}>
            <View style={styles.mayoRow}>
              <View style={styles.mayoItem}>
                <Text style={styles.mayoVal}>{withMayo}</Text>
                <Text style={styles.mayoLabel}>Avec mayo</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {
                    width: totalMayo > 0 ? `${(withMayo / totalMayo) * 100}%` as any : '0%',
                    backgroundColor: Colors.primary,
                  }]} />
                </View>
              </View>
              <View style={styles.mayoDivider} />
              <View style={styles.mayoItem}>
                <Text style={styles.mayoVal}>{withoutMayo}</Text>
                <Text style={styles.mayoLabel}>Sans mayo</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {
                    width: totalMayo > 0 ? `${(withoutMayo / totalMayo) * 100}%` as any : '0%',
                    backgroundColor: Colors.textMuted,
                  }]} />
                </View>
              </View>
            </View>
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
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10, paddingBottom: 48 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: 20, fontSize: 14 },

  rankCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  rankPos: { fontSize: 22, width: 34, textAlign: 'center' },
  rankInfo: { flex: 1, gap: 8 },
  rankLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  barTrack: { height: 6, backgroundColor: Colors.separator, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  rankRight: { alignItems: 'flex-end', gap: 2 },
  qtyText: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  revenueText: { fontSize: 11, color: Colors.textSecondary },

  mayoCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  mayoRow: { flexDirection: 'row', gap: 16 },
  mayoItem: { flex: 1, gap: 6 },
  mayoVal: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary },
  mayoLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  mayoDivider: { width: 1, backgroundColor: Colors.border },
});
