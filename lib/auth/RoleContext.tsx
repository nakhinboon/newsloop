'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Role } from './roles';

interface RoleContextValue {
  role: Role | null;
}

const RoleContext = createContext<RoleContextValue>({ role: null });

export function RoleProvider({
  role,
  children,
}: {
  role: Role | null;
  children: ReactNode;
}) {
  return (
    <RoleContext.Provider value={{ role }}>{children}</RoleContext.Provider>
  );
}

export function useRole(): Role | null {
  return useContext(RoleContext).role;
}
