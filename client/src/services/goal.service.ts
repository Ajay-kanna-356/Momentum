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

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface HabitPreview {
  id: number;
  title: string;
  status: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  status: GoalStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  habits?: HabitPreview[];
}

export interface CreateGoalDto {
  title: string;
  description?: string;
  targetDate?: string;
}

export interface UpdateGoalDto {
  title?: string;
  description?: string;
  status?: GoalStatus;
  targetDate?: string;
}

export async function fetchGoals(): Promise<Goal[]> {
  const response = await authFetch('/goals');
  if (!response.ok) throw new Error('Failed to fetch goals');
  return response.json();
}

export async function fetchGoal(id: number): Promise<Goal> {
  const response = await authFetch(`/goals/${id}`);
  if (!response.ok) throw new Error('Failed to fetch goal');
  return response.json();
}

export async function createGoal(data: CreateGoalDto): Promise<Goal> {
  const response = await authFetch('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create goal');
  return response.json();
}

export async function updateGoal(id: number, data: UpdateGoalDto): Promise<Goal> {
  const response = await authFetch(`/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update goal');
  return response.json();
}

export async function deleteGoal(id: number): Promise<void> {
  const response = await authFetch(`/goals/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete goal');
}
