import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { addPrice } from '../../lib/api';

export function AddPriceScreen({ navigation }: any) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const val = parseInt(amount, 10);
    if (!val || val <= 0) { Alert.alert('Erreur', 'Saisis un montant valide.'); return; }
    setLoading(true);
    try {
      await addPrice(val, '');
      Alert.alert('Succès', `Prix de ${val.toLocaleString('fr-FR')} FCFA ajouté.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter le prix. Réessaie.');
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
        <Text style={styles.headerTitle}>Ajouter un prix</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconArea}>
          <View style={styles.iconCircle}>
            <Ionicons name="add-circle-outline" size={36} color={Colors.accent} />
          </View>
        </View>

        <Text style={styles.label}>Montant (FCFA)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Ex: 2500"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            autoFocus
          />
          <Text style={styles.inputSuffix}>FCFA</Text>
        </View>

        {amount ? (
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Aperçu</Text>
            <Text style={styles.previewAmount}>{parseInt(amount || '0', 10).toLocaleString('fr-FR')} FCFA</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button label="Enregistrer" onPress={handleSave} loading={loading} style={styles.btn} />
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
  iconArea: { alignItems: 'center', paddingVertical: 12 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.orangeLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.accent,
  },
  label: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgInput, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, height: 56,
  },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  inputSuffix: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  preview: {
    backgroundColor: Colors.bgCard, borderRadius: 8, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  previewLabel: { fontSize: 12, color: Colors.textMuted },
  previewAmount: { fontSize: 24, fontWeight: '800', color: Colors.accentDark },
  actions: { gap: 10, marginTop: 8 },
  btn: {},
});
