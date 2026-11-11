function summarize(orders, entries) {
  const active = orders.filter(order => order.status !== 'cancelled');
  const production = new Map();
  for (const order of active) {
    if (order.payment_status !== 'paid' || !['confirmed', 'production'].includes(order.status)) continue;
    for (const item of order.order_items || []) production.set(item.product_name, (production.get(item.product_name) || 0) + item.quantity);
  }
  return {
    order_count: active.length,
    ordered_cents: active.reduce((sum, order) => sum + order.total_cents, 0),
    receipt_cents: entries.filter(entry => entry.kind === 'sale_receipt').reduce((sum, entry) => sum + entry.amount_cents, 0),
    expense_cents: entries.filter(entry => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount_cents, 0),
    movement_cents: entries.reduce((sum, entry) => sum + (entry.direction === 'in' ? entry.amount_cents : -entry.amount_cents), 0),
    awaiting_review: active.filter(order => order.payment_status === 'review').length,
    production: [...production].map(([name, quantity]) => ({ name, quantity })),
  };
}
module.exports = { summarize };
