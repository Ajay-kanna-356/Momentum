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

export type HabitStatus = 'active' | 'archived';

export interface HabitSchedule {
  id: number;
  habitId: number;
  dayOfWeek: string;
}

export interface HabitLog {
  id: number;
  habitId: number;
  day: string;
  completed: boolean;
}

export interface Habit {
  id: number;
  title: string;
  description: string | null;
  status: HabitStatus;
  goalId: number | null;
  createdAt: string;
  updatedAt: string;
  schedules?: HabitSchedule[];
  logs?: HabitLog[];
  goal?: {
    id: number;
    title: string;
  };
}

export interface CreateHabitDto {
  title: string;
  description?: string;
  goalId?: number | null;
  scheduleDays?: string[];
}

export interface UpdateHabitDto {
  title?: string;
  description?: string;
  goalId?: number | null;
  status?: HabitStatus;
  scheduleDays?: string[];
}

export async function fetchHabits(): Promise<Habit[]> {
  const response = await authFetch('/habits');
  if (!response.ok) throw new Error('Failed to fetch habits');
  return response.json();
}

export async function fetchHabit(id: number): Promise<Habit> {
  const response = await authFetch(`/habits/${id}`);
  if (!response.ok) throw new Error('Failed to fetch habit');
  return response.json();
}

export async function replaceSchedule(habitId: number, daysOfWeek: string[]): Promise<any> {
  const response = await authFetch(`/habits/${habitId}/schedule`, {
    method: 'PUT',
    body: JSON.stringify({ daysOfWeek }),
  });
  if (!response.ok) throw new Error('Failed to update habit schedule');
  return response.json();
}

export async function createHabit(data: CreateHabitDto): Promise<Habit> {
  const { scheduleDays, ...bodyData } = data;
  const response = await authFetch('/habits', {
    method: 'POST',
    body: JSON.stringify(bodyData),
  });
  if (!response.ok) throw new Error('Failed to create habit');
  const created: Habit = await response.json();

  if (scheduleDays && scheduleDays.length > 0) {
    try {
      await replaceSchedule(created.id, scheduleDays);
      created.schedules = scheduleDays.map((d, i) => ({ id: i, habitId: created.id, dayOfWeek: d }));
    } catch (e) {
      console.error('Failed to attach schedule to habit:', e);
    }
  }

  return created;
}

export async function updateHabit(id: number, data: UpdateHabitDto): Promise<Habit> {
  const { scheduleDays, ...bodyData } = data;
  const response = await authFetch(`/habits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(bodyData),
  });
  if (!response.ok) throw new Error('Failed to update habit');
  const updated: Habit = await response.json();

  if (scheduleDays !== undefined) {
    try {
      await replaceSchedule(id, scheduleDays);
      updated.schedules = scheduleDays.map((d, i) => ({ id: i, habitId: id, dayOfWeek: d }));
    } catch (e) {
      console.error('Failed to update habit schedule:', e);
    }
  }

  return updated;
}

export async function deleteHabit(id: number): Promise<void> {
  const response = await authFetch(`/habits/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete habit');
}

export async function fetchUserHabitLogs(from?: string, to?: string): Promise<HabitLog[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await authFetch(`/habit-logs${query}`);
  if (!response.ok) throw new Error('Failed to fetch habit logs');
  return response.json();
}

