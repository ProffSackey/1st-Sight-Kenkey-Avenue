'use client';

import { useEffect, useState } from 'react';
import { EmployeeRow } from './employee-data';
import { supabase } from '@/lib/supabase';

const isEmployeeRow = (value: unknown): value is EmployeeRow => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const createdAt = candidate.createdAt as Record<string, unknown> | undefined;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.fullName === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.phone === 'string' &&
    typeof candidate.role === 'string' &&
    !!createdAt &&
    typeof createdAt.date === 'string' &&
    typeof createdAt.time === 'string'
  );
};

export function useAdminEmployees() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchEmployees = async () => {
    setError(null);
    const { data, error } = await supabase
      .from('employees')
      .select('*');
    if (error) {
      setError(error.message);
      setEmployees([]);
    } else {
      setEmployees(data || []);
    }
  };

  // Fetch employees from Supabase
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsReady(false);
      await refetchEmployees();
      setIsReady(true);
    };
    fetchEmployees();
  }, []);

  // Add employee
  const addEmployee = async (employee: Omit<EmployeeRow, 'id'>) => {
    setError(null);
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select();
    if (error) {
      setError(error.message);
      return null;
    }
    await refetchEmployees();
    return data ? data[0] : null;
  };

  // Update employee
  const updateEmployee = async (id: string, updates: Partial<EmployeeRow>) => {
    setError(null);
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) {
      setError(error.message);
      return null;
    }
    await refetchEmployees();
    return data ? data[0] : null;
  };

  // Delete employee
  const deleteEmployee = async (id: string) => {
    setError(null);
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    if (error) {
      setError(error.message);
      return false;
    }
    await refetchEmployees();
    return true;
  };

  return { employees, setEmployees, isReady, error, addEmployee, updateEmployee, deleteEmployee };
}
