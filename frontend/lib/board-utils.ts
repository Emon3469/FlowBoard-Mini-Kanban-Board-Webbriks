import { ApiTask, Priority } from './api';

/* ─── Priority presentation ─── */

export const priorityMeta: Record<Priority, { label: string; chip: string; dot: string; rank: number }> = {
  URGENT: { label: 'Urgent', chip: 'bg-danger/10 text-danger border-danger/20', dot: 'bg-danger', rank: 0 },
  HIGH: { label: 'High', chip: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning', rank: 1 },
  MEDIUM: { label: 'Medium', chip: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary', rank: 2 },
  LOW: { label: 'Low', chip: 'bg-on-surface-variant/10 text-on-surface-variant border-outline', dot: 'bg-on-surface-variant', rank: 3 },
};

export function priorityOf(task: ApiTask): Priority {
  return task.priority ?? 'MEDIUM';
}

/* ─── Dates ─── */

export function formatShortDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// "3m ago" / "2h ago" / "Yesterday" / "Sep 4" — compact relative time for feeds
export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d ago`;
  return formatFullDate(iso);
}

// yyyy-mm-dd for <input type="date">
export function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export type DueState = 'none' | 'overdue' | 'today' | 'soon' | 'future';

export function dueState(iso?: string | null): DueState {
  if (!iso) return 'none';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'none';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 7) return 'soon';
  return 'future';
}

export const dueStateClass: Record<DueState, string> = {
  none: 'text-on-surface-variant',
  overdue: 'text-danger',
  today: 'text-warning',
  soon: 'text-on-surface',
  future: 'text-on-surface-variant',
};

/* ─── Avatar colours (stable per name) ─── */

const avatarColors = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
  'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-cyan-500',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}

export function avatarColor(str: string): string {
  return avatarColors[hashString(str || '?') % avatarColors.length];
}

export function initialsOf(name?: string | null): string {
  if (!name) return '?';
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ─── Filter / Sort / Group ─── */

export const UNASSIGNED = '__unassigned__';
export type SortKey = 'manual' | 'priority' | 'dueDate' | 'title' | 'created';
export type GroupKey = 'none' | 'priority' | 'assignee' | 'label';
export type DueFilter = 'all' | 'overdue' | 'today' | 'week' | 'none';

export interface TaskFilters {
  query: string;
  priorities: Priority[];
  assigneeIds: string[]; // may include UNASSIGNED
  labels: string[];
  due: DueFilter;
}

export const emptyFilters: TaskFilters = { query: '', priorities: [], assigneeIds: [], labels: [], due: 'all' };

export function filtersActive(f: TaskFilters): number {
  return (f.query ? 1 : 0) + f.priorities.length + f.assigneeIds.length + f.labels.length + (f.due !== 'all' ? 1 : 0);
}

export function matchesFilters(task: ApiTask, f: TaskFilters): boolean {
  if (f.query) {
    const q = f.query.toLowerCase();
    const hay = `${task.title} ${task.description ?? ''} ${(task.labels ?? []).join(' ')}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.priorities.length && !f.priorities.includes(priorityOf(task))) return false;
  if (f.assigneeIds.length) {
    const id = task.assigneeId ?? UNASSIGNED;
    if (!f.assigneeIds.includes(id)) return false;
  }
  if (f.labels.length) {
    const labels = task.labels ?? [];
    if (!f.labels.some((l) => labels.includes(l))) return false;
  }
  if (f.due !== 'all') {
    const s = dueState(task.dueDate);
    if (f.due === 'overdue' && s !== 'overdue') return false;
    if (f.due === 'today' && s !== 'today') return false;
    if (f.due === 'week' && !(s === 'today' || s === 'soon' || s === 'overdue')) return false;
    if (f.due === 'none' && s !== 'none') return false;
  }
  return true;
}

export function sortTasks(tasks: ApiTask[], key: SortKey): ApiTask[] {
  const copy = [...tasks];
  switch (key) {
    case 'priority':
      return copy.sort((a, b) => priorityMeta[priorityOf(a)].rank - priorityMeta[priorityOf(b)].rank || a.position - b.position);
    case 'dueDate':
      return copy.sort((a, b) => {
        const av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return av - bv || a.position - b.position;
      });
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'created':
      return copy.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
    case 'manual':
    default:
      return copy.sort((a, b) => a.position - b.position);
  }
}

export interface TaskGroup { key: string; label: string; tasks: ApiTask[] }

export function groupTasks(tasks: ApiTask[], key: GroupKey, memberName: (id: string) => string): TaskGroup[] {
  if (key === 'none') return [{ key: 'all', label: 'All tasks', tasks }];
  if (key === 'priority') {
    return (['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as Priority[])
      .map((p) => ({ key: p, label: priorityMeta[p].label, tasks: tasks.filter((t) => priorityOf(t) === p) }))
      .filter((g) => g.tasks.length > 0);
  }
  if (key === 'assignee') {
    const buckets = new Map<string, ApiTask[]>();
    for (const t of tasks) {
      const id = t.assigneeId ?? UNASSIGNED;
      if (!buckets.has(id)) buckets.set(id, []);
      buckets.get(id)!.push(t);
    }
    return Array.from(buckets, ([id, ts]) => ({ key: id, label: id === UNASSIGNED ? 'Unassigned' : memberName(id), tasks: ts }));
  }
  // labels — a task may appear under multiple labels
  const buckets = new Map<string, ApiTask[]>();
  for (const t of tasks) {
    const labels = t.labels ?? [];
    if (labels.length === 0) {
      if (!buckets.has(UNASSIGNED)) buckets.set(UNASSIGNED, []);
      buckets.get(UNASSIGNED)!.push(t);
    } else {
      for (const l of labels) {
        if (!buckets.has(l)) buckets.set(l, []);
        buckets.get(l)!.push(t);
      }
    }
  }
  return Array.from(buckets, ([label, ts]) => ({ key: label, label: label === UNASSIGNED ? 'No label' : label, tasks: ts }));
}
