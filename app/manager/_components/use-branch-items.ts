'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  size: string;
  price: string;
  stock: number;
  branch: string;
  branchId: string;
};

export function useBranchItems(branch: string) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!branch) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          branches!inner(name),
          categories!inner(name)
        `)
        .eq('branches.name', branch);

      if (error) {
        setError(error.message);
        setItems([]);
        setCategories([]);
      } else {
        const itemsData = (data || []).map(item => ({
          id: item.id,
          name: item.name,
          category: item.categories?.name || '',
          size: item.size || '',
          price: item.unit_price?.toString() || '0',
          stock: item.stock_quantity || 0,
          branch: item.branches?.name || '',
          branchId: item.branch_id,
        }));
        setItems(itemsData);
        setCategories([...new Set(itemsData.map((item) => item.category))]);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError('Failed to fetch items');
      setItems([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, categories, isLoading, error, refetchItems: fetchItems };
}
