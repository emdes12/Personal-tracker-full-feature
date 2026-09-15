import { onMounted, onUnmounted } from "vue";
import * as remindersApi from "../api/reminders";
import { useAuthStore } from "../stores/auth";

const POLL_INTERVAL_MS = 30_000;

/**
 * Reminders are frontend-driven: while the app is open, poll for reminders
 * whose remindAt has passed, fire a Notification (or an in-app fallback),
 * then mark them sent so they don't fire again. No backend push/cron —
 * matches the spec's "don't add background-job infra unless required."
 */
export function useReminderPolling() {
  const auth = useAuthStore();
  let timer: ReturnType<typeof setInterval> | undefined;

  async function checkDue() {
    if (!auth.user) return;
    try {
      const { reminders } = await remindersApi.listDueReminders();
      for (const reminder of reminders) {
        fireNotification(reminder.title);
        await remindersApi.markReminderSent(reminder.id);
      }
    } catch {
      // Silently skip a failed poll cycle — it retries on the next tick.
    }
  }

  function fireNotification(title: string) {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification("Time to focus", { body: title });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") new Notification("Time to focus", { body: title });
      });
    }
  }

  onMounted(() => {
    checkDue();
    timer = setInterval(checkDue, POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });
}
