'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parsePrice } from './item-data';
import { useAdminItems } from './use-admin-items';
import { ItemTable } from './_components/item-table';

export default function AdminItemsPage() {
  const router = useRouter();
  const { items, categories, branches, isReady } = useAdminItems();
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');

  const branchOptions = useMemo(
    () => (branches.length ? branches.map((branch) => branch.name) : [...new Set(items.map((item) => item.branch))]),
    [branches, items],
  );
  const sizeOptions = useMemo(() => [...new Set(items.map((item) => item.size))], [items]);

  const filteredItems = items.filter((item) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (
      normalizedSearch &&
      !`${item.name} ${item.category} ${item.branch} ${item.branchId} ${item.size} ${item.addedBy} ${item.timeAdded.date} ${item.timeAdded.time}`.toLowerCase().includes(normalizedSearch)
    ) {
      return false;
    }

    if (branchFilter && item.branch !== branchFilter) {
      return false;
    }

    if (categoryFilter && item.category !== categoryFilter) {
      return false;
    }

    if (sizeFilter && item.size !== sizeFilter) {
      return false;
    }

    return true;
  });

  const totalItemCount = filteredItems.reduce((total, item) => total + item.stock, 0);
  const totalItemValue = filteredItems.reduce((total, item) => total + item.stock * parsePrice(item.price), 0);

  const handleExportCsv = () => {
    if (!filteredItems.length) {
      return;
    }

    const escapeCsvValue = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const headers = ['Date Added', 'Time Added', 'Item Added By', 'Branch', 'Branch ID', 'Name', 'Category', 'Size', 'Stock', 'Price'];
    const rows = filteredItems.map((item) => [
      item.timeAdded.date,
      item.timeAdded.time,
      item.addedBy,
      item.branch,
      item.branchId,
      item.name,
      item.category,
      item.size,
      item.stock,
      item.price,
    ]);
    const csvContent = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `items-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (!isReady) {
    return <main className="flex min-h-screen items-center justify-center">Loading items...</main>;
  }

  return (
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
      <div className="space-y-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!filteredItems.length}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/items/add')}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Add Item
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
                Search
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search item, branch, category, branch ID, or size"
                  className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                />
              </label>

              <label className="flex min-w-[150px] flex-col gap-1.5 text-sm font-medium text-slate-700">
                Branch
                <select
                  value={branchFilter}
                  onChange={(event) => setBranchFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                >
                  <option value="">All branches</option>
                  {branchOptions.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-[150px] flex-col gap-1.5 text-sm font-medium text-slate-700">
                Category
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-[120px] flex-col gap-1.5 text-sm font-medium text-slate-700">
                Size
                <select
                  value={sizeFilter}
                  onChange={(event) => setSizeFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                >
                  <option value="">All sizes</option>
                  {sizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setBranchFilter('');
                  setCategoryFilter('');
                  setSizeFilter('');
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Items</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{totalItemCount}</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Value</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-yellow-500">GHC{totalItemValue.toFixed(2)}</p>
            </article>
          </div>

          <ItemTable items={filteredItems} />
      </div>
    </section>
  );
}
