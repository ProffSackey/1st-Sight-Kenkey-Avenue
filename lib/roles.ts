export const roleRoutes = {
  admin: '/admin',
  manager: '/manager',
  cashier: '/cashier',
} as const;

export type AppRole = keyof typeof roleRoutes;

export const normalizeRole = (role: unknown): AppRole | null => {
  if (typeof role !== 'string') {
    return null;
  }

  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === 'admin' || normalizedRole === 'manager' || normalizedRole === 'cashier') {
    return normalizedRole;
  }

  return null;
};

export const getRouteForRole = (role: unknown) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? roleRoutes[normalizedRole] : null;
};
