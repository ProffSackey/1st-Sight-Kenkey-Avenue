'use client';

import { useMemo, useState } from 'react';
import type { Branch } from '../../../../lib/database.types';
import { ItemFormValues } from '../item-data';

type ItemFormCardProps = {
  title: string;
  submitLabel: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
  value: ItemFormValues;
  categories: string[];
  branches: Branch[];
  sizes: string[];
  onChange: (field: keyof ItemFormValues, nextValue: string) => void;
  onCreateCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  error?: string | null;
};

export function ItemFormCard({
  title,
  submitLabel,
  submittingLabel = 'Saving...',
  isSubmitting = false,
  value,
  categories,
  branches,
  sizes,
  onChange,
  onCreateCategory,
  onDeleteCategory,
  onSubmit,
  onCancel,
  error,
}: ItemFormCardProps) {
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  // Validation states
  const isBranchValid = !!value.branch.trim();
  const isBranchIdValid = !!value.branchId.trim();
  const isNameValid = !!value.name.trim();
  const isCategoryValid = !!value.category.trim();
  const isSizeValid = !!value.size.trim();
  const isStockValid = !!value.stock.trim();
  const isPriceValid = !!value.price.trim();

  const isFormValid = isBranchValid && isBranchIdValid && isNameValid && isCategoryValid && isSizeValid && isStockValid && isPriceValid;
  const canSubmit = isFormValid && !isSubmitting;

  const normalizedCategoryInput = value.category.trim().toLowerCase();
  const filteredCategoryOptions = useMemo(
    () => categories.filter((category) => category.toLowerCase().includes(normalizedCategoryInput)),
    [categories, normalizedCategoryInput],
  );
  const canCreateCategory =
    Boolean(value.category.trim()) &&
    !categories.some((category) => category.toLowerCase() === normalizedCategoryInput);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Branch
          <select
            value={value.branch}
            onChange={(event) => {
              const selectedBranch = event.target.value;
              const matchedBranch = branches.find((branch) => branch.name === selectedBranch);
              onChange('branch', selectedBranch);
              onChange('branchId', matchedBranch ? matchedBranch.id : '');
            }}
            className={`h-10 rounded-xl border px-3 text-sm text-slate-900 outline-none focus:border-slate-900 ${
              !isBranchValid ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
            }`}
          >
            <option value="">Select a branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
          {!isBranchValid && (
            <p className="text-xs text-red-600">Branch is required</p>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Branch ID
          <input
            type="text"
            value={value.branchId}
            readOnly
            className={`h-10 rounded-xl border px-3 text-sm text-slate-900 outline-none ${
              !isBranchIdValid ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-100'
            }`}
          />
          {!isBranchIdValid && (
            <p className="text-xs text-red-600">Branch ID is required</p>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Name
          <input
            type="text"
            value={value.name}
            onChange={(event) => onChange('name', event.target.value)}
            className={`h-10 rounded-xl border px-3 text-sm text-slate-900 outline-none focus:border-slate-900 ${
              !isNameValid ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
            }`}
          />
          {!isNameValid && (
            <p className="text-xs text-red-600">Name is required</p>
          )}
        </label>

        <div className="relative flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Category
          <input
            type="text"
            value={value.category}
            onChange={(event) => {
              onChange('category', event.target.value);
              setIsCategoryMenuOpen(true);
            }}
            onFocus={() => setIsCategoryMenuOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setIsCategoryMenuOpen(false), 120);
            }}
            placeholder="Type or select category"
            className={`h-10 rounded-xl border px-3 text-sm text-slate-900 outline-none focus:border-slate-900 ${
              !isCategoryValid ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
            }`}
          />
          {!isCategoryValid && (
            <p className="text-xs text-red-600">Category is required</p>
          )}

          {isCategoryMenuOpen && (
            <div className="absolute top-full z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
              {filteredCategoryOptions.map((category) => (
                <div
                  key={category}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onMouseDown={() => {
                      onChange('category', category);
                      setIsCategoryMenuOpen(false);
                    }}
                    className="flex-1 text-left"
                  >
                    {category}
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => onDeleteCategory(category)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
                    aria-label={`Delete ${category}`}
                  >
                    x
                  </button>
                </div>
              ))}

              {canCreateCategory && (
                <button
                  type="button"
                  onMouseDown={() => {
                    const normalizedCategory = value.category.trim();
                    onCreateCategory(normalizedCategory);
                    onChange('category', normalizedCategory);
                    setIsCategoryMenuOpen(false);
                  }}
                  className="mt-1 flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <span>Add &quot;{value.category.trim()}&quot;</span>
                  <span>+</span>
                </button>
              )}

              {!filteredCategoryOptions.length && !canCreateCategory && (
                <p className="px-3 py-2 text-sm text-slate-500">No categories available.</p>
              )}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Size
          <input
              list="size-options"
              value={value.size}
              onChange={(event) => onChange('size', event.target.value)}
              placeholder="Type or select size"
              className={`h-10 rounded-xl border px-3 text-sm text-slate-900 outline-none focus:border-slate-900 ${
                !isSizeValid ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
              }`}
            />
            <datalist id="size-options">
              {sizes.map((sizeValue) => (
                <option key={sizeValue} value={sizeValue} />
              ))}
            </datalist>
            {!isSizeValid && (
              <p className="text-xs text-red-600">Size is required</p>
            )}
          Stock
          <input
            type="number"
            min="0"
            value={value.stock}
            onChange={(event) => onChange('stock', event.target.value)}
            className={`h-10 rounded-xl border px-3 text-sm text-slate-900 outline-none focus:border-slate-900 ${
              !isStockValid ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
            }`}
          />
          {!isStockValid && (
            <p className="text-xs text-red-600">Stock is required</p>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Price
          <input
            type="text"
            value={value.price}
            onChange={(event) => onChange('price', event.target.value)}
            placeholder="GHC120.00"
            className={`h-10 rounded-xl border px-3 text-sm text-slate-900 outline-none focus:border-slate-900 ${
              !isPriceValid ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
            }`}
          />
          {!isPriceValid && (
            <p className="text-xs text-red-600">Price is required</p>
          )}
        </label>

        <div className="flex items-end gap-3 sm:col-span-2 xl:col-span-3">
          <button
            type="button"
            onClick={() => {
              if (!canSubmit) {
                console.log('❌ Form Validation Failed: Cannot submit item - validation errors present', {
                  isBranchValid,
                  isBranchIdValid,
                  isNameValid,
                  isCategoryValid,
                  isSizeValid,
                  isStockValid,
                  isPriceValid,
                  formValues: value,
                });
                // Show alert for validation errors
                alert('Please fill in all required fields before saving.');
                return;
              }
              onSubmit();
            }}
            disabled={!canSubmit}
            className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-white transition ${
              canSubmit
                ? 'bg-slate-900 hover:bg-slate-800 hover:shadow-md cursor-pointer'
                : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
