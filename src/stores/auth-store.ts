import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BeneficiaryType = 'family' | 'single';

export interface User {
  id: string;
  type: BeneficiaryType;
  name: string;
  phone: string;
  fingerprint: string | null;
  regionId: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user: User) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'gas-auth-storage',
    }
  )
);
