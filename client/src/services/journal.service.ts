import { API_URL } from "../config/api";
import { getStoredToken } from "./auth.service";

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

export interface JournalEntry {
  id: number;
  userId: number;
  day: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchJournalEntryByDay(day: string): Promise<JournalEntry | null> {
  const response = await authFetch(`/journal/by-day?day=${day}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch journal entry');
  return response.json();
}

export async function createJournalEntry(day: string, content: string): Promise<JournalEntry> {
  const response = await authFetch('/journal', {
    method: 'POST',
    body: JSON.stringify({ day, content }),
  });
  if (!response.ok) throw new Error('Failed to create journal entry');
  return response.json();
}

export async function updateJournalEntry(id: number, content: string): Promise<JournalEntry> {
  const response = await authFetch(`/journal/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('Failed to update journal entry');
  return response.json();
}

export async function deleteJournalEntry(id: number): Promise<void> {
  const response = await authFetch(`/journal/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete journal entry');
}
