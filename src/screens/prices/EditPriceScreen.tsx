import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { FishPrice } from '../../lib/supabase';
import { editPrice } from '../../lib/api';

export function EditPriceScreen({ navigation, route }: any) {
  const { price } = route.params as { price: FishPrice };
  const [amount, setAmount] = useState(price.amount.toString());
  const [active, setActive] = useState(price.active);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const val = parseInt(amount, 10);
    if (!val || val <= 0) { Alert.alert('Erreur', 'Saisis un montant valide.'); return; }
    setLoading(true);
    try {
      await editPrice(price.id, val, price.label ?? '');
      Alert.alert('Succès', `Prix mis à jour : ${val.toLocaleString('fr-FR')} FCFA`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible de modifier le prix. Réessaie.');
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
        <Text style={styles.headerTitle}>Modifier un prix</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.oldPrice}>
          <Text style={styles.oldLabel}>Prix actuel</Text>
          <Text style={styles.oldAmount}>{price.amount.toLocaleString('fr-FR')} FCFA</Text>
        </View>

        <Ionicons name="arrow-down" size={20} color={Colors.textMuted} style={styles.arrow} />

        <Text style={styles.label}>Nouveau montant (FCFA)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            autoFocus
          />
          <Text style={styles.inputSuffix}>FCFA</Text>
        </View>

        <View style={styles.warning}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
          <Text style={styles.warningText}>
            Ce changement s'applique uniquement aux nouvelles commandes. Les commandes existantes conservent leur prix.
          </Text>
        </View>

        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>Statut</Text>
            <Text style={styles.statusValue}>{active ? 'Actif' : 'Desactive'}</Text>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.textOnDark}
          />
        </View>

        <View style={styles.actions}>
          <Button label="Enregistrer" onPress={handleSave} loading={loading} style={styles.btn} />
          <Button label="Supprimer ce prix" variant="danger" onPress={() => navigation.navigate('DeactivatePrice', { price })} style={styles.btn} />
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
  oldPrice: {
    backgroundColor: Colors.bgCard, borderRadius: 8, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  oldLabel: { fontSize: 12, color: Colors.textMuted },
  oldAmount: { fontSize: 22, fontWeight: '800', color: Colors.textSecondary },
  arrow: { alignSelf: 'center' },
  label: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgInput, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.primary,
    paddingHorizontal: 16, height: 56,
  },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  inputSuffix: { fontSize: 16, color: Colors.textSecondary },
  warning: {
    flexDirection: 'row', gap: 8, backgroundColor: Colors.warning + '11',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.warning + '33', alignItems: 'flex-start',
  },
  warningText: { flex: 1, fontSize: 12, color: Colors.warning, lineHeight: 18 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  statusLabel: { fontSize: 13, color: Colors.textSecondary },
  statusValue: { fontSize: 15, color: Colors.textPrimary, fontWeight: '700', marginTop: 2 },
  actions: { gap: 10, marginTop: 8 },
  btn: {},
});
