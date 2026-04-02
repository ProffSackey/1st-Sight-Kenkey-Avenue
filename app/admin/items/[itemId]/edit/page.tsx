'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ItemFormCard } from '../../_components/item-form-card';
import { ItemRow } from '../../item-data';
import type { Branch } from '../../../../../lib/database.types';
import { useAdminItems } from '../../use-admin-items';
import { supabase } from '../../../../../lib/supabase';

type EditItemFormContentProps = {
  item: ItemRow;
  categories: string[];
  branches: Branch[];
  sizes: string[];
  updateItem: ReturnType<typeof useAdminItems>['updateItem'];
  setCategories: ReturnType<typeof useAdminItems>['setCategories'];
  error: string | null;
};

function EditItemFormContent({ item, categories, branches, sizes, updateItem, setCategories, error }: EditItemFormContentProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState({
    branch: item.branch,
    branchId: item.branchId,
    name: item.name,
    category: item.category,
    size: item.size,
    stock: String(item.stock),
    price: item.price,
  });

  const handleChange = (field: keyof typeof formValues, nextValue: string) => {
    if (field === 'branch') {
      const branch = branches.find((b) => b.name === nextValue);
      setFormValues((current) => ({ ...current, branch: nextValue, branchId: branch?.id ?? '' }));
    } else {
      setFormValues((current) => ({ ...current, [field]: nextValue }));
    }
  };

  const handleCreateCategory = (category: string) => {
    if (!category.trim()) {
      return;
    }

    setCategories((current) => [...new Set([...current, category.trim()])].sort());
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    setCategories((current) => current.filter((category) => category !== categoryToDelete));

    if (formValues.category === categoryToDelete) {
      setFormValues((current) => ({ ...current, category: '' }));
    }
  };

  const handleSubmit = async () => {
    if (isSaving) {
      return;
    }

    if (
      !formValues.branch.trim() ||
      !formValues.branchId.trim() ||
      !formValues.name.trim() ||
      !formValues.category.trim() ||
      !formValues.size.trim() ||
      !formValues.stock.trim() ||
      !formValues.price.trim()
    ) {
      return;
    }

    const normalizedCategory = formValues.category.trim();
    const normalizedPrice = formValues.price.trim().startsWith('GHC')
      ? formValues.price.trim()
      : `GHC${formValues.price.trim()}`;

    if (!categories.includes(normalizedCategory)) {
      setCategories((current) => [...new Set([...current, normalizedCategory])].sort());
    }

    const updates = {
      branch: formValues.branch.trim(),
      branchId: formValues.branchId.trim(),
      name: formValues.name.trim(),
      category: normalizedCategory,
      size: formValues.size.trim(),
      stock: Number(formValues.stock),
      price: normalizedPrice,
    };

    try {
      setIsSaving(true);
      const updatedItem = await updateItem(item.id, updates);
      if (updatedItem) {
        router.push('/admin/items');
      } else {
        alert('Failed to update item. Please try again.');
      }
    } catch (updateError) {
      console.error('Unexpected error during item update', updateError);
      alert('An unexpected error occurred while updating the item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ItemFormCard
      title="Edit Item"
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      isSubmitting={isSaving}
      value={formValues}
      categories={categories}
      branches={branches}
      sizes={sizes}
      onChange={handleChange}
      onCreateCategory={handleCreateCategory}
      onDeleteCategory={handleDeleteCategory}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/admin/items')}
      error={error}
    />
  );
}

export default function EditItemPage() {
  const params = useParams<{ itemId: string }>();
  const router = useRouter();
  const { categories, setCategories, branches, sizes, isReady, updateItem, error } = useAdminItems({ loadItems: false });
  const [itemToEdit, setItemToEdit] = useState<ItemRow | null>(null);
  const [itemLoading, setItemLoading] = useState(false);

  const itemId = Array.isArray(params?.itemId) ? params.itemId[0] : params?.itemId;
  useEffect(() => {
    if (!itemId) {
      return;
    }

    let active = true;
    const loadItem = async () => {
      setItemLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/items/${itemId}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (!response.ok) {
        if (active) {
          setItemToEdit(null);
          setItemLoading(false);
        }
        return;
      }

      const row = await response.json();
      if (!active) return;

      const mapped: ItemRow = {
        id: row.id,
        branchId: row.branch_id,
        addedBy: row.added_by_name || row.added_by_email || row.added_by || 'Unknown',
        name: row.name,
        category: row.category_name || 'Unknown',
        size: row.size || '',
        branch: row.branch_name || 'Unknown',
        timeAdded: {
          date: new Date(row.created_at).toLocaleDateString(),
          time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        stock: Number(row.stock_quantity) || 0,
        price: `GHC${Number(row.unit_price || 0).toFixed(2)}`,
      };

      setItemToEdit(mapped);
      setItemLoading(false);
    };

    void loadItem();
    return () => {
      active = false;
    };
  }, [itemId]);

  if (!isReady || itemLoading) {
    return <main className="flex min-h-screen items-center justify-center">Loading edit item page...</main>;
  }

  return (
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
      {!itemToEdit ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Item not found</h2>
          <p className="mt-2 text-sm text-slate-500">The item you want to edit is no longer available.</p>
          <button
            type="button"
            onClick={() => router.push('/admin/items')}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to Items
          </button>
        </div>
      ) : (
        <EditItemFormContent
          key={itemToEdit.id}
          item={itemToEdit}
          categories={categories}
          branches={branches}
          sizes={sizes}
          updateItem={updateItem}
          setCategories={setCategories}
          error={error}
        />
      )}
    </section>
  );
}
