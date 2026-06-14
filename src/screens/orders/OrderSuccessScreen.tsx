import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { Order } from '../../lib/supabase';

export function OrderSuccessScreen({ navigation, route }: any) {
  const { order } = route.params as { order: Order };
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={52} color={Colors.textOnDark} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Commande terminée !</Text>
        <Text style={styles.subtitle}>La commande a été marquée comme terminée avec succès.</Text>

        <View style={styles.refCard}>
          <Text style={styles.refLabel}>Référence</Text>
          <Text style={styles.refCode}>{order.reference}</Text>
          <Text style={styles.refTotal}>{order.total_amount.toLocaleString('fr-FR')} FCFA</Text>
        </View>

        <View style={styles.buttons}>
          <Button
            label="Voir le reçu"
            onPress={() => navigation.navigate('Receipt', { order })}
            style={styles.btn}
          />
          <Button
            label="Retour au Dashboard"
            variant="secondary"
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'Tabs', params: { screen: 'Dashboard' } }],
            })}
            style={styles.btn}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconWrap: { marginBottom: 32 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center',
  },
  content: { width: '100%', alignItems: 'center', gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  refCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border,
    width: '100%', marginTop: 8,
  },
  refLabel: { fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  refCode: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 3 },
  refTotal: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  buttons: { width: '100%', gap: 10, marginTop: 16 },
  btn: {},
});
