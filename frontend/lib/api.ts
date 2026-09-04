const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
// Tolerate a scheme-less host (e.g. a Render service hostname): default to https,
// but keep http for localhost so local development still works.
const API_URL = /^https?:\/\//i.test(RAW_API_URL)
  ? RAW_API_URL
  : `${/^(localhost|127\.|0\.0\.0\.0)/.test(RAW_API_URL) ? 'http' : 'https'}://${RAW_API_URL}`;
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
  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
  } catch {
    // Backend unreachable: treat as "not refreshed" instead of letting a raw
    // network TypeError escape the retry path.
    return null;
  }
  if (!response.ok) return null;
  const result = (await response.json().catch(() => null)) as { data?: { accessToken?: string } } | null;
  const token = result?.data?.accessToken;
  if (!token) return null;
  setAccessToken(token);
  return token;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  // fetch() rejects with a TypeError only when NO HTTP response was received:
  // the API is down, the host/port is wrong, or the request was blocked. Because
  // the request never reached the server, retrying is safe even for POSTs (no
  // double-submit risk). Try a few times with a short backoff to ride out a
  // dev-server restart before surfacing an error.
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
      break;
    } catch {
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  if (!response) {
    // Every attempt failed at the network level. Turn the browser's bare
    // "Failed to fetch" into an actionable message.
    const err = new Error(
      `Cannot reach the FlowBoard API at ${API_URL}. Make sure the backend server is running and that NEXT_PUBLIC_API_URL points to it.`,
    ) as ApiError;
    err.status = 0;
    throw err;
  }
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
  // Guard the happy path too: a 200 with an empty or non-JSON body would
  // otherwise throw a confusing SyntaxError instead of resolving.
  return (await response.json().catch(() => ({}))) as T;
}

/* ---------- Types ---------- */

export interface ApiError extends Error {
  status?: number;
}

export type ApiUser = { id: string; name: string; email: string };

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  position: number;
  version: number;
  priority?: Priority;
  dueDate?: string | null;
  startDate?: string | null;
  labels?: string[];
  assigneeId?: string | null;
  assignee?: ApiUser | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskMetadata = {
  title?: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: string | null;
  startDate?: string | null;
  labels?: string[];
  assigneeId?: string | null;
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

export type BoardExportTask = {
  title: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: string | null;
  startDate?: string | null;
  labels?: string[];
};
export type BoardExport = {
  version: number;
  name: string;
  exportedAt?: string;
  columns: { name: string; tasks: BoardExportTask[] }[];
};

export type NotificationType = 'board_shared' | 'task_assigned' | 'member_added' | 'role_changed' | 'automation';
export type ApiNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  boardId: string | null;
  taskId: string | null;
  actorId: string | null;
  read: boolean;
  createdAt: string;
};

export type FavoriteBoard = {
  boardId: string;
  board: ApiBoard;
};

export type ReportSummary = {
  totals: { boards: number; tasks: number; completed: number; overdue: number; upcoming: number; assignedToMe: number };
  byPriority: Record<string, number>;
  byBoard: { boardId: string; name: string; total: number; done: number }[];
  byStatus: { columnName: string; count: number }[];
};

export type SearchResults = {
  boards: { id: string; name: string }[];
  tasks: { id: string; title: string; priority: Priority; boardId: string; columnName: string }[];
  notes: { id: string; title: string }[];
};

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type IntegrationCatalogItem = {
  provider: string;
  name: string;
  description: string;
  category: string;
  connected: boolean;
  connectedAt: string | null;
};

export type ApiAutomation = {
  id: string;
  boardId: string;
  name: string;
  enabled: boolean;
  triggerColumnId: string | null;
  action: 'set_priority' | 'add_label' | 'assign' | 'notify';
  actionValue: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportConfig = {
  enabled: boolean;
  publicKey?: string;
  assistantId?: string | null;
  assistant?: unknown;
};

/* ---------- Auth API ---------- */

export const authApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<{ data: AuthResult }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  register: (body: { name: string; email: string; password: string }) =>
    apiRequest<{ data: AuthResult }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    apiRequest<void>('/auth/logout', { method: 'POST' }),

  me: () =>
    apiRequest<{ data: ApiUser }>('/auth/me'),
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
  addTask: (columnId: string, body: { title: string; description?: string } & Partial<TaskMetadata>) =>
    apiRequest<{ data: ApiTask }>(`/columns/${columnId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),

  updateTask: (taskId: string, body: TaskMetadata) =>
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

  reorderColumns: (boardId: string, orderedColumnIds: string[]) =>
    apiRequest<{ data: ApiColumn[] }>(`/boards/${boardId}/columns/reorder`, { method: 'POST', body: JSON.stringify({ orderedColumnIds }) }),

  /* Import / Export */
  exportBoard: (id: string) =>
    apiRequest<{ data: BoardExport }>(`/boards/${id}/export`),

  importBoard: (payload: BoardExport) =>
    apiRequest<{ data: ApiBoard }>('/boards/import', { method: 'POST', body: JSON.stringify(payload) }),
};

export const workspaceApi = {
  listNotes: () => apiRequest<{ data: ApiNote[] }>('/notes'),
  createNote: (body: { title: string; content: string }) => apiRequest<{ data: ApiNote }>('/notes', { method: 'POST', body: JSON.stringify(body) }),
  updateNote: (id: string, body: { title: string; content: string }) => apiRequest<{ data: ApiNote }>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteNote: (id: string) => apiRequest<void>(`/notes/${id}`, { method: 'DELETE' }),
};

/* ---------- Favorites API ---------- */

export const favoritesApi = {
  list: () => apiRequest<{ data: FavoriteBoard[] }>('/favorites'),
  add: (boardId: string) => apiRequest<{ data: unknown }>(`/favorites/${boardId}`, { method: 'POST' }),
  remove: (boardId: string) => apiRequest<void>(`/favorites/${boardId}`, { method: 'DELETE' }),
};

/* ---------- Notifications API ---------- */

export const notificationsApi = {
  list: (unreadOnly = false) => apiRequest<{ data: ApiNotification[] }>(`/notifications${unreadOnly ? '?unread=true' : ''}`),
  unreadCount: () => apiRequest<{ data: { count: number } }>('/notifications/unread-count'),
  markRead: (ids?: string[]) => apiRequest<{ data: { ok: boolean } }>('/notifications/read', { method: 'POST', body: JSON.stringify(ids && ids.length ? { ids } : {}) }),
  remove: (id: string) => apiRequest<void>(`/notifications/${id}`, { method: 'DELETE' }),
};

/* ---------- Reports / Search / AI / Support / Integrations / Automations ---------- */

export const reportsApi = {
  summary: () => apiRequest<{ data: ReportSummary }>('/reports/summary'),
};

export const searchApi = {
  query: (q: string) => apiRequest<{ data: SearchResults }>(`/search?q=${encodeURIComponent(q)}`),
};

export const aiApi = {
  chat: (messages: ChatMessage[], boardId?: string) =>
    apiRequest<{ data: { reply: string } }>('/ai/chat', { method: 'POST', body: JSON.stringify({ messages, ...(boardId ? { boardId } : {}) }) }),
};

export const supportApi = {
  config: () => apiRequest<{ data: SupportConfig }>('/support/config'),
};

export const integrationsApi = {
  list: () => apiRequest<{ data: IntegrationCatalogItem[] }>('/integrations'),
  connect: (provider: string) => apiRequest<{ data: unknown }>(`/integrations/${provider}/connect`, { method: 'POST' }),
  disconnect: (provider: string) => apiRequest<{ data: unknown }>(`/integrations/${provider}/disconnect`, { method: 'POST' }),
};

export type AutomationInput = {
  name: string;
  enabled?: boolean;
  triggerColumnId?: string | null;
  action: ApiAutomation['action'];
  actionValue?: string | null;
};

export const automationsApi = {
  list: (boardId: string) => apiRequest<{ data: ApiAutomation[] }>(`/boards/${boardId}/automations`),
  create: (boardId: string, body: AutomationInput) => apiRequest<{ data: ApiAutomation }>(`/boards/${boardId}/automations`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<AutomationInput>) => apiRequest<{ data: ApiAutomation }>(`/automations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => apiRequest<void>(`/automations/${id}`, { method: 'DELETE' }),
};
