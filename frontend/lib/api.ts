const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) window.localStorage.setItem('flowboard_access_token', token);
    else window.localStorage.removeItem('flowboard_access_token');
  }
}

export function loadAccessToken() {
  if (typeof window !== 'undefined') accessToken = window.localStorage.getItem('flowboard_access_token');
  return accessToken;
}

export function setCurrentUser(user: ApiUser | null) {
  if (typeof window === 'undefined') return;
  if (user) window.localStorage.setItem('flowboard_user', JSON.stringify(user));
  else window.localStorage.removeItem('flowboard_user');
}

export function loadCurrentUser() {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem('flowboard_user');
  return value ? JSON.parse(value) as ApiUser : null;
}

async function refreshAccessToken() {
  const response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!response.ok) return null;
  const result = (await response.json()) as { data: { accessToken: string } };
  setAccessToken(result.data.accessToken);
  return result.data.accessToken;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, options, false);
    setAccessToken(null);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const err = new Error(body?.error?.message ?? `Request failed with status ${response.status}`);
    (err as ApiError).status = response.status;
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/* ---------- Types ---------- */

export interface ApiError extends Error {
  status?: number;
}

export type ApiUser = { id: string; name: string; email: string };

export type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  position: number;
  version: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiColumn = {
  id: string;
  name: string;
  boardId: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  tasks: ApiTask[];
};

export type ApiMember = {
  id: string;
  boardId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  addedAt?: string;
  user: ApiUser;
};

export type ApiBoard = {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
  columns: ApiColumn[];
  members: ApiMember[];
  _count?: { columns: number };
};

export type AuthResult = { accessToken: string; user: ApiUser };
export type ApiNote = { id: string; title: string; content: string; createdAt: string; updatedAt: string };

/* ---------- Auth API ---------- */

export const authApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<{ data: AuthResult }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  register: (body: { name: string; email: string; password: string }) =>
    apiRequest<{ data: AuthResult }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    apiRequest<void>('/auth/logout', { method: 'POST' }),
};

/* ---------- Board API ---------- */

export const boardApi = {
  /* Board CRUD */
  list: () =>
    apiRequest<{ data: ApiBoard[] }>('/boards'),

  get: (id: string) =>
    apiRequest<{ data: ApiBoard }>(`/boards/${id}`),

  create: (name: string) =>
    apiRequest<{ data: ApiBoard }>('/boards', { method: 'POST', body: JSON.stringify({ name }) }),

  update: (id: string, name: string) =>
    apiRequest<{ data: ApiBoard }>(`/boards/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),

  delete: (id: string) =>
    apiRequest<void>(`/boards/${id}`, { method: 'DELETE' }),

  /* Members */
  getMembers: (boardId: string) =>
    apiRequest<{ data: ApiMember[] }>(`/boards/${boardId}/members`),

  addMember: (boardId: string, body: { email: string; role: 'EDITOR' | 'VIEWER' }) =>
    apiRequest<{ data: ApiMember }>(`/boards/${boardId}/members`, { method: 'POST', body: JSON.stringify(body) }),

  removeMember: (boardId: string, userId: string) =>
    apiRequest<void>(`/boards/${boardId}/members/${userId}`, { method: 'DELETE' }),

  /* Columns */
  addColumn: (boardId: string, name: string) =>
    apiRequest<{ data: ApiColumn }>(`/boards/${boardId}/columns`, { method: 'POST', body: JSON.stringify({ name }) }),

  updateColumn: (columnId: string, name: string) =>
    apiRequest<{ data: ApiColumn }>(`/columns/${columnId}`, { method: 'PATCH', body: JSON.stringify({ name }) }),

  deleteColumn: (columnId: string) =>
    apiRequest<void>(`/columns/${columnId}`, { method: 'DELETE' }),

  /* Tasks */
  addTask: (columnId: string, body: { title: string; description?: string }) =>
    apiRequest<{ data: ApiTask }>(`/columns/${columnId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),

  updateTask: (taskId: string, body: { title?: string; description?: string }) =>
    apiRequest<{ data: ApiTask }>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteTask: (taskId: string) =>
    apiRequest<void>(`/tasks/${taskId}`, { method: 'DELETE' }),

  moveTask: (args: { taskId: string; destinationColumnId: string; destinationIndex: number; expectedVersion: number }) =>
    apiRequest<{ data: ApiTask }>(`/tasks/${args.taskId}/move`, {
      method: 'POST',
      body: JSON.stringify({
        destinationColumnId: args.destinationColumnId,
        destinationIndex: args.destinationIndex,
        expectedVersion: args.expectedVersion,
      }),
    }),
};

export const workspaceApi = {
  listNotes: () => apiRequest<{ data: ApiNote[] }>('/notes'),
  createNote: (body: { title: string; content: string }) => apiRequest<{ data: ApiNote }>('/notes', { method: 'POST', body: JSON.stringify(body) }),
  updateNote: (id: string, body: { title: string; content: string }) => apiRequest<{ data: ApiNote }>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteNote: (id: string) => apiRequest<void>(`/notes/${id}`, { method: 'DELETE' }),
};
