import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  walletAddress?: string;
  avatarUrl?: string;
}

interface AppStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hiragen_token');
    }
    set({ user: null, isAuthenticated: false });
  },
}));
