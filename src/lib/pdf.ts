import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Order } from './supabase';

function buildReceiptHtml(order: Order): string {
  const date = new Date(order.created_at).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const rows = (order.items ?? []).map(item => `
    <tr>
      <td>Poisson ${item.unit_price.toLocaleString('fr-FR')} FCFA</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${item.line_total.toLocaleString('fr-FR')} FCFA</td>
    </tr>
    ${item.notes ? `<tr><td colspan="3" style="font-size:10px;color:#888;padding-top:0">${item.notes}</td></tr>` : ''}
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Courier New', monospace; max-width: 320px; margin: 0 auto; padding: 24px 16px; }
    .brand { font-size: 24px; font-weight: 900; text-align: center; color: #1B7B4B; margin-bottom: 4px; }
    .brand span { color: #F97316; }
    .center { text-align: center; }
    .dash { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
    .ref { font-size: 20px; font-weight: 900; text-align: center; letter-spacing: 3px; margin: 6px 0; }
    .meta { font-size: 11px; color: #666; text-align: center; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { font-size: 10px; text-transform: uppercase; color: #888; padding: 4px 0; border-bottom: 1px dashed #ccc; }
    td { padding: 5px 0; vertical-align: top; }
    .total-row { font-size: 16px; font-weight: 900; }
    .total-val { text-align: right; color: #1B7B4B; }
    .info { font-size: 11px; color: #666; margin-top: 4px; }
    .merci { text-align: center; font-size: 13px; font-weight: 700; margin-top: 8px; }
  </style></head><body>
  <div class="brand">YIP<span>&#x25BA;</span>N<span>&#x25BA;</span></div>
  <p class="meta">Ticket de caisse</p>
  <hr class="dash">
  <p class="ref">${order.reference}</p>
  <p class="meta">${date}</p>
  <hr class="dash">
  <table>
    <thead><tr><th style="text-align:left">Produit</th><th style="text-align:center">Qté</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <hr class="dash">
  <table><tr class="total-row"><td>TOTAL</td><td class="total-val" colspan="2">${order.total_amount.toLocaleString('fr-FR')} FCFA</td></tr></table>
  <hr class="dash">
  <p class="info">Mode : ${order.mode === 'a_emporter' ? 'À emporter' : 'Sur place'}</p>
  ${order.client_phone ? `<p class="info">Tél : ${order.client_phone}</p>` : ''}
  <hr class="dash">
  <p class="merci">Merci et à bientôt !</p>
</body></html>`;
}

export async function exportReceiptPdf(order: Order): Promise<void> {
  const html = buildReceiptHtml(order);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Envoyer le reçu',
    UTI: 'com.adobe.pdf',
  });
}

export async function printReceipt(order: Order): Promise<void> {
  const html = buildReceiptHtml(order);
  await Print.printAsync({ html });
}

export async function exportSalesReportPdf(orders: Order[], periodLabel: string): Promise<void> {
  const allItems = orders.flatMap(o => o.items ?? []);
  const total    = orders.reduce((s, o) => s + o.total_amount, 0);
  const totalQty = allItems.reduce((s, i) => s + i.quantity, 0);

  // Breakdown computation
  const fishMap  = new Map<number, number>();
  const sideMap  = new Map<string, number>();
  let withMayo = 0, withoutMayo = 0;
  for (const it of allItems) {
    fishMap.set(it.unit_price, (fishMap.get(it.unit_price) ?? 0) + it.quantity);
    for (const p of (it.accompaniment_id ?? '').split('+').filter(s => s && s !== 'none'))
      sideMap.set(p, (sideMap.get(p) ?? 0) + it.quantity);
    if (it.with_mayo) withMayo += it.quantity;
    else withoutMayo += it.quantity;
  }
  const SIDE_PDF: Record<string, string> = {
    attieke_s: '500 FCFA', attieke_m: '1 000 FCFA', attieke_l: '1 500 FCFA',
    frites_m: '1 000 FCFA', frites_l: '1 500 FCFA',
  };
  const fishEntries    = Array.from(fishMap.entries()).sort((a, b) => a[0] - b[0]);
  const attiekeEntries = Array.from(sideMap.entries()).filter(([k]) => k.startsWith('attieke')).sort();
  const fritesEntries  = Array.from(sideMap.entries()).filter(([k]) => k.startsWith('frites')).sort();
  const maxFish    = Math.max(1, ...fishEntries.map(([, v]) => v));
  const maxAttieke = Math.max(1, ...attiekeEntries.map(([, v]) => v));
  const maxFrites  = Math.max(1, ...fritesEntries.map(([, v]) => v));
  const totalMayo  = withMayo + withoutMayo;

  const mkRows = (entries: Array<[string, number]>, max: number, color: string, labelFn: (k: string) => string) =>
    entries.map(([k, qty]) => `
      <tr>
        <td class="bd-label">${labelFn(k)}</td>
        <td class="bd-bar-cell"><div class="bd-bar-bg"><div class="bd-bar-fill" style="width:${Math.round(qty / max * 100)}%;background:${color}"></div></div></td>
        <td class="bd-qty">${qty}</td>
      </tr>`).join('');

  const breakdownHtml = `
  <div class="breakdown">
    <div class="breakdown-title">Détail des ventes</div>
    ${fishEntries.length > 0 ? `
    <div class="bd-block">
      <div class="bd-head">Poissons vendus par prix</div>
      <table class="bd-tbl">${mkRows(
        fishEntries.map(([k, v]) => [String(k), v]),
        maxFish, '#1B7B4B',
        k => `${Number(k).toLocaleString('fr-FR')} FCFA`
      )}</table>
    </div>` : ''}
    ${attiekeEntries.length > 0 ? `
    <div class="bd-block">
      <div class="bd-head">Attièké</div>
      <table class="bd-tbl">${mkRows(attiekeEntries, maxAttieke, '#16a34a', k => SIDE_PDF[k] ?? k)}</table>
    </div>` : ''}
    ${fritesEntries.length > 0 ? `
    <div class="bd-block">
      <div class="bd-head">Frites</div>
      <table class="bd-tbl">${mkRows(fritesEntries, maxFrites, '#ea580c', k => SIDE_PDF[k] ?? k)}</table>
    </div>` : ''}
    ${totalMayo > 0 ? `
    <div class="bd-block">
      <div class="bd-head">Mayo</div>
      <table class="bd-tbl">
        <tr>
          <td class="bd-label">Avec mayo</td>
          <td class="bd-bar-cell"><div class="bd-bar-bg"><div class="bd-bar-fill" style="width:${Math.round(withMayo / totalMayo * 100)}%;background:#1B7B4B"></div></div></td>
          <td class="bd-qty">${withMayo}</td>
        </tr>
        <tr>
          <td class="bd-label">Sans mayo</td>
          <td class="bd-bar-cell"><div class="bd-bar-bg"><div class="bd-bar-fill" style="width:${Math.round(withoutMayo / totalMayo * 100)}%;background:#888"></div></div></td>
          <td class="bd-qty">${withoutMayo}</td>
        </tr>
      </table>
    </div>` : ''}
  </div>`;

  const rows = orders.map(o => {
    const qty = (o.items ?? []).reduce((s, i) => s + i.quantity, 0);
    const date = new Date(o.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    return `
      <tr>
        <td>${date}</td>
        <td style="font-weight:700;letter-spacing:1px">${o.reference}</td>
        <td>${o.server_name ?? ''}</td>
        <td style="text-align:center">${o.mode === 'a_emporter' ? 'Emporter' : 'Sur place'}</td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:right;font-weight:700">${o.total_amount.toLocaleString('fr-FR')} FCFA</td>
      </tr>`;
  }).join('');

  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; font-size: 13px; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .brand { font-size: 26px; font-weight: 900; color: #1B7B4B; }
    .brand span { color: #F97316; }
    .meta { text-align: right; color: #888; font-size: 11px; line-height: 1.6; }
    h2 { font-size: 16px; color: #1a1a1a; margin-bottom: 4px; }
    .period { color: #1B7B4B; font-weight: 700; font-size: 13px; margin-bottom: 24px; }
    .stats { display: flex; gap: 12px; margin-bottom: 28px; }
    .stat { flex: 1; background: #f4faf7; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #1B7B4B; }
    .stat-value { font-size: 20px; font-weight: 900; color: #1B7B4B; }
    .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #1B7B4B; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #eee; vertical-align: middle; }
    tbody tr:nth-child(even) td { background: #f9fdf9; }
    .total-row td { font-weight: 900; font-size: 14px; border-top: 2px solid #1B7B4B; background: #edf7f1; padding: 12px; }
    .footer { margin-top: 32px; font-size: 10px; color: #bbb; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
    .breakdown { margin-top: 36px; }
    .breakdown-title { font-size: 15px; font-weight: 900; color: #1a1a1a; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #1B7B4B; }
    .bd-block { margin-bottom: 20px; page-break-inside: avoid; }
    .bd-head { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; }
    .bd-tbl { width: 100%; border-collapse: collapse; }
    .bd-tbl td { padding: 5px 0; vertical-align: middle; }
    .bd-label { width: 150px; font-size: 13px; color: #1a1a1a; }
    .bd-bar-cell { padding: 0 12px; }
    .bd-bar-bg { width: 100%; background: #eee; border-radius: 4px; height: 8px; }
    .bd-bar-fill { height: 8px; border-radius: 4px; min-width: 4px; }
    .bd-qty { width: 40px; text-align: right; font-weight: 900; font-size: 14px; color: #1a1a1a; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand">YIP<span>&#x25BA;</span>N<span>&#x25BA;</span></div>
      <h2>Rapport des ventes</h2>
    </div>
    <div class="meta">
      <div>${generatedAt}</div>
      <div>${orders.length} commande${orders.length > 1 ? 's' : ''} terminée${orders.length > 1 ? 's' : ''}</div>
    </div>
  </div>
  <div class="period">Période : ${periodLabel}</div>
  <div class="stats">
    <div class="stat">
      <div class="stat-value">${total.toLocaleString('fr-FR')} FCFA</div>
      <div class="stat-label">Total des ventes</div>
    </div>
    <div class="stat">
      <div class="stat-value">${orders.length}</div>
      <div class="stat-label">Commandes</div>
    </div>
    <div class="stat">
      <div class="stat-value">${totalQty}</div>
      <div class="stat-label">Poissons vendus</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Référence</th>
        <th>Serveur</th>
        <th style="text-align:center">Mode</th>
        <th style="text-align:center">Qté</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="5">TOTAL GÉNÉRAL</td>
        <td style="text-align:right">${total.toLocaleString('fr-FR')} FCFA</td>
      </tr>
    </tbody>
  </table>
  ${breakdownHtml}
  <p class="footer">YIPƐNƐ &mdash; Rapport généré automatiquement &mdash; ${generatedAt}</p>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Exporter le rapport PDF',
    UTI: 'com.adobe.pdf',
  });
}
