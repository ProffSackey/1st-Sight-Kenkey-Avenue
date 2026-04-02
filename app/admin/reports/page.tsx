'use client';

import { useEffect, useMemo, useState } from 'react';
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
  total_amount: number;
  payment_method: string | null;
  order_date: string;
  cashier_id: string;
  branch?: { id?: string; name?: string };
  cashier?: { id?: string | null; full_name?: string | null; email?: string | null };
  order_items: RawOrderItem[];
}

interface OrdersApiResponse {
  orders: RawOrder[];
}

interface TrendPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

interface ChartPoint {
  x: number;
  y: number;
  data: TrendPoint;
  index: number;
}

interface TopEmployee {
  name: string;
  email: string;
  orders: number;
  revenue: number;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopBranch {
  id: string;
  name: string;
  orders: number;
  revenue: number;
}

interface PaymentPerformance {
  method: string;
  count: number;
  share: number;
  revenue: number;
}

interface AnalyticsState {
  totalRevenue: number;
  totalOrders: number;
  totalUnitsSold: number;
  activeCashiers: number;
  activeItems: number;
  activeBranches: number;
  averageOrderValue: number;
  topEmployee: TopEmployee | null;
  topItem: TopItem | null;
  topBranch: TopBranch | null;
  topPaymentMethod: PaymentPerformance | null;
  paymentMix: PaymentPerformance[];
  trend: TrendPoint[];
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', currencyDisplay: 'symbol' }).format(amount);

const formatCompactCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);

const toISODate = (d: Date): string => d.toISOString().slice(0, 10);

const getDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISODate(d);
};

const startOfMonth = (): string => {
  const d = new Date();
  d.setDate(1);
  return toISODate(d);
};

const buildTrendRange = (start: string, end: string): TrendPoint[] => {
  const formatter = new Intl.DateTimeFormat('en-GB', { month: 'short', day: '2-digit' });
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const points: TrendPoint[] = [];

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    points.push({
      date: toISODate(date),
      label: formatter.format(date),
      revenue: 0,
      orders: 0,
    });
  }

  return points;
};

const createEmptyAnalytics = (startDate: string, endDate: string): AnalyticsState => ({
  totalRevenue: 0,
  totalOrders: 0,
  totalUnitsSold: 0,
  activeCashiers: 0,
  activeItems: 0,
  activeBranches: 0,
  averageOrderValue: 0,
  topEmployee: null,
  topItem: null,
  topBranch: null,
  topPaymentMethod: null,
  paymentMix: [],
  trend: buildTrendRange(startDate, endDate),
});

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(() => getDaysAgo(6));
  const [endDate, setEndDate] = useState<string>(() => getDaysAgo(0));
  const [analytics, setAnalytics] = useState<AnalyticsState>(() => createEmptyAnalytics(getDaysAgo(6), getDaysAgo(0)));

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);
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

        const orders = (((payload as OrdersApiResponse | null)?.orders || []) as RawOrder[]).filter(
          (order) => order.order_date >= startDate && order.order_date <= endDate,
        );

        if (!orders.length) {
          if (active) {
            setAnalytics(createEmptyAnalytics(startDate, endDate));
            setLoading(false);
          }
          return;
        }

        const trendMap = new Map(buildTrendRange(startDate, endDate).map((t) => [t.date, t]));
        const employeeAgg = new Map<string, TopEmployee>();
        const itemAgg = new Map<string, TopItem>();
        const branchAgg = new Map<string, TopBranch>();
        const paymentAgg = new Map<string, { count: number; revenue: number }>();

        let totalRevenue = 0;
        let totalOrders = 0;
        let totalUnitsSold = 0;

        orders.forEach((order) => {
          const amount = Number(order.final_amount ?? order.total_amount ?? 0);
          const payment = order.payment_method || 'Unknown';

          totalRevenue += amount;
          totalOrders += 1;

          if (trendMap.has(order.order_date)) {
            const slot = trendMap.get(order.order_date)!;
            slot.revenue += amount;
            slot.orders += 1;
          }

          const currentEmployee = employeeAgg.get(order.cashier_id) || {
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

          const branchName = order.branch?.name || order.branch_id || 'Unknown Branch';
          const currentBranch = branchAgg.get(order.branch_id) || {
            id: order.branch_id,
            name: branchName,
            orders: 0,
            revenue: 0,
          };
          branchAgg.set(order.branch_id, {
            ...currentBranch,
            orders: currentBranch.orders + 1,
            revenue: currentBranch.revenue + amount,
          });

          const currentPayment = paymentAgg.get(payment) || { count: 0, revenue: 0 };
          paymentAgg.set(payment, {
            count: currentPayment.count + 1,
            revenue: currentPayment.revenue + amount,
          });

          (order.order_items || []).forEach((oi) => {
            const quantitySold = Number(oi.quantity_sold || 0);
            const currentItem = itemAgg.get(oi.item_id) || {
              name: oi.item?.name || 'Unknown Item',
              quantity: 0,
              revenue: 0,
            };
            itemAgg.set(oi.item_id, {
              ...currentItem,
              quantity: currentItem.quantity + quantitySold,
              revenue: currentItem.revenue + Number(oi.line_total || 0),
            });
            totalUnitsSold += quantitySold;
          });
        });

        const paymentMix = Array.from(paymentAgg.entries())
          .map(([method, value]) => ({
            method,
            count: value.count,
            revenue: value.revenue,
            share: totalOrders > 0 ? (value.count / totalOrders) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

        const topPaymentMethod = paymentMix[0] || null;
        const topEmployee = Array.from(employeeAgg.values()).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)[0] || null;
        const topItem = Array.from(itemAgg.values()).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)[0] || null;
        const topBranch = Array.from(branchAgg.values()).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)[0] || null;

        if (active) {
          setAnalytics({
            totalRevenue,
            totalOrders,
            totalUnitsSold,
            activeCashiers: employeeAgg.size,
            activeItems: itemAgg.size,
            activeBranches: branchAgg.size,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            topEmployee,
            topItem,
            topBranch,
            topPaymentMethod,
            paymentMix,
            trend: Array.from(trendMap.values()),
          });
          setLoading(false);
        }
      } catch (fetchError) {
        console.error(
          'Admin reports analytics error:',
          fetchError instanceof Error ? fetchError.message : String(fetchError),
          fetchError,
        );
        if (active) {
          setError('Could not load organization analytics.');
          setAnalytics(createEmptyAnalytics(startDate, endDate));
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [startDate, endDate]);

  const maxTrend = useMemo(() => Math.max(...analytics.trend.map((t) => t.revenue), 1), [analytics.trend]);
  const totalTrendRevenue = useMemo(
    () => analytics.trend.reduce((sum, day) => sum + day.revenue, 0),
    [analytics.trend],
  );
  const peakDay = useMemo(
    () => analytics.trend.reduce((best, day) => (day.revenue > best.revenue ? day : best), analytics.trend[0] || null),
    [analytics.trend],
  );
  const revenueChart = useMemo(() => {
    if (!analytics.trend.length) return null;

    const width = 760;
    const height = 280;
    const pad = { top: 18, right: 24, bottom: 48, left: 64 };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const maxValue = Math.max(...analytics.trend.map((point) => point.revenue), 1);

    const points: ChartPoint[] = analytics.trend.map((point, idx) => {
      const x = pad.left + (idx / Math.max(analytics.trend.length - 1, 1)) * innerWidth;
      const y = pad.top + innerHeight - (point.revenue / maxValue) * innerHeight;
      return { x, y, data: point, index: idx };
    });

    const xLabelStep =
      analytics.trend.length <= 7
        ? 1
        : analytics.trend.length <= 14
          ? 2
          : analytics.trend.length <= 31
            ? 4
            : 7;

    const linePath = points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${pad.top + innerHeight} L ${points[0].x} ${pad.top + innerHeight} Z`;

    const yTicks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => {
      const y = pad.top + innerHeight - fraction * innerHeight;
      return { y, value: maxValue * fraction };
    });

    return { width, height, pad, innerWidth, innerHeight, points, linePath, areaPath, yTicks, xLabelStep };
  }, [analytics.trend]);
  const paymentChart = useMemo(() => {
    if (!analytics.paymentMix.length) return null;

    const palette = ['#0f172a', '#1d4ed8', '#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6'];
    let offset = 0;
    const slices = analytics.paymentMix.map((method, index) => {
      const start = offset;
      const end = offset + method.share;
      offset = end;
      return {
        ...method,
        color: palette[index % palette.length],
        start,
        end,
      };
    });
    const conic = `conic-gradient(${slices
      .map((slice) => `${slice.color} ${slice.start.toFixed(2)}% ${slice.end.toFixed(2)}%`)
      .join(', ')})`;

    return { slices, conic };
  }, [analytics.paymentMix]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center">Loading admin reports...</main>;
  }

  return (
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="relative rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Reports and Analytics</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Organization Performance Intelligence</h1>
              <p className="mt-2 text-sm text-sky-100/90">
                Track company-wide revenue momentum, branch impact, and payment behavior.
              </p>
            </div>
            <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-sky-200">Reporting Window</p>
              <p className="text-sm font-semibold">{startDate} to {endDate}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-white/20 bg-white/5 p-3 sm:grid-cols-[auto_auto_1fr] sm:items-end">
            <label className="text-xs text-sky-100">
              <span className="mb-1 block uppercase tracking-wide text-sky-200">Start date</span>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setStartDate(value);
                  if (value > endDate) setEndDate(value);
                }}
                className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none ring-0"
              />
            </label>
            <label className="text-xs text-sky-100">
              <span className="mb-1 block uppercase tracking-wide text-sky-200">End date</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setEndDate(value);
                  if (value < startDate) setStartDate(value);
                }}
                className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-sm text-white outline-none ring-0"
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setStartDate(getDaysAgo(6));
                  setEndDate(getDaysAgo(0));
                }}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate(getDaysAgo(29));
                  setEndDate(getDaysAgo(0));
                }}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Last 30 days
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate(startOfMonth());
                  setEndDate(getDaysAgo(0));
                }}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                This month
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-200">Period Revenue Pulse</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(totalTrendRevenue)}</p>
            </div>
            <div className="rounded-xl border border-blue-300/30 bg-blue-400/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-blue-200">Peak Day</p>
              <p className="mt-1 text-xl font-semibold">
                {peakDay ? `${peakDay.label} - ${formatCompactCurrency(peakDay.revenue)}` : 'Awaiting sales'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Total Revenue</p>
            <p className="mt-1 text-xl font-semibold text-emerald-900">{formatCurrency(analytics.totalRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs uppercase tracking-wide text-blue-700">Orders</p>
            <p className="mt-1 text-xl font-semibold text-blue-900">{analytics.totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-700">Average Ticket</p>
            <p className="mt-1 text-xl font-semibold text-amber-900">{formatCurrency(analytics.averageOrderValue)}</p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-700">Units Sold</p>
            <p className="mt-1 text-xl font-semibold text-cyan-900">{analytics.totalUnitsSold}</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs uppercase tracking-wide text-violet-700">Top Payment</p>
            <p className="mt-1 text-lg font-semibold text-violet-900">{analytics.topPaymentMethod?.method || 'No data'}</p>
            <p className="text-xs text-violet-700/80">
              {analytics.topPaymentMethod ? `${analytics.topPaymentMethod.share.toFixed(1)}% of all orders` : 'Waiting for transactions'}
            </p>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <div className="relative mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Revenue Momentum</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Max day: {formatCompactCurrency(maxTrend)}
              </span>
            </div>

            {analytics.trend.length === 0 ? (
              <div className="mt-2 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-500">
                No analytics data yet.
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
                <svg
                  viewBox={`${0} ${0} ${revenueChart?.width || 760} ${revenueChart?.height || 280}`}
                  className="h-[290px] min-w-[680px] w-full"
                  role="img"
                  aria-label="Revenue trend chart"
                >
                  {revenueChart?.yTicks.map((tick) => (
                    <g key={tick.y}>
                      <line
                        x1={revenueChart.pad.left}
                        x2={revenueChart.pad.left + revenueChart.innerWidth}
                        y1={tick.y}
                        y2={tick.y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={revenueChart.pad.left - 10}
                        y={tick.y + 4}
                        fill="#64748b"
                        fontSize="11"
                        textAnchor="end"
                      >
                        {formatCompactCurrency(tick.value)}
                      </text>
                    </g>
                  ))}

                  <path d={revenueChart?.areaPath || ''} fill="url(#revenueAreaAdmin)" />
                  <path d={revenueChart?.linePath || ''} stroke="#1d4ed8" strokeWidth="3" fill="none" />

                  {revenueChart?.points.map((point) => (
                    <g key={point.data.date}>
                      <circle cx={point.x} cy={point.y} r="4.5" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2.5" />
                      <title>{`${point.data.label}: ${formatCurrency(point.data.revenue)} from ${point.data.orders} orders`}</title>
                    </g>
                  ))}

                  {revenueChart?.points
                    .filter(
                      (point) =>
                        point.index % revenueChart.xLabelStep === 0 ||
                        point.index === revenueChart.points.length - 1,
                    )
                    .map((point) => (
                    <g key={`${point.data.date}-label`}>
                      <text
                        x={point.x}
                        y={revenueChart.pad.top + revenueChart.innerHeight + 20}
                        fill="#334155"
                        fontSize="11"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {point.data.label}
                      </text>
                    </g>
                  ))}

                  <defs>
                    <linearGradient id="revenueAreaAdmin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Organization Activity</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Branches</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{analytics.activeBranches}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Cashiers</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{analytics.activeCashiers}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Selling Items</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{analytics.activeItems}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Top Performing Employee</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{analytics.topEmployee?.name || 'No data yet'}</p>
              <p className="text-xs text-slate-500">{analytics.topEmployee?.email || 'Waiting for sales data'}</p>
              <p className="mt-2 text-sm text-slate-700">
                {analytics.topEmployee
                  ? `${analytics.topEmployee.orders} orders • ${formatCurrency(analytics.topEmployee.revenue)} generated`
                  : 'Record sales to rank employee performance.'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Top Performing Branch</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{analytics.topBranch?.name || 'No data yet'}</p>
              <p className="mt-2 text-sm text-slate-700">
                {analytics.topBranch
                  ? `${analytics.topBranch.orders} orders • ${formatCurrency(analytics.topBranch.revenue)} in sales`
                  : 'Waiting for branch performance data'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Top Purchased Item</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{analytics.topItem?.name || 'No data yet'}</p>
              <p className="mt-2 text-sm text-slate-700">
                {analytics.topItem
                  ? `${analytics.topItem.quantity} units sold • ${formatCurrency(analytics.topItem.revenue)} in sales`
                  : 'Waiting for sales data'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Payment Method Performance</h2>
            <span className="text-xs text-slate-500">Ranked by order count and revenue impact</span>
          </div>

          {paymentChart ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
              <div className="mx-auto flex w-[180px] flex-col items-center justify-center">
                <div
                  className="relative h-[180px] w-[180px] rounded-full ring-1 ring-slate-200"
                  style={{ background: paymentChart.conic }}
                >
                  <div className="absolute inset-[22%] grid place-items-center rounded-full bg-white ring-1 ring-slate-100">
                    <div className="text-center">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Orders</p>
                      <p className="text-xl font-semibold text-slate-900">{analytics.totalOrders}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">Distribution by payment method</p>
              </div>

              <div className="space-y-3">
                {paymentChart.slices.map((method) => (
                  <div key={method.method} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: method.color }} />
                        <p className="text-sm font-semibold text-slate-900">{method.method}</p>
                      </div>
                      <p className="text-xs font-medium text-slate-600">
                        {method.count} orders • {formatCurrency(method.revenue)}
                      </p>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${Math.min(Math.max(method.share, 6), 100)}%`,
                          backgroundColor: method.color,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[11px] font-medium text-slate-500">{method.share.toFixed(1)}% order share</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Payment method data will appear once orders are recorded.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
