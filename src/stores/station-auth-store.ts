import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV();

export interface StationAdmin {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  stationId: string;
  stationName: string | null;
  regionId: string | null;
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
      setAuth: (admin) => set({ admin, isAuthenticated: true }),
      clearAuth: () => set({ admin: null, isAuthenticated: false }),
    }),
    {
      name: 'gas-station-auth-storage',
      storage: createJSONStorage(() => ({
        getItem: (key) => mmkv.getString(key) ?? null,
        setItem: (key, value) => mmkv.set(key, value),
        removeItem: (key) => mmkv.remove(key),
      })),
    }
  )
);
