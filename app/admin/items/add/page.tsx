'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ItemFormCard } from '../_components/item-form-card';
import { createEmptyItemForm } from '../item-data';
import { useAdminItems } from '../use-admin-items';

export default function AddItemPage() {
  const router = useRouter();
  const { categories, branches, sizes, isReady, addItem, createCategory, deleteCategory, error } = useAdminItems({ loadItems: false });
  const [formValues, setFormValues] = useState(createEmptyItemForm);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof typeof formValues, nextValue: string) => {
    if (field === 'branch') {
      const branch = branches.find((b) => b.name === nextValue);
      setFormValues((current) => ({ ...current, branch: nextValue, branchId: branch?.id ?? '' }));
    } else {
      setFormValues((current) => ({ ...current, [field]: nextValue }));
    }
  };

  const handleCreateCategory = async (category: string) => {
    if (!category.trim()) {
      return;
    }

    try {
      await createCategory(category.trim());
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    deleteCategory(categoryToDelete);

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

    const newItem = {
      branch: formValues.branch.trim(),
      branchId: formValues.branchId.trim(),
      addedBy: 'Unknown',
      name: formValues.name.trim(),
      category: normalizedCategory,
      size: formValues.size.trim(),
      timeAdded: {
        date: new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
        }),
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      },
      stock: Number(formValues.stock),
      price: normalizedPrice,
    };

    try {
      setIsSaving(true);
      const createdItem = await addItem(newItem);
      if (createdItem) {
        alert(`Item "${newItem.name}" added successfully.`);
        router.push('/admin/items');
      } else {
        alert('Failed to save item. Please try again.');
      }
    } catch (saveError) {
      console.error('Unexpected error during item creation:', saveError);
      alert('An unexpected error occurred while saving the item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady) {
    return <main className="flex min-h-screen items-center justify-center">Loading add item page...</main>;
  }

  return (
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
      <ItemFormCard
        title="Add Item"
        submitLabel="Save Item"
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
    </section>
  );
}
