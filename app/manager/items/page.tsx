'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ManagerShell } from '../_components/manager-shell';
import { useBranchItems } from '../_components/use-branch-items';
import { useManagerAuthGuard } from '../_components/use-manager-auth-guard';

type CategoryOption = {
  id: string;
  name: string;
};

type ItemFormState = {
  name: string;
  categoryId: string;
  size: string;
  stock: string;
  price: string;
};

const emptyForm = (): ItemFormState => ({
  name: '',
  categoryId: '',
  size: '',
  stock: '',
  price: '',
});

export default function ManagerItemsPage() {
  const { email, fullName, branch, isLoading: authLoading } = useManagerAuthGuard('Loading manager items...');
  const { items, categories, isLoading: itemsLoading, error, refetchItems } = useBranchItems(branch);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [formValues, setFormValues] = useState<ItemFormState>(emptyForm());
  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  useEffect(() => {
    const fetchFormData = async () => {
      if (!branch) return;
      const authHeaders = await getAuthHeaders();

      const [branchResponse, categoryResponse] = await Promise.all([
        fetch('/api/cashier/branch', { headers: authHeaders }),
        fetch('/api/admin/categories', { headers: authHeaders }),
      ]);

      if (branchResponse.ok) {
        const branchData = (await branchResponse.json()) as { branchId?: string };
        setBranchId(branchData.branchId || '');
      }

      if (categoryResponse.ok) {
        const categoryData = (await categoryResponse.json()) as CategoryOption[];
        setCategoryOptions(categoryData);
      }
    };

    void fetchFormData();
  }, [branch]);

  const sizeOptions = useMemo(() => [...new Set(items.map((item) => item.size).filter(Boolean))], [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      if (
        normalizedSearch &&
        !`${item.name} ${item.category} ${item.size} ${item.stock} ${item.price}`.toLowerCase().includes(normalizedSearch)
      ) {
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
  }, [items, searchTerm, categoryFilter, sizeFilter]);

  const handleFormChange = (field: keyof ItemFormState, value: string) => {
    setFormError(null);
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleOpenAddModal = () => {
    setFormError(null);
    setFormValues(emptyForm());
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    if (isSubmitting) return;
    setFormError(null);
    setIsAddModalOpen(false);
  };

  const handleAddItem = async () => {
    if (!formValues.name.trim() || !formValues.categoryId || !formValues.size.trim() || !formValues.stock.trim() || !formValues.price.trim()) {
      setFormError('Please fill in item name, category, size, stock, and price.');
      return;
    }

    if (!branchId) {
      setFormError('Manager branch could not be resolved.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({
          branchId,
          categoryId: formValues.categoryId,
          name: formValues.name.trim(),
          size: formValues.size.trim(),
          stock: formValues.stock.trim(),
          price: formValues.price.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add item.');
      }

      await refetchItems();
      setIsAddModalOpen(false);
      setFormValues(emptyForm());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || itemsLoading) {
    return <main className="flex min-h-screen items-center justify-center">Loading manager items...</main>;
  }

  return (
    <ManagerShell email={email} fullName={fullName} branch={branch}>
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add Item</h2>
                <p className="mt-1 text-sm text-slate-500">Create a new item for the {branch} branch.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseAddModal}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                Item Name
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(event) => handleFormChange('name', event.target.value)}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Category
                <select
                  value={formValues.categoryId}
                  onChange={(event) => handleFormChange('categoryId', event.target.value)}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Size
                <input
                  type="text"
                  value={formValues.size}
                  onChange={(event) => handleFormChange('size', event.target.value)}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Stock
                <input
                  type="number"
                  min="0"
                  value={formValues.stock}
                  onChange={(event) => handleFormChange('stock', event.target.value)}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.price}
                  onChange={(event) => handleFormChange('price', event.target.value)}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleAddItem}
                disabled={isSubmitting}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Item'}
              </button>
              <button
                type="button"
                onClick={handleCloseAddModal}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-600">Branch Inventory</p>
              <h1 className="text-3xl font-bold text-slate-900">Items</h1>
              <p className="text-sm text-slate-500">Viewing stock assigned to {branch} only.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Visible Items</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{filteredItems.length}</p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-nowrap items-end gap-4 overflow-x-auto">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Search
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search item, category, size, stock, or price"
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="flex min-w-[180px] flex-col gap-1.5 text-sm font-medium text-slate-700">
              Category
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category || 'Uncategorized'}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-[180px] flex-col gap-1.5 text-sm font-medium text-slate-700">
              Size
              <select
                value={sizeFilter}
                onChange={(event) => setSizeFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="">All sizes</option>
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {error ? (
            <div className="px-6 py-5 text-sm text-red-600">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No items match the current filters for {branch}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-800">
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4">Category</th>
                    <th className="px-4 py-4">Size</th>
                    <th className="px-4 py-4 text-right">Stock</th>
                    <th className="px-4 py-4 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{item.category || 'Uncategorized'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{item.size || 'Standard'}</td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-slate-900">{item.stock}</td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-amber-600">
                        GHC{Number(item.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </ManagerShell>
  );
}
