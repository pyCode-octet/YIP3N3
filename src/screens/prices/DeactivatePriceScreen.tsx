import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { FishPrice } from '../../lib/supabase';
import { deactivatePrice } from '../../lib/api';

export function DeactivatePriceScreen({ navigation, route }: any) {
  const { price } = route.params as { price: FishPrice };
  const [loading, setLoading] = useState(false);

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await deactivatePrice(price.id);
      Alert.alert('Prix désactivé', `Le prix de ${price.amount.toLocaleString('fr-FR')} FCFA a été désactivé. L'historique des commandes est conservé.`, [
        { text: 'OK', onPress: () => navigation.navigate('PriceList') },
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible de désactiver le prix. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Désactiver un prix</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning-outline" size={36} color={Colors.error} />
          </View>
          <Text style={styles.warningTitle}>Désactiver ce prix ?</Text>
          <View style={styles.priceDisplay}>
            <Text style={styles.priceAmount}>{price.amount.toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <Text style={styles.warningDesc}>
            Ce prix ne sera plus disponible pour les nouvelles commandes.{'\n\n'}
            L'historique des commandes passées à ce tarif sera conservé.
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.green} />
          <Text style={styles.infoText}>Les données historiques ne sont pas supprimées.</Text>
        </View>

        <View style={styles.actions}>
          <Button label="Désactiver" variant="danger" onPress={handleDeactivate} loading={loading} style={styles.btn} />
          <Button label="Annuler" variant="secondary" onPress={() => navigation.goBack()} style={styles.btn} />
        </View>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: 24, gap: 16 },
  warningCard: {
    backgroundColor: Colors.bgCard, borderRadius: 8, padding: 24,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.error + '44',
  },
  warningIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.error + '22', alignItems: 'center', justifyContent: 'center',
  },
  warningTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  priceDisplay: {
    backgroundColor: '#FFF5F5', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10,
  },
  priceAmount: { fontSize: 24, fontWeight: '900', color: Colors.textSecondary },
  warningDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.green + '11', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.green + '33',
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.green, lineHeight: 18 },
  actions: { gap: 10, marginTop: 8 },
  btn: {},
});
