export type ToastStatus = "success" | "fail" | "info";

export type ToastItem = {
  id: number;
  message: string;
  status: ToastStatus;
  leaving: boolean;
  progress: number | null;
};

type Listener = () => void;

const VISIBLE_MS = 5000;
const LEAVE_MS = 350;
const MAX_TOASTS = 4;

let seq = 0;
let items: ToastItem[] = [];
let snapshot: ToastItem[] = [];
const listeners = new Set<Listener>();
const leaveTimers = new Map<number, number>();
const hideTimers = new Map<number, number>();

function emit() {
  snapshot = items.slice();
  listeners.forEach((listener) => listener());
}

export function getToasts(): ToastItem[] {
  return snapshot;
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clearHideTimer(id: number) {
  const timer = hideTimers.get(id);
  if (timer == null) return;
  window.clearTimeout(timer);
  hideTimers.delete(id);
}

function armHide(id: number) {
  clearHideTimer(id);
  const timer = window.setTimeout(() => {
    hideTimers.delete(id);
    dismissToast(id);
  }, VISIBLE_MS);
  hideTimers.set(id, timer);
}

function removeToast(id: number) {
  clearHideTimer(id);
  const timer = leaveTimers.get(id);
  if (timer != null) {
    window.clearTimeout(timer);
    leaveTimers.delete(id);
  }
  if (!items.some((item) => item.id === id)) return;
  items = items.filter((item) => item.id !== id);
  emit();
}

export function dismissToast(id: number) {
  const current = items.find((item) => item.id === id);
  if (!current || current.leaving) return;
  items = items.map((item) =>
    item.id === id ? { ...item, leaving: true } : item,
  );
  emit();
  const timer = window.setTimeout(() => removeToast(id), LEAVE_MS);
  leaveTimers.set(id, timer);
}

export function pushToast(
  message: string,
  status: ToastStatus,
  sticky = false,
  progress: number | null = null,
): number {
  const id = ++seq;
  items = [...items, { id, message, status, leaving: false, progress }].slice(
    -MAX_TOASTS,
  );
  emit();
  if (!sticky) armHide(id);
  return id;
}

export function updateToast(
  id: number,
  message: string,
  status: ToastStatus,
  sticky = false,
  progress: number | null = null,
) {
  if (!items.some((item) => item.id === id)) {
    pushToast(message, status, sticky, progress);
    return;
  }
  items = items.map((item) =>
    item.id === id
      ? { ...item, message, status, leaving: false, progress }
      : item,
  );
  emit();
  if (sticky) {
    clearHideTimer(id);
    return;
  }
  armHide(id);
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
