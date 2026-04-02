'use client';

import { useState } from 'react';

type AccountPasswordModalProps = {
  accountLabel: string;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

export function AccountPasswordModal({
  accountLabel,
  onClose,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}: AccountPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setLocalError('Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setLocalError(null);
    await onSubmit(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">Reset Password</h2>
          <p className="mt-1 text-sm text-slate-500">Update the password for {accountLabel}.</p>
        </div>

        {(localError || errorMessage) && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || errorMessage}
          </div>
        )}

        <div className="space-y-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setLocalError(null);
              }}
              disabled={isSubmitting}
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setLocalError(null);
              }}
              disabled={isSubmitting}
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Save Password'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
