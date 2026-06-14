import { supabase } from './supabase';
import type { FishPrice, Order } from './supabase';

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), profile:profiles!server_id(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((o: any) => ({
    ...o,
    server_name: o.profile?.full_name ?? '',
    profile: undefined,
  }));
}

export async function fetchPrices(): Promise<FishPrice[]> {
  const { data, error } = await supabase
    .from('fish_prices')
    .select('*')
    .order('amount', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createOrder(
  serverId: string,
  reference: string,
  mode: 'sur_place' | 'a_emporter',
  totalAmount: number,
  clientPhone: string | undefined,
  lines: Array<{ fish_price_id: string; quantity: number; unit_price: number; line_total: number; notes?: string; accompaniment_id?: string; with_mayo?: boolean }>
): Promise<Order> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      reference,
      server_id: serverId,
      client_phone: clientPhone || null,
      mode,
      status: 'en_cours',
      total_amount: totalAmount,
    })
    .select()
    .single();
  if (orderErr) throw orderErr;

  const items = lines.map(l => ({ ...l, order_id: order.id }));
  const { data: insertedItems, error: itemsErr } = await supabase
    .from('order_items')
    .insert(items)
    .select();
  if (itemsErr) throw itemsErr;

  return { ...order, items: insertedItems ?? [] };
}

export async function addPrice(amount: number, label: string): Promise<FishPrice> {
  const { data, error } = await supabase
    .from('fish_prices')
    .insert({ amount, label, active: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function editPrice(id: string, amount: number, label: string): Promise<void> {
  const { error } = await supabase
    .from('fish_prices')
    .update({ amount, label })
    .eq('id', id);
  if (error) throw error;
}

export async function markOrderTerminated(id: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'terminee' })
    .eq('id', id);
  if (error) throw error;
}

export async function deactivatePrice(id: string): Promise<void> {
  const { error } = await supabase
    .from('fish_prices')
    .update({ active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchTerminatedOrdersByRange(start: Date, end: Date): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), profile:profiles!server_id(full_name)')
    .eq('status', 'terminee')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((o: any) => ({
    ...o,
    server_name: o.profile?.full_name ?? '',
    profile: undefined,
  }));
}

export function getDateRange(label: string, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (label === "Aujourd'hui") return { start: todayStart, end: todayEnd };
  if (label === 'Semaine passée') {
    const s = new Date(todayStart); s.setDate(s.getDate() - 7);
    return { start: s, end: todayEnd };
  }
  if (label === 'Mois passé') {
    const s = new Date(todayStart); s.setDate(s.getDate() - 30);
    return { start: s, end: todayEnd };
  }
  if (customStart && customEnd) {
    const e = new Date(customEnd); e.setHours(23, 59, 59, 999);
    return { start: customStart, end: e };
  }
  return { start: todayStart, end: todayEnd };
}
