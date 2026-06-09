import { useMutation } from '@tanstack/react-query';
import { api, extractData, extractError} from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { AuthResponse } from '../types';

// ── API functions ─────────────────────────────────────────

interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organisationName: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

async function registerUser(data: RegisterPayload): Promise<AuthResponse> {
  const res = await api.post('/auth/register', data);
  return extractData(res);
}

async function loginUser(data: LoginPayload): Promise<AuthResponse> {
  const res = await api.post('/auth/login', data);
  return extractData(res);
}

async function logoutUser(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

// ── Hooks ─────────────────────────────────────────────────

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => setAuth(data),
  });
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => setAuth(data),
  });
}

export function useLogout() {
  const { refreshToken, logout } = useAuthStore();

  return useMutation({
    mutationFn: () => logoutUser(refreshToken ?? ''),
    onSettled: () => logout(), // always clear local state
  });
}
