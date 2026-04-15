import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export const toasts = writable<Toast[]>([]);

let nextId = 0;

export function showToast(
  message: string,
  opts: { type?: ToastType; duration?: number } = {}
): void {
  const id = ++nextId;
  const type = opts.type ?? 'info';
  const duration = opts.duration ?? 3000;
  toasts.update((list) => [...list, { id, message, type }]);
  setTimeout(() => {
    toasts.update((list) => list.filter((t) => t.id !== id));
  }, duration);
}
