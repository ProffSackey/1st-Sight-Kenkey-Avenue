
"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface RawOrderItem {
  item_id: string;
  quantity_sold: number;
  line_total: number;
  item?: { name?: string };
}

interface RawOrder {
  id: string;
  branch_id: string;
  final_amount: number;
  payment_method: string;
  order_date: string;
  order_time: string;
  total_amount: number;
  discount_applied?: number;
  notes?: string;
  cashier_id?: string;
  branch?: { id?: string; name?: string };
  cashier?: { id?: string | null; full_name?: string | null; email?: string | null };
  order_items: RawOrderItem[];
}

// Assuming these utilities exist
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    currencyDisplay: 'symbol',
  }).format(amount);
};

const getOrderDateKey = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')}`;
};

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  branchId: string;
  amount: number;
  paymentMethod: string;
  items: OrderItem[];
  orderedAt: string;
  orderedTime: string;
  cashierName: string;
  cashierEmail: string;
  customerName: string;
  productNames: string[];
  notes: string;
  quantity?: number;
}

interface SummaryCard {
  label: string;
  value: string;
  accent: string;
}
export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrdersAllTime, setTotalOrdersAllTime] = useState(0);
  const [totalRevenueAllTime, setTotalRevenueAllTime] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [totalItemsOrdered, setTotalItemsOrdered] = useState(0);

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('No active session found. Please sign in again.');
        }

        const headers = { Authorization: `Bearer ${session.access_token}` };
        const [ordersResponse, employeesResponse] = await Promise.all([
          fetch('/api/admin/orders', { headers }),
          fetch('/api/employees', { headers }),
        ]);

        const ordersPayload = await ordersResponse.json().catch(() => ({}));
        if (!ordersResponse.ok) {
          const details = ordersPayload?.details || ordersPayload?.error || ordersResponse.statusText;
          throw new Error(`Failed to fetch orders: ${details}`);
        }

        const employeesPayload = await employeesResponse.json().catch(() => []);
        if (employeesResponse.ok && Array.isArray(employeesPayload)) {
          setEmployeeCount(employeesPayload.length);
        } else {
          setEmployeeCount(0);
        }

        const rawOrders = (ordersPayload?.orders || []) as RawOrder[];
        const transformedOrders = rawOrders.map((order) => {
          const orderItems = (order.order_items || []).map((oi) => ({
            name: oi.item?.name || oi.item_id || 'Unknown Item',
            quantity: oi.quantity_sold ?? 0,
            unitPrice: oi.quantity_sold > 0 ? (oi.line_total ?? 0) / oi.quantity_sold : 0,
          }));

          return {
            id: order.id,
            branchId: order.branch?.name || order.branch_id,
            amount: order.final_amount ?? order.total_amount ?? 0,
            paymentMethod: order.payment_method || 'Unknown',
            items: orderItems,
            orderedAt: order.order_date,
            orderedTime: order.order_time,
            cashierName: order.cashier?.full_name || 'Unknown',
            cashierEmail: order.cashier?.email || 'unknown@example.com',
            customerName: 'Walk-in',
            productNames: orderItems.map((item) => item.name),
            notes: order.notes || '',
            quantity: orderItems.reduce((sum, oi) => sum + oi.quantity, 0),
          };
        });

        setOrders(transformedOrders);

        const count = transformedOrders.length;
        setTotalOrdersAllTime(count);

        const revenue = transformedOrders.reduce((sum: number, order: Order) => sum + order.amount, 0);
        setTotalRevenueAllTime(revenue);

        const totalItemsCount = transformedOrders.reduce((sum: number, order: Order) => sum + (order.quantity ?? 0), 0);
        setTotalItemsOrdered(totalItemsCount);

        const todayKey = getOrderDateKey(new Date().toISOString());
        const todayCount = transformedOrders.filter((order: Order) => getOrderDateKey(order.orderedAt) === todayKey).length;
        setTodayOrders(todayCount);
      } catch (error) {
        console.error('Error loading dashboard:', error instanceof Error ? error.message : error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);
  const filteredOrders = orders; // Dashboard does not filter, all orders shown.

  const summaryCards: SummaryCard[] = [
    { label: 'Total Orders (All time)', value: totalOrdersAllTime.toString(), accent: 'text-blue-600' },
    { label: 'Total Revenue (All time)', value: formatCurrency(totalRevenueAllTime), accent: 'text-green-600' },
    { label: 'Total Employees', value: employeeCount.toString(), accent: 'text-pink-600' },
    { label: 'Today Orders', value: todayOrders.toString(), accent: 'text-teal-600' },
    { label: 'Total Items Sold', value: totalItemsOrdered.toString(), accent: 'text-orange-600' },
  ];

  const handlePrintReceipt = (order: Order) => {
    if (typeof window === 'undefined') return;

    const rows = order.items
      .map((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        return `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
            <td>${formatCurrency(lineTotal)}</td>
          </tr>`;
      })
      .join('');

    const receiptHtml = `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>POS Receipt</title>
          <style>
            @page { size: 53mm auto; margin: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
            .receipt { width: 53mm; margin: 0 auto; padding: 0.15rem 0.05rem; color: #111; }
            .logo { display: none; }
            .title { text-align: center; font-size: 1.05rem; font-weight: 700; margin: 0; }
            .subtitle { text-align: center; font-size: 0.78rem; margin: 0.1rem 0 0.2rem; color: #333; }
            .divider { border-top: 1px solid #000; margin: 0.2rem 0; }
            .meta { font-size: 0.68rem; line-height: 1.35; margin: 0.15rem 0; }
            .meta div { margin: 0.06rem 0; }
            table { width: 100%; border-collapse: collapse; font-size: 0.7rem; margin: 0; }
            th, td { padding: 0.1rem 0; }
            th { border-bottom: 1px solid #000; text-align: left; font-weight: 700; }
            td { border-bottom: 1px dashed #777; }
            .right { text-align: right; }
            .total-row { border-top: 1px solid #000; margin-top: 0.1rem; padding-top: 0.15rem; }
            .total-text { font-size: 0.9rem; font-weight: 700; }
            .footer { text-align: center; font-size: 0.68rem; margin-top: 0.25rem; color: #555; }
          </style>
        </head>
        <body>
          <section class="receipt">
            <div class="title">1ST SIGHT KENKEY AVENUE</div>
            <div class="subtitle">SALES RECEIPT</div>
            <div class="divider"></div>
            <div class="meta">
              <div><strong>Date & Time:</strong> ${escapeHtml(order.orderedAt)} ${escapeHtml(order.orderedTime)}</div>
              <div><strong>Cashier:</strong> ${escapeHtml(order.cashierName)}</div>
              <div><strong>Payment Method:</strong> ${escapeHtml(order.paymentMethod)}</div>
            </div>
            <div class="divider"></div>
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
                ${rows}
              </tbody>
            </table>
            <div class="divider"></div>
            <div class="total-row">
              <div class="total-text">TOTAL AMOUNT: <span class="right">${formatCurrency(order.amount)}</span></div>
            </div>
            <div class="footer">Thank you for your purchase!</div>
            <div class="footer">Receipt ID: ${escapeHtml(order.id)}</div>
          </section>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'width=360,height=600');
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
    return <main className="flex min-h-screen items-center justify-center">Loading dashboard...</main>;
  }

  return (
    <section className="p-2 sm:p-4 md:p-6 overflow-x-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Admin Dashboard</h1>

      {/* Summary Cards */}
      <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm"
          >
            <p className="text-xs sm:text-sm font-medium text-slate-500">{card.label}</p>
            <p
              className={`mt-2 sm:mt-3 overflow-hidden text-ellipsis break-words text-lg sm:text-xl font-semibold tracking-tight sm:text-2xl xl:text-[1.75rem] ${card.accent}`}
            >
              {card.value}
            </p>
          </article>
        ))}
      </div>

      {/* Order History Table */}
      <div className="mt-4 sm:mt-6 overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3">
          <p className="text-base font-semibold tracking-tight text-slate-900">Order History</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-xs sm:text-sm">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[9%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[20%]" />
              <col className="w-[6%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[5%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Order ID</th>
                <th className="px-3 py-2.5">Branch</th>
                <th className="px-3 py-2.5">Cashier</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5 text-right">Qty</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Payment</th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="text-slate-700 transition-colors hover:bg-slate-50/60">
                  <td className="px-3 py-3 align-top">
                    <span className="block whitespace-nowrap">{order.orderedAt} {order.orderedTime}</span>
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-slate-600">{order.id}</td>
                  <td className="px-3 py-3 align-top text-sm font-medium text-slate-900">{order.branchId}</td>
                  <td className="px-3 py-3 align-top">
                    <p className="text-sm font-medium text-slate-900">{order.cashierName}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{order.cashierEmail}</p>
                  </td>
                  <td className="px-3 py-3 align-top text-sm leading-5 text-slate-700">
                    {order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <p key={`${order.id}-${item.name}-${idx}`} className="truncate" title={`${item.name} x ${item.quantity}`}>
                          {item.name} x {item.quantity}
                        </p>
                      ))
                    ) : (
                      <p className="text-slate-400">No items</p>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-right text-sm text-slate-700">{order.quantity ?? order.items.reduce((sum, i) => sum + (i.quantity ?? 0), 0)}</td>
                  <td className="px-3 py-3 align-top text-right text-[13px] font-medium leading-5 text-slate-900">{formatCurrency(order.amount)}</td>
                  <td className="px-3 py-3 align-top text-sm text-slate-700">{order.paymentMethod}</td>
                  <td className="px-3 py-3 align-top text-center">
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
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
