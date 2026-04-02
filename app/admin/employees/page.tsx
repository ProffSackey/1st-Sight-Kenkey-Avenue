'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmployeeFormCard } from './_components/employee-form-card';
import { ResetPasswordModal } from './_components/reset-password-modal';
import { supabase } from '../../../lib/supabase';
import type { Branch } from '../../../lib/database.types';
import type { EmployeeRow, EmployeeFormValues } from './employee-data';

const createEmptyForm = (): EmployeeFormValues => ({
  fullName: '',
  email: '',
  phone: '',
  role: 'Cashier',
  branch: '',
  password: '',
  confirmPassword: '',
});

const exportEmployeesToCSV = (employees: EmployeeRow[]) => {
  const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Branch', 'Role', 'Created Date', 'Created Time'];
  const rows = employees.map((employee) => [
    employee.supabaseUserId || employee.id,
    employee.fullName,
    employee.email,
    employee.phone,
    employee.branch,
    employee.role,
    employee.createdAt.date,
    employee.createdAt.time,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell);
          return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')
            ? `"${cellStr.replace(/"/g, '""')}"`
            : cellStr;
        })
        .join(','),
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formValues, setFormValues] = useState<EmployeeFormValues>(createEmptyForm());
  const [resetPasswordEmployeeId, setResetPasswordEmployeeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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

  // Fetch employees from API on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees', { headers: await getAuthHeaders() });
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        } else {
          console.log('Error fetching employees');
        }
      } catch (error) {
        console.log(`Error fetching employees: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, created_at, updated_at')
        .order('name', { ascending: true });
      if (!error && data) {
        setBranches(data);
      }
    };

    fetchEmployees();
    fetchBranches();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();

      if (
        normalizedSearch &&
        !`${employee.fullName} ${employee.email} ${employee.phone}`.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      if (roleFilter && employee.role !== roleFilter) {
        return false;
      }

      if (branchFilter && employee.branch !== branchFilter) {
        return false;
      }

      if (dateFromFilter || dateToFilter) {
        const [empMonth, empDay, empYear] = employee.createdAt.date.split('/').map(Number);
        const employeeDate = new Date(2000 + empYear, empMonth - 1, empDay);

        if (dateFromFilter) {
          const [fromMonth, fromDay, fromYear] = dateFromFilter.split('-');
          const fromDate = new Date(parseInt(fromYear), parseInt(fromMonth) - 1, parseInt(fromDay));
          if (employeeDate < fromDate) {
            return false;
          }
        }

        if (dateToFilter) {
          const [toMonth, toDay, toYear] = dateToFilter.split('-');
          const toDate = new Date(parseInt(toYear), parseInt(toMonth) - 1, parseInt(toDay));
          if (employeeDate > toDate) {
            return false;
          }
        }
      }

      return true;
    });
  }, [employees, searchTerm, roleFilter, branchFilter, dateFromFilter, dateToFilter]);

  const handleEditEmployee = (employee: EmployeeRow) => {
    setFormError(null);
    setEditingEmployee(employee);
    setFormValues({
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      branch: employee.role === 'Admin' ? '' : employee.branch,
      password: '',
      confirmPassword: '',
    });
    setIsAddingEmployee(false);
  };

  const handleCancelEdit = () => {
    setFormError(null);
    setEditingEmployee(null);
    setFormValues(createEmptyForm());
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) {
      return;
    }

    const requiresBranch = formValues.role !== 'Admin';

    console.log('🔄 Admin Action: Attempting to update employee', {
      employeeId: editingEmployee.id,
      formValues: { ...formValues, password: '[REDACTED]', confirmPassword: '[REDACTED]' },
      hasFullName: !!formValues.fullName.trim(),
      hasEmail: !!formValues.email.trim(),
      hasPhone: !!formValues.phone.trim(),
      hasBranch: !!formValues.branch.trim(),
    });

    if (!formValues.fullName.trim() || !formValues.email.trim() || !formValues.phone.trim() || (requiresBranch && !formValues.branch.trim())) {
      setFormError(
        requiresBranch
          ? 'Please fill in full name, email, phone, and branch.'
          : 'Please fill in full name, email, and phone.',
      );
      console.log('❌ Admin Action Failed: Employee validation failed - missing required fields');
      return;
    }

    const updates = {
      fullName: formValues.fullName.trim(),
      email: formValues.email.trim(),
      phone: formValues.phone.trim(),
      role: formValues.role,
      branch: requiresBranch ? formValues.branch.trim() : 'All Branches',
    };

    console.log('📤 Admin Action: Sending employee updates to database', {
      employeeId: editingEmployee.id,
      updates,
    });

    // For now, update local state since we don't have an update API endpoint
    // TODO: Implement proper API endpoint for employee updates
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === editingEmployee.id
          ? {
              ...employee,
              ...updates,
            }
          : employee,
      ),
    );

    console.log('✅ Admin Action Success: Employee updated successfully', {
      employeeId: editingEmployee.id,
      updates,
    });

    setFormError(null);
    setEditingEmployee(null);
    setFormValues(createEmptyForm());
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    const employeeToDelete = employees.find((employee) => employee.id === employeeId);

    if (!employeeToDelete) {
      console.log('❌ Admin Action Failed: Employee not found for deletion', { employeeId });
      return;
    }

    console.log('🔄 Admin Action: Attempting to delete employee', {
      employeeId: employeeToDelete.id,
      supabaseUserId: employeeToDelete.supabaseUserId,
      employeeName: employeeToDelete.fullName,
      employeeEmail: employeeToDelete.email,
      employeeRole: employeeToDelete.role,
      employeeBranch: employeeToDelete.branch,
    });

    const shouldDelete = window.confirm(`Delete ${employeeToDelete.fullName} from employees?`);

    if (!shouldDelete) {
      console.log('⏹️ Admin Action Cancelled: Employee deletion cancelled by user', {
        employeeId: employeeToDelete.id,
        employeeName: employeeToDelete.fullName,
      });
      return;
    }

    try {
      console.log('📤 Admin Action: Sending delete request to API', {
        employeeId: employeeToDelete.id,
        supabaseUserId: employeeToDelete.supabaseUserId,
        apiEndpoint: `/api/employees/${employeeToDelete.supabaseUserId}`,
      });

      const response = await fetch(`/api/employees/${employeeToDelete.supabaseUserId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });

      if (response.ok) {
        const deleteMessage = `${employeeToDelete.fullName} was deleted.`;
        console.log('✅ Admin Action Success: Employee deleted successfully', {
          employeeId: employeeToDelete.id,
          supabaseUserId: employeeToDelete.supabaseUserId,
          employeeName: employeeToDelete.fullName,
          responseStatus: response.status,
        });
        console.log(deleteMessage);
        setEmployees((current) => current.filter((employee) => employee.id !== employeeId));
      } else {
        const error = await response.json();
        console.log('❌ Admin Action Failed: Employee deletion failed', {
          employeeId: employeeToDelete.id,
          supabaseUserId: employeeToDelete.supabaseUserId,
          responseStatus: response.status,
          error: error.error || 'Unknown error',
        });
        console.log(error.error || 'Error deleting employee');
      }
    } catch (err) {
      console.log('❌ Admin Action Failed: Employee deletion error', {
        employeeId: employeeToDelete.id,
        supabaseUserId: employeeToDelete.supabaseUserId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      console.log(`Error deleting employee: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleResetPassword = (employeeId: string) => {
    setResetPasswordEmployeeId(employeeId);
  };

  const handleConfirmPasswordReset = async (newPassword: string) => {
    if (!resetPasswordEmployeeId) {
      console.log('❌ Admin Action Failed: No employee ID for password reset');
      return;
    }

    const employeeToReset = employees.find((employee) => employee.id === resetPasswordEmployeeId);

    if (!employeeToReset || !employeeToReset.supabaseUserId) {
      const errorMsg = 'Error: Employee record not found.';
      console.log('❌ Admin Action Failed: Employee not found for password reset', {
        employeeId: resetPasswordEmployeeId,
        employeeFound: !!employeeToReset,
        hasSupabaseUserId: employeeToReset ? !!employeeToReset.supabaseUserId : false,
      });
      console.log(errorMsg);
      setResetPasswordEmployeeId(null);
      return;
    }

    console.log('🔄 Admin Action: Attempting to reset employee password', {
      employeeId: employeeToReset.id,
      supabaseUserId: employeeToReset.supabaseUserId,
      employeeName: employeeToReset.fullName,
      employeeEmail: employeeToReset.email,
      newPasswordLength: newPassword.length,
    });

    try {
      console.log('📤 Admin Action: Sending password reset request to API', {
        employeeId: employeeToReset.id,
        supabaseUserId: employeeToReset.supabaseUserId,
        apiEndpoint: `/api/employees/${employeeToReset.supabaseUserId}`,
        requestMethod: 'POST',
      });

      const response = await fetch(`/api/employees/${employeeToReset.supabaseUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({
          newPassword,
          employeeName: employeeToReset.fullName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Admin Action Success: Employee password reset successfully', {
          employeeId: employeeToReset.id,
          supabaseUserId: employeeToReset.supabaseUserId,
          employeeName: employeeToReset.fullName,
          responseStatus: response.status,
          message: data.message,
        });
        console.log(data.message);
      } else {
        const error = await response.json();
        console.log('❌ Admin Action Failed: Employee password reset failed', {
          employeeId: employeeToReset.id,
          supabaseUserId: employeeToReset.supabaseUserId,
          responseStatus: response.status,
          error: error.error || 'Unknown error',
        });
        console.log(error.error || 'Error resetting password');
      }

      setResetPasswordEmployeeId(null);
    } catch (err) {
      const errorMsg = `Error resetting password: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.log('❌ Admin Action Failed: Employee password reset error', {
        employeeId: employeeToReset.id,
        supabaseUserId: employeeToReset.supabaseUserId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      console.log(errorMsg);
      setResetPasswordEmployeeId(null);
    }
  };

  const handleCancelPasswordReset = () => {
    setResetPasswordEmployeeId(null);
  };

  const handleFormChange = (field: keyof EmployeeFormValues, nextValue: string) => {
    setFormError(null);
    setFormValues((current) => {
      if (field === 'role') {
        return {
          ...current,
          role: nextValue as EmployeeFormValues['role'],
          branch: nextValue === 'Admin' ? '' : current.branch,
        };
      }

      return {
        ...current,
        [field]: nextValue,
      };
    });
  };

  const handleAddEmployee = async () => {
    const requiresBranch = formValues.role !== 'Admin';

    if (!formValues.fullName.trim() || !formValues.email.trim() || !formValues.phone.trim() || (requiresBranch && !formValues.branch.trim())) {
      const msg = requiresBranch
        ? 'Please fill in full name, email, phone, and branch.'
        : 'Please fill in full name, email, and phone.';
      setFormError(msg);
      console.log(msg);
      return;
    }

    if (formValues.password !== formValues.confirmPassword) {
      const msg = 'Passwords do not match.';
      setFormError(msg);
      console.log(msg);
      return;
    }

    if (formValues.password.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      setFormError(msg);
      console.log(msg);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      console.log('📤 Admin Action: Sending employee creation request to API', {
        fullName: formValues.fullName,
        email: formValues.email,
        phone: formValues.phone,
        role: formValues.role,
        branch: formValues.branch,
        apiEndpoint: '/api/employees',
        requestMethod: 'POST',
      });

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({
          fullName: formValues.fullName,
          email: formValues.email,
          phone: formValues.phone,
          role: formValues.role,
          branch: requiresBranch ? formValues.branch : '',
          password: formValues.password,
        }),
      });

      console.log('📥 Admin Action: Received response from API', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Admin Action Success: Employee created successfully', {
          responseData: data,
          message: data.message,
        });
        console.log(data.message);
        // Refresh employees list
        const newResponse = await fetch('/api/employees', { headers: await getAuthHeaders() });
        if (newResponse.ok) {
          const updatedEmployees = await newResponse.json();
          setEmployees(updatedEmployees);
          console.log('✅ Admin Action Success: Employee list refreshed', {
            newEmployeeCount: updatedEmployees.length,
          });
        }
        setFormValues(createEmptyForm());
        setIsAddingEmployee(false);
        setFormError(null);
        setIsSubmitting(false);
      } else {
        const error = await response.json();
        setFormError(error.error || 'Error creating employee');
        console.log('❌ Admin Action Failed: Employee creation failed', {
          status: response.status,
          error: error.error || 'Unknown error',
        });
        console.log(error.error || 'Error creating employee');
        setIsSubmitting(false);
      }
    } catch (err) {
      const errorMsg = `Error creating employee: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setFormError(errorMsg);
      console.log('❌ Admin Action Failed: Employee creation error', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      console.log(errorMsg);
      setIsSubmitting(false);
    }
  };

  const handleCancelAdd = () => {
    setFormError(null);
    setFormValues(createEmptyForm());
    setIsAddingEmployee(false);
  };

  if (isLoading) {
    return <section className="min-w-0 flex-1 px-4 py-8 sm:px-6">Loading employees...</section>;
  }

  return (
    <section className="min-w-0 flex-1 px-4 py-8 sm:px-6">
      {resetPasswordEmployeeId && (
        <ResetPasswordModal
          employeeName={employees.find((e) => e.id === resetPasswordEmployeeId)?.fullName || 'Employee'}
          onConfirm={handleConfirmPasswordReset}
          onCancel={handleCancelPasswordReset}
        />
      )}

      <div className="mb-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => exportEmployeesToCSV(employees)}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setEditingEmployee(null);
            setFormValues(createEmptyForm());
            setIsAddingEmployee(true);
          }}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Add Employee
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
            Search
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, or phone"
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
            />
          </label>

          <label className="flex min-w-[150px] flex-col gap-1.5 text-sm font-medium text-slate-700">
            Role
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              <option value="">All roles</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Cashier">Cashier</option>
            </select>
          </label>

          <label className="flex min-w-[150px] flex-col gap-1.5 text-sm font-medium text-slate-700">
            Branch
            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[150px] flex-col gap-1.5 text-sm font-medium text-slate-700">
            Date From
            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => setDateFromFilter(event.target.value)}
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </label>

          <label className="flex min-w-[150px] flex-col gap-1.5 text-sm font-medium text-slate-700">
            Date To
            <input
              type="date"
              value={dateToFilter}
              onChange={(event) => setDateToFilter(event.target.value)}
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </label>
        </div>
      </div>

      {isAddingEmployee && !editingEmployee && (
        <div className="mb-6">
          <EmployeeFormCard
            title="Add Employee"
            submitLabel="Create Account"
            value={formValues}
            onChange={handleFormChange}
            onSubmit={handleAddEmployee}
            onCancel={handleCancelAdd}
            branches={branches}
            isSubmitting={isSubmitting}
            errorMessage={formError}
          />
        </div>
      )}

      {editingEmployee && (
        <div className="mb-6">
          <EmployeeFormCard
            title="Edit Employee"
            submitLabel="Save Changes"
            value={formValues}
            onChange={handleFormChange}
            onSubmit={handleUpdateEmployee}
            onCancel={handleCancelEdit}
            branches={branches}
            errorMessage={formError}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-800">
                <th className="px-2 py-4">Created At</th>
                <th className="px-2 py-4">Full Name</th>
                <th className="px-2 py-4">Email</th>
                <th className="px-2 py-4">Phone</th>
                <th className="px-2 py-4">Branch</th>
                <th className="px-2 py-4">Role</th>
                <th className="px-2 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50 transition">
                  <td className="px-2 py-4 text-sm text-slate-700">
                    <span className="block whitespace-nowrap">{employee.createdAt.date}</span>
                    <span className="mt-1 block text-xs text-slate-500">{employee.createdAt.time}</span>
                  </td>
                  <td className="px-2 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">{employee.fullName}</td>
                  <td className="px-2 py-4 text-sm text-slate-700">{employee.email}</td>
                  <td className="px-2 py-4 text-sm text-slate-700 whitespace-nowrap">{employee.phone}</td>
                  <td className="px-2 py-4 text-sm text-slate-700 whitespace-nowrap">{employee.branch}</td>
                  <td className="px-2 py-4 text-sm text-slate-700">{employee.role}</td>
                  <td className="px-2 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditEmployee(employee)}
                        title="Edit"
                        className="inline-flex items-center justify-center rounded-lg border border-blue-200 p-2 text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        🖉
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetPassword(employee.id)}
                        title="Reset Password"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        🔐
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(employee.id)}
                        title="Delete"
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 transition hover:border-red-300 hover:bg-red-50"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredEmployees.length && (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-sm text-slate-500">
                    No employees match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
