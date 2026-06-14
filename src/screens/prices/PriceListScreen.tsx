import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { FishPrice } from '../../lib/supabase';
import { fetchPrices } from '../../lib/api';

export function PriceListScreen({ navigation }: any) {
  const [prices, setPrices] = useState<FishPrice[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPrices = async () => {
    try {
      const data = await fetchPrices();
      setPrices(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadPrices(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrices();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestion des prix</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddPrice')}>
          <Ionicons name="add" size={22} color={Colors.textOnDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Text style={styles.hint}>Les prix actifs sont disponibles pour les nouvelles commandes.</Text>

        {prices.map(price => (
          <View key={price.id} style={[styles.priceCard, !price.active && styles.priceInactive]}>
            <View style={styles.priceLeft}>
              <Text style={[styles.priceAmount, !price.active && styles.textFaded]}>
                {price.amount.toLocaleString('fr-FR')} FCFA
              </Text>
              <View style={[styles.activeBadge, { backgroundColor: price.active ? Colors.green + '22' : Colors.error + '22' }]}>
                <Text style={[styles.activeBadgeText, { color: price.active ? Colors.green : Colors.error }]}>
                  {price.active ? 'Actif' : 'Désactivé'}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('EditPrice', { price })}
              >
                <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              {price.active && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.error + '22' }]}
                  onPress={() => navigation.navigate('DeactivatePrice', { price })}
                >
                  <Ionicons name="ban-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginLeft: 8 },
  addBtn: {
    width: 38, height: 38, borderRadius: 8,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: 16, gap: 10, paddingBottom: 80 },
  hint: { fontSize: 13, color: Colors.textMuted, marginBottom: 6 },
  priceCard: {
    backgroundColor: Colors.bgCard, borderRadius: 8, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  priceInactive: { opacity: 0.6 },
  priceLeft: { gap: 6 },
  priceAmount: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  textFaded: { color: Colors.textMuted },
  activeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
});
