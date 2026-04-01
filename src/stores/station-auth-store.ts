import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StationAdmin {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  stationId: string;
  stationName: string | null;
  regionId: string | null;
  regionName: string | null;
}

interface StationAuthState {
  admin: StationAdmin | null;
  isAuthenticated: boolean;
  setAuth: (admin: StationAdmin) => void;
  clearAuth: () => void;
}

export const useStationAuthStore = create<StationAuthState>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,
      setAuth: (admin: StationAdmin) => set({ admin, isAuthenticated: true }),
      clearAuth: () => set({ admin: null, isAuthenticated: false }),
    }),
    { name: 'gas-station-auth-storage' }
  )
);
