import { API_URL } from "../config/api";
import type { User } from "../types/auth";

const TOKEN_KEY = "momentum_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getGoogleAuthUrl(): string {
  return `${API_URL}/auth/google`;
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await authFetch("/auth/me");

  if (!response.ok) {
    throw new Error("Failed to fetch current user");
  }

  return response.json() as Promise<User>;
}

export async function logout(): Promise<void> {
  const response = await authFetch("/auth/logout", { method: "POST" });

  if (!response.ok) {
    throw new Error("Failed to logout");
  }
}
