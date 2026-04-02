'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ItemRow } from './item-data';
import type { Branch } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type Category = { id: string; name: string };
type AdminItemApiRow = {
  id: string;
  branch_id: string;
  name: string;
  category_name?: string;
  size?: string | null;
  branch_name?: string;
  created_at: string;
  stock_quantity: number;
  unit_price: number;
  added_by_name?: string | null;
  added_by_email?: string | null;
  added_by?: string | null;
};

const mapApiRowToItemRow = (item: AdminItemApiRow): ItemRow => ({
  id: item.id,
  branchId: item.branch_id,
  addedBy: item.added_by_name || item.added_by_email || item.added_by || 'Unknown',
  name: item.name,
  category: item.category_name || 'Unknown',
  size: item.size || '',
  branch: item.branch_name || 'Unknown',
  timeAdded: {
    date: new Date(item.created_at).toLocaleDateString(),
    time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  stock: item.stock_quantity,
  price: `GHC${item.unit_price.toFixed(2)}`,
});

export function useAdminItems(options?: { loadItems?: boolean }) {
  const loadItems = options?.loadItems ?? true;
  const [items, setItems] = useState<ItemRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categoryCatalog, setCategoryCatalog] = useState<Category[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const ensureAccessToken = useCallback(async () => {
    if (accessTokenRef.current) {
      return accessTokenRef.current;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated.');
    }

    accessTokenRef.current = session.access_token;
    return session.access_token;
  }, []);

  const apiFetch = useCallback(
    async (input: string, init?: RequestInit) => {
      const token = await ensureAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      if (init?.headers) {
        Object.assign(headers, init.headers as Record<string, string>);
      }

      return fetch(input, { ...init, headers });
    },
    [ensureAccessToken],
  );

  const loadItemsFromApi = useCallback(async () => {
    const response = await apiFetch('/api/admin/items');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const itemsData = (await response.json()) as AdminItemApiRow[];
    const transformedItems = (itemsData || []).map(mapApiRowToItemRow);

    setItems(transformedItems);
    setSizes([...new Set(transformedItems.map((i) => i.size).filter(Boolean))]);

    return transformedItems;
  }, [apiFetch]);

  const loadCategoryCatalog = useCallback(async () => {
    const response = await apiFetch('/api/admin/categories');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as Category[];
    setCategoryCatalog(data || []);
    setCategories((data || []).map((c) => c.name));
    return data || [];
  }, [apiFetch]);

  const refetchItems = useCallback(async () => {
    setError(null);
    try {
      const transformedItems = await loadItemsFromApi();

      if (!categoryCatalog.length) {
        setCategories([...new Set(transformedItems.map((i) => i.category))]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setItems([]);
      setCategories([]);
      setSizes([]);
    }
  }, [categoryCatalog.length, loadItemsFromApi]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsReady(false);
        setError(null);

        const tasks: Array<Promise<unknown>> = [
          apiFetch('/api/admin/branches').then(async (response) => {
            if (response.ok) {
              setBranches(await response.json());
            }
          }),
          loadCategoryCatalog(),
        ];

        if (loadItems) {
          tasks.push(loadItemsFromApi());
        }

        await Promise.all(tasks);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      } finally {
        setIsReady(true);
      }
    };

    void fetchData();
  }, [apiFetch, loadCategoryCatalog, loadItems, loadItemsFromApi]);

  const createCategory = async (categoryName: string) => {
    try {
      const response = await apiFetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName.trim() }),
      });

      if (!response.ok) {
        const apiError = await response.json();
        throw new Error(apiError.error || 'Failed to create category');
      }

      const createdCategory = (await response.json()) as Category;
      const nextCatalog = [...categoryCatalog, createdCategory].sort((a, b) => a.name.localeCompare(b.name));
      setCategoryCatalog(nextCatalog);
      setCategories(nextCatalog.map((c) => c.name));
      return createdCategory;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error creating category: ${msg}`);
      throw err;
    }
  };

  const deleteCategory = (categoryName: string) => {
    setCategories((prev) => prev.filter((c) => c !== categoryName));
    setCategoryCatalog((prev) => prev.filter((c) => c.name !== categoryName));
  };

  const resolveCategoryId = async (categoryName?: string) => {
    if (!categoryName) return null;

    const normalized = categoryName.trim();
    let match = categoryCatalog.find((c) => c.name === normalized);

    if (!match) {
      const fresh = await loadCategoryCatalog();
      match = fresh.find((c) => c.name === normalized);
    }

    return match?.id || null;
  };

  const addItem = async (item: Omit<ItemRow, 'id'>) => {
    setError(null);

    try {
      const categoryId = await resolveCategoryId(item.category);
      if (!categoryId) {
        const msg = `Category "${item.category}" not found.`;
        setError(msg);
        return null;
      }

      const response = await apiFetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: item.branchId,
          categoryId,
          name: item.name,
          size: item.size,
          stock: item.stock,
          price: parseFloat(item.price.replace('GHC', '')),
        }),
      });

      if (!response.ok) {
        const apiError = await response.json();
        throw new Error(apiError.error || `Failed to add item (${response.status})`);
      }

      const data = await response.json();

      if (loadItems) {
        const createdAt = typeof data.created_at === 'string' ? data.created_at : new Date().toISOString();
        const createdRow: ItemRow = {
          id: data.id,
          branchId: item.branchId,
          addedBy: 'You',
          name: item.name,
          category: item.category,
          size: item.size,
          branch: item.branch,
          timeAdded: {
            date: new Date(createdAt).toLocaleDateString(),
            time: new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          stock: Number(item.stock),
          price: item.price,
        };
        setItems((current) => [createdRow, ...current]);
      }

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      return null;
    }
  };

  const updateItem = async (id: string, updates: Partial<ItemRow>) => {
    setError(null);
    try {
      const categoryId = await resolveCategoryId(updates.category);
      if (!categoryId) {
        throw new Error(`Category "${updates.category}" not found.`);
      }

      const response = await apiFetch(`/api/admin/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: updates.branchId,
          categoryId,
          name: updates.name,
          size: updates.size,
          stock: updates.stock,
          price: parseFloat(String(updates.price || '').replace('GHC', '')),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Failed to update item (${response.status})`);
      }

      const updatedItem = await response.json();
      if (loadItems) {
        setItems((current) =>
          current.map((row) =>
            row.id === id
              ? {
                  ...row,
                  branch: updates.branch ?? row.branch,
                  branchId: updates.branchId ?? row.branchId,
                  name: updates.name ?? row.name,
                  category: updates.category ?? row.category,
                  size: updates.size ?? row.size,
                  stock: typeof updates.stock === 'number' ? updates.stock : row.stock,
                  price: updates.price ?? row.price,
                }
              : row,
          ),
        );
      }
      return updatedItem;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      return null;
    }
  };

  const deleteItem = async (id: string) => {
    setError(null);
    try {
      const response = await apiFetch(`/api/admin/items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Failed to delete item (${response.status})`);
      }

      if (loadItems) {
        setItems((current) => current.filter((row) => row.id !== id));
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      return false;
    }
  };

  const sortedCategories = useMemo(() => [...categories].sort(), [categories]);

  return {
    items,
    setItems,
    categories: sortedCategories,
    setCategories,
    branches,
    sizes,
    isReady,
    error,
    addItem,
    updateItem,
    deleteItem,
    createCategory,
    deleteCategory,
    refetchItems,
  };
}
