import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Organisation } from '../types';

interface AuthState {
  user: User | null;
  organisation: Organisation | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (payload: {
    user: User;
    organisation: Organisation;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organisation: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: ({ user, organisation, accessToken, refreshToken }) =>
        set({ user, organisation, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({
          user: null,
          organisation: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'stockwise-auth',
      // Only persist tokens and user — not loading states
      partialize: (state) => ({
        user: state.user,
        organisation: state.organisation,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
