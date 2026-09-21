import { onMounted, onUnmounted, watch } from "vue";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App as CapacitorApp } from "@capacitor/app";
import * as remindersApi from "../api/reminders";
import { useAuthStore } from "../stores/auth";

const CHANNEL_ID = "task-alarms";

/**
 * A JS setInterval poll (useReminderPolling) dies the moment the app is
 * backgrounded on a phone, so on native platforms alarms are scheduled
 * ahead of time as real OS notifications instead: pull the next ~36h of
 * reminders (GET /reminders/upcoming) and hand them to the OS scheduler,
 * which fires them regardless of whether the app process is alive. Re-synced
 * on mount and every time the app returns to the foreground, since that's
 * the only reliable moment to learn about tasks created/changed while
 * backgrounded.
 */
function reminderNotificationId(reminderId: string): number {
  let hash = 0;
  for (let i = 0; i < reminderId.length; i++) {
    hash = (hash * 31 + reminderId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

async function ensureChannel() {
  if (Capacitor.getPlatform() !== "android") return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "Task alarms",
    description: "Start and end alarms for scheduled tasks",
    importance: 5,
    visibility: 1,
    vibration: true,
  });
}

async function syncScheduledAlarms() {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    const req = await LocalNotifications.requestPermissions();
    if (req.display !== "granted") return;
  }
  await ensureChannel();

  const { reminders } = await remindersApi.listUpcomingReminders();

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
  if (!reminders.length) return;

  await LocalNotifications.schedule({
    notifications: reminders.map((reminder) => ({
      id: reminderNotificationId(reminder.id),
      title: reminder.kind === "start" ? "Starting soon" : "Time's up",
      body: reminder.kind === "start" ? `${reminder.title} is about to start` : `${reminder.title} has ended`,
      schedule: { at: new Date(reminder.remindAt) },
      channelId: CHANNEL_ID,
    })),
  });
}

const RESYNC_INTERVAL_MS = 30_000;

export function useNativeAlarms() {
  if (!Capacitor.isNativePlatform()) return;

  const auth = useAuthStore();
  let resumeHandle: { remove: () => void } | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let syncing = false;

  // Tasks are created/edited inside the app at any time, so re-sync on login,
  // on returning to the foreground, and on a short interval while open —
  // scheduling once at startup would miss every task added afterwards.
  async function sync() {
    if (!auth.user || syncing) return;
    syncing = true;
    try {
      await syncScheduledAlarms();
    } catch (err) {
      console.warn("Could not schedule native alarms", err);
    } finally {
      syncing = false;
    }
  }

  watch(() => auth.user, sync);

  onMounted(async () => {
    sync();
    timer = setInterval(sync, RESYNC_INTERVAL_MS);
    resumeHandle = await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) sync();
    });
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
    resumeHandle?.remove();
  });
}
