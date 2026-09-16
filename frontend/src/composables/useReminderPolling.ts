import { onMounted, onUnmounted } from "vue";
import * as remindersApi from "../api/reminders";
import type { DueReminder } from "../api/reminders";
import { useAuthStore } from "../stores/auth";
import { playEndAlarm, playStartAlarm } from "../lib/alarmSound";
import { useToast } from "./useToast";

const POLL_INTERVAL_MS = 15_000;

/**
 * Reminders are frontend-driven: while the app is open, poll for reminders
 * whose remindAt has passed, fire a Notification + alarm sound (or an
 * in-app toast fallback), then mark them sent so they don't fire again.
 * No backend push/cron — matches the spec's "don't add background-job
 * infra unless required." Every open task with a start/end time gets an
 * automatic "about to start" and "time's up" alarm (see
 * domains/reminders/service.ts::syncRemindersForOccurrence on the backend)
 * — nothing to opt into here.
 *
 * On the Capacitor mobile build this is superseded by native scheduled
 * local notifications (see lib/nativeNotifications.ts), which keep firing
 * even while the app is backgrounded/closed — something a setInterval poll
 * can never do on a phone.
 */
export function useReminderPolling() {
  const auth = useAuthStore();
  const toast = useToast();
  let timer: ReturnType<typeof setInterval> | undefined;

  async function checkDue() {
    if (!auth.user) return;
    try {
      const { reminders } = await remindersApi.listDueReminders();
      for (const reminder of reminders) {
        fireAlarm(reminder);
        await remindersApi.markReminderSent(reminder.id);
      }
    } catch {
      // Silently skip a failed poll cycle — it retries on the next tick.
    }
  }

  function fireAlarm(reminder: DueReminder) {
    const isStart = reminder.kind === "start";
    const title = isStart ? "Starting soon" : "Time's up";
    const body = isStart ? `${reminder.title} is about to start` : `${reminder.title} has ended`;

    if (isStart) playStartAlarm();
    else playEndAlarm();

    toast.info(`${title}: ${reminder.title}`);
    fireNotification(title, body);
  }

  function fireNotification(title: string, body: string) {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") new Notification(title, { body });
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
