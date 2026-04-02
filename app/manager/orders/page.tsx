'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ManagerShell } from '../_components/manager-shell';
import { useManagerAuthGuard } from '../_components/use-manager-auth-guard';

const notEmpty = <T,>(value: T | null | undefined): value is T => value !== null && value !== undefined;
const RECEIPT_TITLE = '1ST SIGHT KENKEY AVENUE';
const RECEIPT_SUBTITLE = 'SALES RECEIPT';
const RECEIPT_FOOTER = 'Thank you for choosing us';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    currencyDisplay: 'symbol',
  }).format(amount);
};

interface RawOrderItem {
  item_id: string;
  quantity_sold: number;
  line_total: number;
  item?: { name?: string };
}

interface RawOrder {
  id: string;
  branch_id: string;
  branch?: { id?: string; name?: string };
  final_amount: number;
  payment_method: string;
  order_date: string;
  order_time: string;
  total_amount: number;
  notes?: string;
  cashier_id?: string;
  cashier?: { id?: string | null; full_name?: string | null; email?: string | null };
  order_items: RawOrderItem[];
}

interface OrdersApiResponse {
  orders: RawOrder[];
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

interface ItemRecord {
  id: string;
  name: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  branchId: string;
  branchName: string;
  amount: number;
  paymentMethod: string;
  items: OrderItem[];
  orderedAt: string;
  orderedTime: string;
  cashierName: string;
  cashierEmail: string;
  notes: string;
  quantity: number;
}

export default function ManagerOrdersPage() {
  const { email, fullName, branch, isLoading: authLoading } = useManagerAuthGuard('Loading manager orders...');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterCashier, setFilterCashier] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    if (!branch) {
      return;
    }

    async function fetchOrders() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.error('Error fetching manager orders: missing access token');
          setOrders([]);
          return;
        }

        const response = await fetch('/api/admin/orders', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let payload: OrdersApiResponse | { error?: string; details?: string } | null = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          console.error('Error fetching manager orders:', {
            status: response.status,
            statusText: response.statusText,
            body: payload,
          });
          setOrders([]);
          return;
        }

        const rawOrders = ((payload as OrdersApiResponse | null)?.orders || []) as RawOrder[];
        const cashierIds = [...new Set(rawOrders.map((o) => o.cashier_id).filter(notEmpty))] as string[];
        const itemIds = [...new Set(rawOrders.flatMap((o) => (o.order_items || []).map((item) => item.item_id)).filter(notEmpty))] as string[];

        const { data: cashiers } = cashierIds.length > 0
          ? await supabase.from('employees').select('id, full_name, email').in('id', cashierIds)
          : { data: [] as Employee[] };

        const { data: items } = itemIds.length > 0
          ? await supabase.from('items').select('id, name').in('id', itemIds)
          : { data: [] as ItemRecord[] };

        const cashierMap: Record<string, Employee> = {};
        (cashiers || []).forEach((cashier) => {
          if (cashier?.id) cashierMap[cashier.id] = cashier;
        });

        const itemMap: Record<string, ItemRecord> = {};
        (items || []).forEach((item) => {
          if (item?.id) itemMap[item.id] = item;
        });

        const transformedOrders: Order[] = rawOrders.map((order) => {
          const orderItems: OrderItem[] = (order.order_items || []).map((oi) => ({
            name: itemMap[oi.item_id]?.name || oi.item?.name || oi.item_id || 'Unknown Item',
            quantity: oi.quantity_sold ?? 0,
            price: oi.quantity_sold > 0 ? (oi.line_total ?? 0) / oi.quantity_sold : 0,
          }));

          return {
            id: order.id,
            branchId: order.branch_id,
            branchName: order.branch?.name || branch,
            amount: order.final_amount ?? order.total_amount ?? 0,
            paymentMethod: order.payment_method || 'Unknown',
            items: orderItems,
            orderedAt: order.order_date,
            orderedTime: order.order_time,
            cashierName: cashierMap[order.cashier_id ?? '']?.full_name || order.cashier?.full_name || 'Unknown',
            cashierEmail: cashierMap[order.cashier_id ?? '']?.email || order.cashier?.email || 'unknown@example.com',
            notes: order.notes || '',
            quantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
          };
        });

        setOrders(transformedOrders);
      } catch (error) {
        console.error('Error fetching manager orders:', error instanceof Error ? error.message : String(error), error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [branch]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.orderedAt);
      const orderIdMatches = filterOrderId ? order.id.toLowerCase().includes(filterOrderId.toLowerCase()) : true;
      const cashierMatches = filterCashier ? order.cashierName.toLowerCase().includes(filterCashier.toLowerCase()) : true;
      const paymentMatches = filterPaymentMethod ? order.paymentMethod.toLowerCase() === filterPaymentMethod.toLowerCase() : true;

      let dateMatches = true;
      if (filterDateFrom) dateMatches = dateMatches && orderDate >= new Date(filterDateFrom);
      if (filterDateTo) dateMatches = dateMatches && orderDate <= new Date(filterDateTo);

      return orderIdMatches && cashierMatches && paymentMatches && dateMatches;
    });
  }, [orders, filterOrderId, filterCashier, filterPaymentMethod, filterDateFrom, filterDateTo]);

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.amount, 0);

  const handlePrintReceipt = (order: Order) => {
    if (typeof window === 'undefined') return;

    const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const discount = Math.max(subtotal - order.amount, 0);

    const rows = order.items
      .map((item) => {
        const lineTotal = item.quantity * item.price;
        return `
          <tr>
            <td class="item-name">${escapeHtml(item.name)}</td>
            <td class="right">${item.quantity}</td>
            <td class="right">${formatCurrency(item.price)}</td>
            <td class="right">${formatCurrency(lineTotal)}</td>
          </tr>`;
      })
      .join('');

    const receiptHtml = `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>POS Receipt</title>
          <style>
            @page { size: 58mm auto; margin: 2mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #0f172a;
              font-family: "Segoe UI", Arial, sans-serif;
              font-size: 11px;
              line-height: 1.3;
            }
            .receipt { width: 54mm; margin: 0 auto; }
            .center { text-align: center; }
            .title { margin: 0; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; }
            .subtitle { margin: 3px 0 0; font-size: 10px; letter-spacing: 0.12em; color: #334155; }
            .pill {
              display: inline-block;
              margin-top: 6px;
              border: 1px solid #0f172a;
              border-radius: 999px;
              padding: 2px 8px;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 0.06em;
            }
            .divider { border-top: 1px dashed #475569; margin: 8px 0; }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px 8px;
              font-size: 10px;
            }
            .meta-row { display: flex; justify-content: space-between; gap: 8px; }
            .muted { color: #475569; }
            .label { font-weight: 600; color: #334155; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              font-size: 10px;
            }
            th, td { padding: 4px 0; vertical-align: top; }
            th {
              border-bottom: 1px solid #0f172a;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.04em;
              color: #334155;
              text-align: left;
            }
            td { border-bottom: 1px dashed #94a3b8; }
            .item-name { max-width: 18mm; word-break: break-word; padding-right: 3px; }
            .right { text-align: right; }
            .totals { margin-top: 8px; font-size: 10px; }
            .totals .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .totals .grand {
              margin-top: 6px;
              padding-top: 6px;
              border-top: 1px solid #0f172a;
              font-size: 12px;
              font-weight: 800;
            }
            .footer { margin-top: 10px; text-align: center; font-size: 9px; color: #475569; }
            .footer strong { display: block; color: #0f172a; margin-bottom: 2px; letter-spacing: 0.03em; }
          </style>
        </head>
        <body>
          <section class="receipt">
            <div class="center">
              <p class="title">${RECEIPT_TITLE}</p>
              <p class="subtitle">${RECEIPT_SUBTITLE}</p>
              <span class="pill">${escapeHtml(order.paymentMethod || 'Unknown')}</span>
            </div>
            <div class="divider"></div>

            <div class="meta-grid">
              <div class="meta-row"><span class="label">Order</span><span>${escapeHtml(order.id)}</span></div>
              <div class="meta-row"><span class="label">Branch</span><span>${escapeHtml(order.branchName || order.branchId)}</span></div>
              <div class="meta-row"><span class="label">Date</span><span>${escapeHtml(order.orderedAt)}</span></div>
              <div class="meta-row"><span class="label">Time</span><span>${escapeHtml(order.orderedTime)}</span></div>
              <div class="meta-row"><span class="label">Cashier</span><span>${escapeHtml(order.cashierName)}</span></div>
              <div class="meta-row"><span class="label">Customer</span><span>Walk-in</span></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="right">Qty</th>
                  <th class="right">Unit</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="4" class="muted">No line items available</td></tr>'}
              </tbody>
            </table>

            <div class="totals">
              <div class="row"><span class="label">Items</span><span>${totalQty}</span></div>
              <div class="row"><span class="label">Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
              ${discount > 0 ? `<div class="row"><span class="label">Discount</span><span>- ${formatCurrency(discount)}</span></div>` : ''}
              <div class="row grand"><span>TOTAL</span><span>${formatCurrency(order.amount)}</span></div>
            </div>

            ${order.notes ? `<div class="divider"></div><div class="muted">Note: ${escapeHtml(order.notes)}</div>` : ''}

            <div class="footer">
              <strong>${RECEIPT_FOOTER}</strong>
              <span>Powered by 1st Sight POS</span>
            </div>
          </section>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'width=420,height=820');
    if (!printWindow?.document) return;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 200);
  };

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center">Loading manager orders...</main>;
  }

  return (
    <ManagerShell email={email} fullName={fullName} branch={branch}>
      <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-600">Branch Orders</p>
              <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
              <p className="text-sm text-slate-500">Showing sales activity for {branch} only.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-slate-100 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Orders</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{totalOrders}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Revenue</p>
                <p className="mt-1 text-lg font-semibold text-emerald-900">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex min-w-max items-end gap-4">
            <label className="flex w-36 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Order ID
              <input
                type="text"
                value={filterOrderId}
                onChange={(event) => setFilterOrderId(event.target.value)}
                placeholder="Search order ID"
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="flex w-32 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Cashier
              <input
                type="text"
                value={filterCashier}
                onChange={(event) => setFilterCashier(event.target.value)}
                placeholder="Filter by cashier"
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="flex w-32 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Payment Method
              <select
                value={filterPaymentMethod}
                onChange={(event) => setFilterPaymentMethod(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="">All</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cheque">Cheque</option>
              </select>
            </label>

            <label className="flex w-32 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Date from
              <input
                type="date"
                value={filterDateFrom}
                onChange={(event) => setFilterDateFrom(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="flex w-28 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Date to
              <input
                type="date"
                value={filterDateTo}
                onChange={(event) => setFilterDateTo(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] table-fixed text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date / Time</th>
                  <th className="px-4 py-3 text-left">Order ID</th>
                  <th className="px-4 py-3 text-left">Cashier</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{order.orderedAt} {order.orderedTime}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{order.id}</td>
                    <td className="px-4 py-3">
                      <p>{order.cashierName}</p>
                      <p className="text-xs text-slate-400">{order.cashierEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      {order.items.map((item, index) => (
                        <p key={`${order.id}-${item.name}-${index}`} className="truncate" title={`${item.name} x ${item.quantity}`}>
                          {item.name} x {item.quantity}
                        </p>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right">{order.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(order.amount)}</td>
                    <td className="px-4 py-3">{order.paymentMethod}</td>
                    <td className="px-4 py-3 text-slate-500">{order.notes || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(order)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        title="Print receipt"
                        aria-label={`Print receipt for order ${order.id}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9V2h12v7" />
                          <path d="M18 22H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2Z" />
                          <path d="M8 16h8" />
                          <path d="M8 12h8" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredOrders.length && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                      No orders match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </ManagerShell>
  );
}
