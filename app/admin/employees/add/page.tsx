'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeFormCard } from '../_components/employee-form-card';
import { createEmptyEmployeeForm } from '../employee-data';
import { useAdminEmployees } from '../use-admin-employees';
import { supabase } from '@/lib/supabase';
import type { Branch } from '@/lib/database.types';

export default function AddEmployeePage() {
  const router = useRouter();
  const { isReady, addEmployee } = useAdminEmployees();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formValues, setFormValues] = useState(createEmptyEmployeeForm);

  useEffect(() => {
    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, created_at, updated_at')
        .order('name', { ascending: true });
      if (!error && data) {
        setBranches(data);
      }
    };

    fetchBranches();
  }, []);

  const handleChange = (field: keyof ReturnType<typeof createEmptyEmployeeForm>, nextValue: string) => {
    setFormValues((current) => ({ ...current, [field]: nextValue }));
  };

  const handleSubmit = async () => {
    console.log('🔄 Admin Action: Attempting to add new employee', {
      formValues: { ...formValues, password: '[REDACTED]', confirmPassword: '[REDACTED]' },
      hasFullName: !!formValues.fullName.trim(),
      hasEmail: !!formValues.email.trim(),
      hasPhone: !!formValues.phone.trim(),
      hasPassword: !!formValues.password.trim(),
      hasConfirmPassword: !!formValues.confirmPassword.trim(),
      passwordsMatch: formValues.password === formValues.confirmPassword,
    });

    if (
      !formValues.fullName.trim() ||
      !formValues.email.trim() ||
      !formValues.phone.trim() ||
      !formValues.password.trim() ||
      !formValues.confirmPassword.trim()
    ) {
      console.log('❌ Admin Action Failed: Employee validation failed - missing required fields');
      return;
    }

    if (formValues.password !== formValues.confirmPassword) {
      console.log('❌ Admin Action Failed: Employee validation failed - passwords do not match');
      return;
    }

    const now = new Date();
    const newEmployee = {
      fullName: formValues.fullName.trim(),
      email: formValues.email.trim(),
      phone: formValues.phone.trim(),
      branch: formValues.branch.trim(),
      role: formValues.role,
      createdAt: {
        date: now.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
        }),
        time: now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      },
    };

    console.log('📤 Admin Action: Creating employee account', {
      ...newEmployee,
      password: '[REDACTED]',
      role: formValues.role,
    });

    const createdEmployee = await addEmployee(newEmployee);
    if (createdEmployee) {
      console.log('✅ Admin Action Success: Employee created successfully', {
        id: createdEmployee.id,
        email: createdEmployee.email,
        role: createdEmployee.role,
        branch: createdEmployee.branch,
      });
      router.push('/admin/employees');
    } else {
      console.log('❌ Admin Action Failed: Employee creation failed');
    }
  };

  if (!isReady) {
    return <main className="flex min-h-screen items-center justify-center">Loading add employee page...</main>;
  }

  return (
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
      <EmployeeFormCard
        value={formValues}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/employees')}
        branches={branches}
      />
    </section>
  );
}
