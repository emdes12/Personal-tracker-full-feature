import { listCarriedOver, listOccurrencesForDate } from "../tasks/occurrences.service";
import { ensureRollingOccurrences } from "../tasks/recurringService";

export interface TodayOccurrence {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  scheduledDate: string;
  startAt: Date | null;
  endAt: Date | null;
  durationMinutes: number | null;
  goalId: string | null;
  targetId: string | null;
  areaId: string | null;
}

export interface TodayResponse {
  date: string;
  carriedOver: TodayOccurrence[];
  today: TodayOccurrence[];
  now: TodayOccurrence | null;
  upNext: TodayOccurrence | null;
  later: TodayOccurrence[];
  completion: { completed: number; total: number; percent: number };
}

const ACTIVE_STATUSES = new Set(["todo", "in_progress"]);
const COUNTABLE_STATUSES = new Set(["todo", "in_progress", "completed", "skipped"]);

export async function getTodayView(userId: string, timezone: string, date: string): Promise<TodayResponse> {
  await ensureRollingOccurrences(userId, timezone);

  const [today, carriedOver] = await Promise.all([
    listOccurrencesForDate(userId, date),
    listCarriedOver(userId, date),
  ]);

  const shown = [...carriedOver, ...today];
  const completed = shown.filter((o) => COUNTABLE_STATUSES.has(o.status) && o.status === "completed").length;
  const total = shown.filter((o) => COUNTABLE_STATUSES.has(o.status)).length;

  const now = new Date();
  const active = today
    .filter((o) => ACTIVE_STATUSES.has(o.status) && o.startAt)
    .sort((a, b) => a.startAt!.getTime() - b.startAt!.getTime());

  const current = active.find((o) => o.startAt! <= now && (!o.endAt || o.endAt > now)) ?? null;
  const upcoming = active.filter((o) => o.startAt! > now);
  const nextTask = current ? upcoming[0] ?? null : upcoming[0] ?? null;
  const later = upcoming.filter((o) => o.id !== nextTask?.id);

  return {
    date,
    carriedOver,
    today,
    now: current,
    upNext: nextTask,
    later,
    completion: { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) },
  };
}
