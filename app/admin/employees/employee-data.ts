export type EmployeeRow = {
  id: string;
  supabaseUserId?: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Manager' | 'Cashier';
  branch: string;
  createdAt: {
    date: string;
    time: string;
  };
};

export type EmployeeFormValues = {
  fullName: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Manager' | 'Cashier';
  branch: string;
  password: string;
  confirmPassword: string;
};

export const adminEmployeesStorageKey = 'admin-employees';

export const initialEmployeeRows: EmployeeRow[] = [];

export const createEmptyEmployeeForm = (): EmployeeFormValues => ({
  fullName: '',
  email: '',
  phone: '',
  role: 'Cashier',
  branch: '',
  password: '',
  confirmPassword: '',
});
