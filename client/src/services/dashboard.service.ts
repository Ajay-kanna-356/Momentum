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

export interface Goal {
  id: number;
  title: string;
  status: string;
}

export interface Habit {
  id: number;
  title: string;
  goalId: number | null;
  goal?: Goal;
  streak?: number;
}

export interface HabitLog {
  id: number;
  habitId: number;
  day: string;
  completed: boolean;
}

export interface Activity {
  id: number;
  title: string;
  habitId: number | null;
  day: string;
  duration: number;
  startTime?: string;
  endTime?: string;
}

export interface JournalEntry {
  id: number;
  day: string;
  content: string;
}

export interface DashboardData {
  date: string;
  dayOfWeek: string;
  scheduledHabits: Habit[];
  habitLogs: HabitLog[];
  activities: Activity[];
  journalEntry: JournalEntry | null;
}

export async function fetchDashboardData(date?: string): Promise<DashboardData> {
  const query = date ? `?date=${date}` : '';
  const response = await authFetch(`/dashboard/today${query}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  
  return response.json();
}

export async function toggleHabitCompletion(habitId: number, day: string, completed: boolean): Promise<HabitLog> {
  const response = await authFetch(`/habits/${habitId}/logs`, {
    method: 'PUT',
    body: JSON.stringify({ day, completed }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update habit log');
  }
  
  return response.json();
}

export async function createActivity(data: { title: string; day: string; duration: number; habitId?: number | null; category?: string; startTime?: string; }): Promise<Activity> {
  const response = await authFetch('/activities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create activity');
  }
  
  return response.json();
}
