'use client';

import { useState } from 'react';

type ResetPasswordModalProps = {
  employeeName: string;
  onConfirm: (newPassword: string) => void;
  onCancel: () => void;
};

export function ResetPasswordModal({ employeeName, onConfirm, onCancel }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      const msg = 'Please fill in all fields.';
      console.log(msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'Passwords do not match.';
      console.log(msg);
      return;
    }

    if (newPassword.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      console.log(msg);
      return;
    }

    onConfirm(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Reset Password</h2>
        <p className="mt-1 text-sm text-slate-600">Enter a new password for {employeeName}</p>

        <div className="mt-4 space-y-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Reset Password
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
