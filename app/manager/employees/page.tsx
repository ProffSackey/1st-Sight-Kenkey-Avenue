'use client';

import { useEffect, useMemo, useState } from 'react';
import { ManagerShell } from '../_components/manager-shell';
import { useManagerAuthGuard } from '../_components/use-manager-auth-guard';
import type { EmployeeRow } from '@/app/admin/employees/employee-data';
import { supabase } from '@/lib/supabase';

export default function ManagerEmployeesPage() {
  const { email, fullName, branch, isLoading: authLoading } = useManagerAuthGuard('Loading branch employees...');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
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
    const fetchEmployees = async () => {
      setIsLoadingEmployees(true);
      setError(null);

      try {
        const response = await fetch('/api/employees', { headers: await getAuthHeaders() });
        if (!response.ok) {
          throw new Error('Failed to fetch employees.');
        }

        const data = (await response.json()) as EmployeeRow[];
        setEmployees(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch employees.');
        setEmployees([]);
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  const branchEmployees = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return employees.filter((employee) => {
      if (employee.branch !== branch) {
        return false;
      }

      if (roleFilter && employee.role !== roleFilter) {
        return false;
      }

      if (
        normalizedSearch &&
        !`${employee.fullName} ${employee.email} ${employee.phone}`.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      return true;
    });
  }, [employees, branch, roleFilter, searchTerm]);

  if (authLoading || isLoadingEmployees) {
    return <main className="flex min-h-screen items-center justify-center">Loading branch employees...</main>;
  }

  return (
    <ManagerShell email={email} fullName={fullName} branch={branch}>
      <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-600">Branch Team</p>
              <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
              <p className="text-sm text-slate-500">Showing only employees assigned to {branch}.</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Team Members</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{branchEmployees.length}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Search
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, email, or phone"
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="flex min-w-[180px] flex-col gap-1.5 text-sm font-medium text-slate-700">
              Role
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="">All roles</option>
                <option value="Manager">Manager</option>
                <option value="Cashier">Cashier</option>
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {error ? (
            <div className="px-6 py-5 text-sm text-red-600">{error}</div>
          ) : branchEmployees.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No employees found for {branch}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-800">
                    <th className="px-4 py-4">Created At</th>
                    <th className="px-4 py-4">Full Name</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Phone</th>
                    <th className="px-4 py-4">Branch</th>
                    <th className="px-4 py-4">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-sm text-slate-700">
                        <span className="block whitespace-nowrap">{employee.createdAt.date}</span>
                        <span className="mt-1 block text-xs text-slate-500">{employee.createdAt.time}</span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">{employee.fullName}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{employee.email}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{employee.phone || '-'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{employee.branch}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{employee.role}</td>
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
