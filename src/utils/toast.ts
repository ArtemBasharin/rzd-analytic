export type ToastStatus = "success" | "fail" | "info";

export type ToastItem = {
  id: number;
  message: string;
  status: ToastStatus;
  leaving: boolean;
  progress: number | null;
};

type Listener = () => void;

type ToastStore = {
  seq: number;
  items: ToastItem[];
  snapshot: ToastItem[];
  listeners: Set<Listener>;
  leaveTimers: Map<number, number>;
  hideTimers: Map<number, number>;
  progressId: number | null;
  aliases: Map<number, number>;
};

const VISIBLE_MS = 5000;
const LEAVE_MS = 350;
const MAX_TOASTS = 4;
const STORE_KEY = "__rzdToastStore";

function createStore(): ToastStore {
  return {
    seq: 0,
    items: [],
    snapshot: [],
    listeners: new Set(),
    leaveTimers: new Map(),
    hideTimers: new Map(),
    progressId: null,
    aliases: new Map(),
  };
}

// Хранилище на globalThis: горячая перезагрузка модуля посреди загрузки
// не должна обнулять список и плодить новую карточку на каждый тик прогресса.
const root = globalThis as typeof globalThis & {
  [STORE_KEY]?: ToastStore;
};
const store = root[STORE_KEY] ?? createStore();
if (store.progressId === undefined) store.progressId = null;
if (!store.aliases) store.aliases = new Map();
root[STORE_KEY] = store;

function emit() {
  store.snapshot = store.items.slice();
  store.listeners.forEach((listener) => listener());
}

export function getToasts(): ToastItem[] {
  return store.snapshot;
}

export function subscribeToasts(listener: Listener): () => void {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

function clearHideTimer(id: number) {
  const timer = store.hideTimers.get(id);
  if (timer == null) return;
  window.clearTimeout(timer);
  store.hideTimers.delete(id);
}

function clearLeaveTimer(id: number) {
  const timer = store.leaveTimers.get(id);
  if (timer == null) return;
  window.clearTimeout(timer);
  store.leaveTimers.delete(id);
}

function clearTimers(id: number) {
  clearHideTimer(id);
  clearLeaveTimer(id);
}

function armHide(id: number) {
  clearHideTimer(id);
  const timer = window.setTimeout(() => {
    store.hideTimers.delete(id);
    dismissToast(id);
  }, VISIBLE_MS);
  store.hideTimers.set(id, timer);
}

function forgetAlias(id: number) {
  store.aliases.delete(id);
  const stale = [...store.aliases.entries()]
    .filter(([, to]) => to === id)
    .map(([from]) => from);
  stale.forEach((from) => store.aliases.delete(from));
}

function dropIds(ids: number[]) {
  ids.forEach((id) => {
    clearTimers(id);
    forgetAlias(id);
  });
}

function resolveId(id: number): number | null {
  let current = id;
  const seen = new Set<number>();
  while (!store.items.some((item) => item.id === current)) {
    const next = store.aliases.get(current);
    if (next == null || seen.has(current)) return null;
    seen.add(current);
    current = next;
  }
  return current;
}

function commit(items: ToastItem[], pinId?: number) {
  const progress = items.filter((item) => item.progress != null);
  const rest = items.filter((item) => item.progress == null);
  const pinned =
    (pinId != null ? progress.find((item) => item.id === pinId) : undefined) ??
    progress[progress.length - 1];
  const dropped = progress
    .filter((item) => item !== pinned)
    .concat(rest.slice(0, Math.max(0, rest.length - MAX_TOASTS)));
  dropIds(dropped.map((item) => item.id));
  store.items = rest.slice(-MAX_TOASTS).concat(pinned ? [pinned] : []);
  store.progressId = pinned?.id ?? null;
  emit();
}

function removeToast(id: number) {
  clearTimers(id);
  forgetAlias(id);
  if (!store.items.some((item) => item.id === id)) return;
  commit(store.items.filter((item) => item.id !== id));
}

export function dismissToast(id: number) {
  const current = store.items.find((item) => item.id === id);
  if (!current || current.leaving) return;
  store.items = store.items.map((item) =>
    item.id === id ? { ...item, leaving: true } : item,
  );
  emit();
  const timer = window.setTimeout(() => removeToast(id), LEAVE_MS);
  store.leaveTimers.set(id, timer);
}

function applyUpdate(
  id: number,
  message: string,
  status: ToastStatus,
  sticky: boolean,
  progress: number | null,
) {
  clearLeaveTimer(id);
  commit(
    store.items.map((item) =>
      item.id === id
        ? { ...item, message, status, leaving: false, progress }
        : item,
    ),
    progress != null ? id : undefined,
  );
  if (sticky || progress != null) {
    clearHideTimer(id);
    return;
  }
  armHide(id);
}

export function pushToast(
  message: string,
  status: ToastStatus,
  sticky = false,
  progress: number | null = null,
): number {
  if (progress != null && store.progressId != null) {
    const existing = store.items.find((item) => item.id === store.progressId);
    if (existing) {
      applyUpdate(existing.id, message, status, sticky, progress);
      return existing.id;
    }
  }
  const id = ++store.seq;
  commit([
    ...store.items,
    { id, message, status, leaving: false, progress },
  ]);
  if (!sticky && progress == null) armHide(id);
  return id;
}

export function updateToast(
  id: number,
  message: string,
  status: ToastStatus,
  sticky = false,
  progress: number | null = null,
) {
  const target = resolveId(id);
  if (target != null) {
    applyUpdate(target, message, status, sticky, progress);
    return;
  }
  if (progress != null && store.progressId != null) {
    const live = store.items.find((item) => item.id === store.progressId);
    if (live) {
      store.aliases.set(id, live.id);
      applyUpdate(live.id, message, status, sticky, progress);
      return;
    }
  }
  const created = pushToast(message, status, sticky, progress);
  if (created !== id) store.aliases.set(id, created);
}

export function resetToastsForTests() {
  store.hideTimers.forEach((timer) => window.clearTimeout(timer));
  store.leaveTimers.forEach((timer) => window.clearTimeout(timer));
  store.hideTimers.clear();
  store.leaveTimers.clear();
  store.items = [];
  store.progressId = null;
  store.aliases.clear();
  store.snapshot = [];
  emit();
}

export function recordsLabel(count: number): string {
  const n = Math.abs(Math.trunc(count));
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 > 10 && mod100 < 20) return "записей";
  if (mod10 === 1) return "запись";
  if (mod10 >= 2 && mod10 <= 4) return "записи";
  return "записей";
}
