'use client';

import { EmployeeFormValues } from '../employee-data';
import type { Branch } from '../../../../lib/database.types';

type EmployeeFormCardProps = {
  value: EmployeeFormValues;
  onChange: (field: keyof EmployeeFormValues, nextValue: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  branches: Branch[];
  title?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

export function EmployeeFormCard({
  value,
  onChange,
  onSubmit,
  onCancel,
  branches,
  title = 'Add Employee',
  submitLabel = 'Create Account',
  isSubmitting = false,
  errorMessage = null,
}: EmployeeFormCardProps) {
  const requiresBranch = value.role !== 'Admin';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Create a staff account for an admin, manager, or cashier.</p>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Full Name
          <input
            type="text"
            value={value.fullName}
            onChange={(event) => onChange('fullName', event.target.value)}
            disabled={isSubmitting}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={value.email}
            onChange={(event) => onChange('email', event.target.value)}
            disabled={isSubmitting}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Phone
          <input
            type="text"
            value={value.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            disabled={isSubmitting}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Role
          <select
            value={value.role}
            onChange={(event) => onChange('role', event.target.value)}
            disabled={isSubmitting}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="Manager">Manager</option>
            <option value="Cashier">Cashier</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Branch {requiresBranch ? '' : '(Not required for admin)'}
          <select
            value={value.branch}
            onChange={(event) => onChange('branch', event.target.value)}
            disabled={isSubmitting || !requiresBranch}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{requiresBranch ? 'Select a branch' : 'All Branches'}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          {!requiresBranch && <span className="text-xs font-normal text-slate-500">Admins can access every branch.</span>}
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            value={value.password}
            onChange={(event) => onChange('password', event.target.value)}
            disabled={isSubmitting}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Confirm Password
          <input
            type="password"
            value={value.confirmPassword}
            onChange={(event) => onChange('confirmPassword', event.target.value)}
            disabled={isSubmitting}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>

        <div className="flex items-end gap-3 sm:col-span-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
