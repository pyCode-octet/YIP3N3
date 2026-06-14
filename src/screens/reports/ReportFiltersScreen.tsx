import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Order } from '../../lib/supabase';
import { ColorPalette } from '../../theme/colors';
import { fetchTerminatedOrdersByRange, getDateRange } from '../../lib/api';

// ── Calendrier ────────────────────────────────────────────────────────────────

const DAYS_ABBR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function CalendarPicker({ visible, onClose, onConfirm }: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (label: string, start: Date, end: Date) => void;
}) {
  const { colors: c } = useTheme();
  const cs = useMemo(() => makeCalStyles(c), [c]);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;

  const goToPrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const goToNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleDay = (day: number) => {
    const d = new Date(year, month, day);
    if (!start || (start && end)) { setStart(d); setEnd(null); }
    else if (d < start) { setStart(d); setEnd(start); }
    else { setEnd(d); }
  };

  const handleConfirm = () => {
    if (!start) return;
    const s = start;
    const e = end ?? start;
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const label = isSameDay(s, e)
      ? s.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : `${fmt(s)} – ${fmt(e)}`;
    onConfirm(label, s, e);
    onClose();
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={cs.overlay}>
        <View style={cs.sheet}>
          <View style={cs.handle} />
          <Text style={cs.sheetTitle}>Sélectionner une période</Text>
          <Text style={cs.sheetSub}>Appuie sur un jour ou sélectionne une plage</Text>

          <View style={cs.nav}>
            <TouchableOpacity onPress={goToPrev} style={cs.navBtn}>
              <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
            </TouchableOpacity>
            <Text style={cs.navTitle}>{MONTHS_FR[month]} {year}</Text>
            <TouchableOpacity onPress={goToNext} style={cs.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={c.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={cs.dayRow}>
            {DAYS_ABBR.map((d, i) => <Text key={i} style={cs.dayLabel}>{d}</Text>)}
          </View>

          <View style={cs.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={cs.cell} />;
              const d = new Date(year, month, day);
              const isStart = !!start && isSameDay(d, start);
              const isEnd = !!end && isSameDay(d, end);
              const inRange = !!(start && end && d > start && d < end);
              const isToday = isSameDay(d, today);
              return (
                <TouchableOpacity
                  key={`d-${day}`}
                  style={[cs.cell, inRange && cs.cellInRange, (isStart || isEnd) && cs.cellSelected]}
                  onPress={() => handleDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    cs.cellText,
                    isToday && cs.todayText,
                    (isStart || isEnd) && cs.selectedText,
                    inRange && cs.inRangeText,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {start ? (
            <View style={cs.rangeRow}>
              <View style={cs.rangePill}>
                <Ionicons name="calendar" size={12} color={c.primary} />
                <Text style={cs.rangeText}>
                  {start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  {end && !isSameDay(start, end)
                    ? ` → ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}` : ''}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={cs.hintText}>Sélectionne un jour de début</Text>
          )}

          <View style={cs.actions}>
            <TouchableOpacity style={cs.cancelBtn} onPress={onClose}>
              <Text style={cs.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.confirmBtn, !start && { opacity: 0.4 }]} onPress={handleConfirm} disabled={!start}>
              <Text style={cs.confirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Écran principal ────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const QUICK_FILTERS = ["Aujourd'hui", 'Semaine passée', 'Mois passé'];

export function ReportFiltersScreen({ navigation }: any) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [periodLabel, setPeriodLabel] = useState("Aujourd'hui");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const range = getDateRange(periodLabel, customStart, customEnd);
    fetchTerminatedOrdersByRange(range.start, range.end)
      .then(setOrders)
      .catch(() => {});
  }, [periodLabel, customStart, customEnd]);

  const caTotal = orders.reduce((s, o) => s + o.total_amount, 0);
  const nbCommandes = orders.length;
  const totalPoissons = orders.reduce(
    (sum, o) => sum + (o.items ?? []).reduce((s, item) => s + item.quantity, 0), 0,
  );

  const last10 = [...orders].slice(0, 10);

  const navParams = () => {
    const range = getDateRange(periodLabel, customStart, customEnd);
    return {
      period: periodLabel,
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
    };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rapports</Text>
        <TouchableOpacity style={styles.periodBtn} onPress={() => setShowDropdown(d => !d)} activeOpacity={0.8}>
          <Text style={styles.periodBtnText}>{periodLabel}</Text>
          <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={13} color={c.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Bannière */}
        <View style={styles.caCard}>
          <View style={styles.decoGreen} />
          <View style={styles.decoOrange} />
          <Text style={styles.caLabel}>Total vente</Text>
          <Text style={styles.caValue}>{caTotal.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={styles.caIntroText}>
            Un historique de vos ventes en fonction de la période sélectionnée.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: c.accent }]}>
            <Ionicons name="receipt-outline" size={38} color={c.accent + '18'} style={styles.statBgIcon} />
            <Text style={styles.statValue}>{nbCommandes}</Text>
            <Text style={styles.statLabel}>Total{'\n'}commandes</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: c.primary }]}>
            <Ionicons name="fish-outline" size={38} color={c.primary + '18'} style={styles.statBgIcon} />
            <Text style={styles.statValue}>{totalPoissons}</Text>
            <Text style={styles.statLabel}>Poissons{'\n'}vendus</Text>
          </View>
        </View>

        <Text style={styles.tableOuterTitle}>Dernières ventes</Text>

        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: 1.5 }]}>Réf</Text>
            <Text style={[styles.thCell, { flex: 1.3 }]}>Lieu</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>Heure</Text>
            <Text style={[styles.thCell, { flex: 1.4, textAlign: 'right' }]}>Montant</Text>
          </View>
          {last10.length === 0 ? (
            <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>
              Aucune vente sur cette période
            </Text>
          ) : last10.map((o, i) => (
            <TouchableOpacity
              key={o.id}
              style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
              onPress={() => navigation.navigate('OrderDetail', { order: o })}
              activeOpacity={0.75}
            >
              <Text style={[styles.tdRef, { flex: 1.5 }]}>{o.reference}</Text>
              <Text style={[styles.tdCell, { flex: 1.3 }]}>{o.mode === 'a_emporter' ? 'Emporter' : 'Sur place'}</Text>
              <Text style={[styles.tdCell, { flex: 1, textAlign: 'center' }]}>{formatTime(o.created_at)}</Text>
              <Text style={[styles.tdAmount, { flex: 1.4, textAlign: 'right' }]}>{o.total_amount.toLocaleString('fr-FR')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.moreBtn} onPress={() => navigation.navigate('ReportSalesDetail', navParams())} activeOpacity={0.85}>
          <Text style={styles.moreBtnText}>Voir plus</Text>
          <Ionicons name="arrow-forward" size={16} color={c.primary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Dropdown période */}
      <Modal visible={showDropdown} transparent animationType="none">
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowDropdown(false)} activeOpacity={1} />
          <View style={styles.dropdown}>
            {QUICK_FILTERS.map(f => (
              <TouchableOpacity key={f} style={styles.dropdownItem} onPress={() => { setCustomStart(undefined); setCustomEnd(undefined); setPeriodLabel(f); setShowDropdown(false); }}>
                <Text style={[styles.dropdownItemText, periodLabel === f && styles.dropdownItemTextActive]}>{f}</Text>
                {periodLabel === f && <Ionicons name="checkmark" size={14} color={c.primary} />}
              </TouchableOpacity>
            ))}
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowDropdown(false); setShowCalendar(true); }}>
              <Ionicons name="calendar-outline" size={14} color={c.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.dropdownItemText}>Personnalisé...</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CalendarPicker
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onConfirm={(label, start, end) => {
          setCustomStart(start);
          setCustomEnd(end);
          setPeriodLabel(label);
        }}
      />
    </View>
  );
}

// ── Style factories ────────────────────────────────────────────────────────────

function makeCalStyles(c: ColorPalette) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.bgCard,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary, marginBottom: 2 },
    sheetSub: { fontSize: 12, color: c.textMuted, marginBottom: 16 },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    navBtn: { padding: 8 },
    navTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    dayRow: { flexDirection: 'row', marginBottom: 4 },
    dayLabel: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '700', color: c.textMuted, paddingVertical: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center' },
    cellInRange: { backgroundColor: c.primaryLight },
    cellSelected: { backgroundColor: c.primary, borderRadius: 20 },
    cellText: { fontSize: 14, color: c.textPrimary, fontWeight: '500' },
    todayText: { color: c.primary, fontWeight: '800' },
    selectedText: { color: '#fff', fontWeight: '800' },
    inRangeText: { color: c.primary, fontWeight: '600' },
    rangeRow: { alignItems: 'center', marginTop: 10 },
    rangePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primaryLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    rangeText: { fontSize: 13, color: c.primary, fontWeight: '700' },
    hintText: { textAlign: 'center', fontSize: 12, color: c.textMuted, marginTop: 10 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
    cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    cancelText: { fontSize: 14, fontWeight: '700', color: c.textSecondary },
    confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center' },
    confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
      backgroundColor: c.bgCard, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
    periodBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.primaryLight, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 7,
      borderWidth: 1, borderColor: c.primary + '40',
    },
    periodBtnText: { fontSize: 13, fontWeight: '700', color: c.primary },
    dropdown: {
      position: 'absolute', top: 105, right: 16,
      backgroundColor: c.bgCard, borderRadius: 12,
      borderWidth: 1, borderColor: c.border,
      minWidth: 200, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
    dropdownItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 13,
    },
    dropdownItemText: { fontSize: 14, fontWeight: '500', color: c.textPrimary },
    dropdownItemTextActive: { color: c.primary, fontWeight: '700' },
    dropdownDivider: { height: 1, backgroundColor: c.separator },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    caCard: {
      backgroundColor: c.bgCard, borderRadius: 16,
      paddingHorizontal: 20, paddingVertical: 28, overflow: 'hidden',
      borderWidth: 1, borderColor: c.border,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    decoGreen: { position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: c.primary + '22' },
    decoOrange: { position: 'absolute', left: -20, bottom: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: c.accent + '20' },
    caLabel: { fontSize: 11, color: c.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
    caValue: { fontSize: 32, fontWeight: '900', color: c.textPrimary, marginTop: 4, marginBottom: 10 },
    caIntroText: { fontSize: 12, color: c.textSecondary, lineHeight: 17, fontStyle: 'italic', maxWidth: '80%' },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: {
      flex: 1, backgroundColor: c.bgCard, borderRadius: 14,
      paddingVertical: 10, paddingHorizontal: 12,
      borderWidth: 1, borderColor: c.border,
      borderTopWidth: 3, overflow: 'hidden', gap: 2,
    },
    statBgIcon: { position: 'absolute', right: 8, bottom: 6 },
    statValue: { fontSize: 24, fontWeight: '900', color: c.textPrimary },
    statLabel: { fontSize: 11, color: c.textMuted, fontWeight: '600', lineHeight: 15 },
    tableOuterTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary, marginBottom: -8 },
    tableCard: { backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: c.bg, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    thCell: { fontSize: 10, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9 },
    tableRowAlt: { backgroundColor: c.bgCardLight },
    tdRef: { fontSize: 12, fontWeight: '800', color: c.textPrimary, letterSpacing: 0.5 },
    tdCell: { fontSize: 11, color: c.textSecondary },
    tdAmount: { fontSize: 12, fontWeight: '700', color: c.primary },
    moreBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 14,
      backgroundColor: c.bgCard, borderRadius: 12,
      borderWidth: 1.5, borderColor: c.primary,
    },
    moreBtnText: { fontSize: 15, fontWeight: '700', color: c.primary },
  });
}
