'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useManagerAuthGuard } from './_components/use-manager-auth-guard';
import { ManagerShell } from './_components/manager-shell';

interface RawOrderItem {
  item_id: string;
  quantity_sold: number;
  line_total: number;
  item?: { name?: string } | { name?: string }[];
}

interface RawOrder {
  id: string;
  branch_id?: string;
  final_amount: number;
  total_amount: number;
  payment_method: string | null;
  order_date: string;
  cashier_id: string;
  cashier?: { id?: string | null; full_name?: string | null; email?: string | null };
  order_items: RawOrderItem[];
}

interface TrendPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

interface TopEmployee {
  id: string;
  name: string;
  email: string;
  orders: number;
  revenue: number;
}

interface TopItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface PaymentMethodPerformance {
  method: string;
  count: number;
  revenue: number;
  share: number;
}

interface AnalyticsSnapshot {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topEmployee: TopEmployee | null;
  topItem: TopItem | null;
  topPaymentMethod: PaymentMethodPerformance | null;
  paymentBreakdown: PaymentMethodPerformance[];
  revenueTrend: TrendPoint[];
}

const currencyFormatter = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  currencyDisplay: 'symbol',
});

const toISODate = (value: Date): string => value.toISOString().slice(0, 10);

const formatCurrency = (amount: number): string => currencyFormatter.format(amount);

const getOrderItemName = (orderItem: RawOrderItem, itemNameMap: Map<string, string>): string => {
  const fromMap = itemNameMap.get(orderItem.item_id);
  if (fromMap) return fromMap;

  if (Array.isArray(orderItem.item)) {
    return orderItem.item[0]?.name || 'Unknown Item';
  }

  return orderItem.item?.name || 'Unknown Item';
};

interface OrdersApiResponse {
  orders: RawOrder[];
}

const createEmptyAnalytics = (): AnalyticsSnapshot => ({
  totalRevenue: 0,
  totalOrders: 0,
  averageOrderValue: 0,
  topEmployee: null,
  topItem: null,
  topPaymentMethod: null,
  paymentBreakdown: [],
  revenueTrend: [],
});

const buildRevenueTrend = (): TrendPoint[] => {
  const formatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit' });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    return {
      date: toISODate(date),
      label: formatter.format(date),
      revenue: 0,
      orders: 0,
    };
  });
};

export default function ManagerPage() {
  const { email, fullName, branch, isLoading: authLoading } = useManagerAuthGuard();
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot>(createEmptyAnalytics);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    if (!branch) return;

    let isMounted = true;

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error('Missing access token');
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
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}${payload && 'error' in payload && payload.error ? ` - ${payload.error}` : ''}`,
          );
        }

        const orders = ((payload as OrdersApiResponse | null)?.orders || []) as RawOrder[];

        if (!orders.length) {
          if (isMounted) {
            setAnalytics(createEmptyAnalytics());
            setAnalyticsLoading(false);
          }
          return;
        }

        const paymentAgg = new Map<string, { count: number; revenue: number }>();
        const employeeAgg = new Map<string, TopEmployee>();
        const itemAgg = new Map<string, TopItem>();
        const trendAgg = new Map<string, TrendPoint>(buildRevenueTrend().map((point) => [point.date, point]));
        const itemNameMap = new Map<string, string>();

        let totalRevenue = 0;
        let totalOrders = 0;

        orders.forEach((order) => {
          const amount = Number(order.final_amount ?? order.total_amount ?? 0);
          const paymentMethod = order.payment_method || 'Unknown';

          totalRevenue += amount;
          totalOrders += 1;

          if (trendAgg.has(order.order_date)) {
            const existingPoint = trendAgg.get(order.order_date)!;
            existingPoint.revenue += amount;
            existingPoint.orders += 1;
          }

          const currentPayment = paymentAgg.get(paymentMethod) || { count: 0, revenue: 0 };
          paymentAgg.set(paymentMethod, {
            count: currentPayment.count + 1,
            revenue: currentPayment.revenue + amount,
          });

          const currentEmployee = employeeAgg.get(order.cashier_id) || {
            id: order.cashier_id,
            name: order.cashier?.full_name || 'Unknown Employee',
            email: order.cashier?.email || 'unknown@example.com',
            orders: 0,
            revenue: 0,
          };
          employeeAgg.set(order.cashier_id, {
            ...currentEmployee,
            orders: currentEmployee.orders + 1,
            revenue: currentEmployee.revenue + amount,
          });

          (order.order_items || []).forEach((orderItem) => {
            const itemName = getOrderItemName(orderItem, itemNameMap);
            if (itemName && itemName !== 'Unknown Item') {
              itemNameMap.set(orderItem.item_id, itemName);
            }

            const lineRevenue = Number(orderItem.line_total ?? 0);
            const quantity = Number(orderItem.quantity_sold ?? 0);
            const currentItem = itemAgg.get(orderItem.item_id) || {
              id: orderItem.item_id,
              name: itemName,
              quantity: 0,
              revenue: 0,
            };

            itemAgg.set(orderItem.item_id, {
              ...currentItem,
              quantity: currentItem.quantity + quantity,
              revenue: currentItem.revenue + lineRevenue,
            });
          });
        });

        const paymentBreakdown = Array.from(paymentAgg.entries())
          .map(([method, value]) => ({
            method,
            count: value.count,
            revenue: value.revenue,
            share: totalOrders > 0 ? (value.count / totalOrders) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

        const topPaymentMethod = paymentBreakdown[0] || null;

        const topEmployee = Array.from(employeeAgg.values())
          .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)[0] || null;

        const topItem = Array.from(itemAgg.values())
          .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)[0] || null;

        const revenueTrend = Array.from(trendAgg.values());

        if (isMounted) {
          setAnalytics({
            totalRevenue,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            topEmployee,
            topItem,
            topPaymentMethod,
            paymentBreakdown,
            revenueTrend,
          });
          setAnalyticsLoading(false);
        }
      } catch (error) {
        console.error('Manager analytics error:', error instanceof Error ? error.message : String(error), error);
        if (isMounted) {
          setAnalytics(createEmptyAnalytics());
          setAnalyticsLoading(false);
          setAnalyticsError('Unable to load branch analytics at the moment.');
        }
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [branch]);

  const maxTrendRevenue = useMemo(() => {
    if (!analytics.revenueTrend.length) return 1;
    return Math.max(...analytics.revenueTrend.map((point) => point.revenue), 1);
  }, [analytics.revenueTrend]);

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center">Loading manager account...</main>;
  }

  return (
    <ManagerShell email={email} fullName={fullName} branch={branch}>
      <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-600">Manager Dashboard</p>
              <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
              <p className="text-sm text-slate-500">{email}</p>
              <p className="text-xs text-slate-400">Branch: {branch}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Branch Status</p>
                <p className="mt-1 text-lg font-semibold text-emerald-900">Active</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-600">Reports & Analytics</p>
              <h2 className="text-xl font-semibold text-slate-900">Branch Performance Snapshot</h2>
              <p className="text-sm text-slate-500">Top performers and payment insights for {branch}.</p>
            </div>
            {analyticsLoading && <p className="text-xs font-medium text-slate-500">Refreshing analytics...</p>}
          </div>

          <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Total Revenue</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900">{formatCurrency(analytics.totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-blue-700">Orders Processed</p>
              <p className="mt-1 text-xl font-semibold text-blue-900">{analytics.totalOrders}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-amber-700">Avg. Order Value</p>
              <p className="mt-1 text-xl font-semibold text-amber-900">{formatCurrency(analytics.averageOrderValue)}</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-violet-700">Top Payment Method</p>
              <p className="mt-1 text-lg font-semibold text-violet-900">{analytics.topPaymentMethod?.method || 'No data'}</p>
              <p className="text-xs text-violet-700/80">
                {analytics.topPaymentMethod
                  ? `${analytics.topPaymentMethod.count} orders (${analytics.topPaymentMethod.share.toFixed(1)}%)`
                  : 'Awaiting completed sales'}
              </p>
            </div>
          </div>

          {analyticsError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {analyticsError}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Revenue Trend (Last 7 Days)</h3>
                <span className="text-xs text-slate-500">Amount in GHS</span>
              </div>

              {!analytics.revenueTrend.length ? (
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
                  No sales trend available yet.
                </div>
              ) : (
                <div className="grid h-56 grid-cols-7 items-end gap-2">
                  {analytics.revenueTrend.map((point) => {
                    const heightPercent = Math.max((point.revenue / maxTrendRevenue) * 100, point.revenue > 0 ? 12 : 4);

                    return (
                      <div key={point.date} className="flex h-full flex-col items-center justify-end gap-2">
                        <span className="text-[11px] font-medium text-slate-600">{point.revenue > 0 ? point.revenue.toFixed(0) : '0'}</span>
                        <div className="relative flex h-36 w-full items-end rounded-lg bg-slate-200/60 px-1.5 py-1">
                          <div
                            className="w-full rounded-md bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_8px_20px_-12px_rgba(79,70,229,0.9)]"
                            style={{ height: `${heightPercent}%` }}
                            title={`${point.label}: ${formatCurrency(point.revenue)} (${point.orders} orders)`}
                          />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-700">{point.label}</p>
                        <p className="text-[10px] text-slate-500">{point.orders} ord</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Top Performing Employee</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{analytics.topEmployee?.name || 'No data yet'}</p>
                <p className="text-xs text-slate-500">{analytics.topEmployee?.email || 'Sales required for ranking'}</p>
                <div className="mt-2 text-sm text-slate-700">
                  {analytics.topEmployee
                    ? `${analytics.topEmployee.orders} orders • ${formatCurrency(analytics.topEmployee.revenue)} generated`
                    : 'Run transactions to reveal employee rankings.'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Top Purchased Item</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{analytics.topItem?.name || 'No data yet'}</p>
                <div className="mt-2 text-sm text-slate-700">
                  {analytics.topItem
                    ? `${analytics.topItem.quantity} units sold • ${formatCurrency(analytics.topItem.revenue)} in sales`
                    : 'Item rankings appear after completed sales.'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Payment Method Mix</p>
                <div className="mt-3 space-y-2">
                  {analytics.paymentBreakdown.length ? (
                    analytics.paymentBreakdown.slice(0, 4).map((payment) => (
                      <div key={payment.method}>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                          <span className="font-medium text-slate-700">{payment.method}</span>
                          <span>{payment.share.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-slate-800"
                            style={{ width: `${Math.min(Math.max(payment.share, 6), 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Payment mix will appear once orders are recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>
    </ManagerShell>
  );
}

