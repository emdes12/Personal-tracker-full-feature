import { reactive } from "vue";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

const toasts = reactive<Toast[]>([]);
let nextId = 1;

function push(message: string, type: Toast["type"] = "success", durationMs = 2500) {
  const id = nextId++;
  toasts.push({ id, message, type });
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
  }, durationMs);
}

export function useToast() {
  return {
    toasts,
    success: (message: string) => push(message, "success"),
    error: (message: string) => push(message, "error"),
    info: (message: string) => push(message, "info"),
  };
}
