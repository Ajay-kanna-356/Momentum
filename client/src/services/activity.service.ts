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

export interface Activity {
  id: number;
  userId: number;
  habitId: number | null;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  day: string;
  createdAt: string;
  updatedAt: string;
  habit?: {
    id: number;
    title: string;
  };
}

export interface ActivitiesResponse {
  items: Activity[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateActivityDto {
  title: string;
  day: string;
  description?: string;
  habitId?: number | null;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

export interface UpdateActivityDto {
  title?: string;
  day?: string;
  description?: string;
  habitId?: number | null;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

export interface ActivityFilters {
  day?: string;
  from?: string;
  to?: string;
  habitId?: number;
  page?: number;
  limit?: number;
}

export async function fetchActivities(filters: ActivityFilters = {}): Promise<ActivitiesResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });
  
  const queryString = queryParams.toString();
  const url = `/activities${queryString ? `?${queryString}` : ''}`;
  
  const response = await authFetch(url);
  if (!response.ok) throw new Error('Failed to fetch activities');
  return response.json();
}

export async function fetchActivity(id: number): Promise<Activity> {
  const response = await authFetch(`/activities/${id}`);
  if (!response.ok) throw new Error('Failed to fetch activity');
  return response.json();
}

export async function createActivityReq(data: CreateActivityDto): Promise<Activity> {
  const response = await authFetch('/activities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create activity');
  return response.json();
}

export async function updateActivity(id: number, data: UpdateActivityDto): Promise<Activity> {
  const response = await authFetch(`/activities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update activity');
  return response.json();
}

export async function deleteActivity(id: number): Promise<void> {
  const response = await authFetch(`/activities/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete activity');
}
