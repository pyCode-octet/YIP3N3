import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { OrderCard } from '../../components/OrderCard';
import { fetchOrders } from '../../lib/api';
import { Order } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Tab = 'en_cours' | 'terminee';

export function OrdersScreen({ navigation }: any) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('en_cours');
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadOrders(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const filtered = orders.filter(o => o.status === tab);
  const enCoursCount  = orders.filter(o => o.status === 'en_cours').length;
  const termineeCount = orders.filter(o => o.status === 'terminee').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {tab === 'en_cours' ? 'Commandes en cours' : 'Commandes terminées'}
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'en_cours' && styles.tabActive]}
          onPress={() => setTab('en_cours')}
        >
          <Text style={[styles.tabText, tab === 'en_cours' && styles.tabTextActive]}>En cours</Text>
          <View style={[styles.tabBadge, { backgroundColor: tab === 'en_cours' ? Colors.accent : Colors.separator }]}>
            <Text style={[styles.tabBadgeText, { color: tab === 'en_cours' ? Colors.textOnDark : Colors.textMuted }]}>
              {enCoursCount}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'terminee' && styles.tabActive]}
          onPress={() => setTab('terminee')}
        >
          <Text style={[styles.tabText, tab === 'terminee' && styles.tabTextActive]}>Terminées</Text>
          <View style={[styles.tabBadge, { backgroundColor: tab === 'terminee' ? Colors.primary : Colors.separator }]}>
            <Text style={[styles.tabBadgeText, { color: tab === 'terminee' ? Colors.textOnDark : Colors.textMuted }]}>
              {termineeCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {tab === 'en_cours' ? 'Aucune commande en cours' : 'Aucune commande terminée'}
            </Text>
          </View>
        ) : (
          filtered.map(o => (
            <OrderCard
              key={o.id}
              order={o}
              onPress={() => navigation.navigate('OrderDetail', { order: o })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary },
  tabBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tabBadgeText: { fontSize: 12, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
});
