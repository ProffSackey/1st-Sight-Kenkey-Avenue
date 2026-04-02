"use client";
import React, { useEffect, useState } from 'react';
import { useCashierContext } from '../cashier-context';
import { supabase } from '@/lib/supabase';

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
  items?: { name?: string };
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
  customerName: string;
  notes: string;
  quantity: number;
}

export default function CashierOrderHistoryPage() {
  const { fullName, branch } = useCashierContext();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.error('Error fetching orders: missing access token');
          setOrders([]);
          setTotalOrders(0);
          setTotalRevenue(0);
          return;
        }

        const response = await fetch('/api/cashier/orders', {
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
          console.error('Error fetching orders:', {
            status: response.status,
            statusText: response.statusText,
            body: payload,
          });
          setOrders([]);
          setTotalOrders(0);
          setTotalRevenue(0);
          return;
        }

        const rawOrders = ((payload as OrdersApiResponse | null)?.orders || []) as RawOrder[];

        const cashierIds = [...new Set(rawOrders.map((o) => o.cashier_id).filter(notEmpty))] as string[];
        const itemIds = [...new Set(rawOrders.flatMap((o) => (o.order_items || []).map((item) => item.item_id)).filter(notEmpty))] as string[];

        const { data: cashiers } = cashierIds.length > 0
          ? await supabase.from('employees').select('id, full_name, email').in('id', cashierIds)
          : { data: [] as Employee[] };

        const { data: branchesData } = await supabase
          .from('branches')
          .select('id, name');

        const { data: items } = itemIds.length > 0
          ? await supabase.from('items').select('id, name').in('id', itemIds)
          : { data: [] as ItemRecord[] };

        const cashierMap: Record<string, Employee> = {};
        (cashiers || []).forEach((cashier) => {
          if (cashier?.id) cashierMap[cashier.id] = cashier;
        });

        const branchMap: Record<string, string> = {};
        (branchesData || []).forEach((branchRecord) => {
          if (branchRecord?.id) branchMap[branchRecord.id] = branchRecord.name || branchRecord.id;
        });

        const itemMap: Record<string, ItemRecord> = {};
        (items || []).forEach((item) => {
          if (item?.id) itemMap[item.id] = item;
        });

        const transformedOrders: Order[] = rawOrders.map((order) => {
          const orderItems: OrderItem[] = (order.order_items || []).map((oi) => ({
            name: itemMap[oi.item_id]?.name || oi.items?.name || oi.item?.name || oi.item_id || 'Unknown Item',
            quantity: oi.quantity_sold ?? 0,
            price: oi.quantity_sold > 0 ? (oi.line_total ?? 0) / oi.quantity_sold : 0,
          }));

          return {
            id: order.id,
            branchId: order.branch_id,
            branchName: order.branch?.name || branchMap[order.branch_id] || branch || order.branch_id || 'Unknown branch',
            amount: order.final_amount ?? order.total_amount ?? 0,
            paymentMethod: order.payment_method || 'Unknown',
            items: orderItems,
            orderedAt: order.order_date,
            orderedTime: order.order_time,
            cashierName: cashierMap[order.cashier_id ?? '']?.full_name || fullName || 'Unknown',
            cashierEmail: cashierMap[order.cashier_id ?? '']?.email || 'unknown@example.com',
            customerName: 'Walk-in',
            notes: order.notes || '',
            quantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
          };
        });

        setOrders(transformedOrders);
        setTotalOrders(transformedOrders.length);
        setTotalRevenue(transformedOrders.reduce((sum, order) => sum + order.amount, 0));
      } catch (error) {
        console.error('Error fetching orders:', error instanceof Error ? error.message : String(error), error);
        setOrders([]);
        setTotalOrders(0);
        setTotalRevenue(0);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [branch, fullName]);

  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.orderedAt);

    const orderIdMatches = filterOrderId ? order.id.toLowerCase().includes(filterOrderId.toLowerCase()) : true;
    const paymentMatches = filterPaymentMethod ? order.paymentMethod.toLowerCase() === filterPaymentMethod.toLowerCase() : true;

    let dateMatches = true;
    if (filterDateFrom) dateMatches = dateMatches && orderDate >= new Date(filterDateFrom);
    if (filterDateTo) dateMatches = dateMatches && orderDate <= new Date(filterDateTo);

    return orderIdMatches && paymentMatches && dateMatches;
  });

  const filteredTotalOrders = filteredOrders.length;
  const filteredTotalRevenue = filteredOrders.reduce((sum, order) => sum + order.amount, 0);

  const isFilterActive = Boolean(
    filterOrderId ||
    filterPaymentMethod ||
    filterDateFrom ||
    filterDateTo
  );

  const displayedTotalOrders = isFilterActive ? filteredTotalOrders : totalOrders;
  const displayedTotalRevenue = isFilterActive ? filteredTotalRevenue : totalRevenue;

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
              <div class="meta-row"><span class="label">Customer</span><span>${escapeHtml(order.customerName || 'Walk-in')}</span></div>
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
    if (!printWindow?.document) {
      console.error('Unable to open print window');
      return;
    }

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center">Loading cashier order history...</main>;
  }

  return (
    <>
      <div className="flex h-[calc(100vh-80px)]">
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="text-2xl font-bold mb-4">Cashier Order History</h1>

            <div className="mb-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex min-w-max items-end gap-2">
                <div className="flex-shrink-0 w-48">
                  <label className="block text-xs font-medium text-slate-500">Order ID</label>
                  <input type="text" value={filterOrderId} onChange={(e) => setFilterOrderId(e.target.value)} placeholder="Search order ID" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div className="flex-shrink-0 w-44">
                  <label className="block text-xs font-medium text-slate-500">Payment Method</label>
                  <select value={filterPaymentMethod} onChange={(e) => setFilterPaymentMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                    <option value="">All</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="flex-shrink-0 w-40">
                  <label className="block text-xs font-medium text-slate-500">Date from</label>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div className="flex-shrink-0 w-40">
                  <label className="block text-xs font-medium text-slate-500">Date to</label>
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Total Orders {isFilterActive ? '(Filtered)' : '(All time)'}
                </p>
                <p className="mt-1 text-2xl font-semibold text-indigo-700">{displayedTotalOrders}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Total Revenue {isFilterActive ? '(Filtered)' : '(All time)'}
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">{formatCurrency(displayedTotalRevenue)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Orders (Filtered)</p>
                <p className="mt-1 text-2xl font-semibold text-teal-700">{filteredTotalOrders}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Revenue (Filtered)</p>
                <p className="mt-1 text-2xl font-semibold text-orange-600">{formatCurrency(filteredTotalRevenue)}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full table-fixed text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Date / Time</th>
                    <th className="px-3 py-2 text-left">Order ID</th>
                    <th className="px-3 py-2 text-left">Branch</th>
                    <th className="px-3 py-2 text-left">Cashier</th>
                    <th className="px-3 py-2 text-left">Items</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Payment</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">{order.orderedAt} {order.orderedTime}</td>
                      <td className="px-3 py-2">{order.id}</td>
                      <td className="px-3 py-2">{order.branchName || order.branchId}</td>
                      <td className="px-3 py-2">{order.cashierName}</td>
                      <td className="px-3 py-2">
                        {order.items.map((item, idx) => (
                          <p key={`${order.id}-${item.name}-${idx}`} className="truncate" title={`${item.name} x ${item.quantity}`}>
                            {item.name} x {item.quantity}
                          </p>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-right">{order.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(order.amount)}</td>
                      <td className="px-3 py-2">{order.paymentMethod}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(order)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                          title="Print receipt"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7m-3 11h-6a2 2 0 0 1-2-2v-7h10v7a2 2 0 0 1-2 2zm-3-3h.01" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredOrders.length && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">No orders match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
