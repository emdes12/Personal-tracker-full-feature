import { db } from "../../db/index";
import type { GoalRow } from "../../db/types";
import { listOccurrencesInRange } from "../tasks/occurrences.service";
import { listSleepRecordsInRange } from "../sleep/service";

const COUNTABLE = new Set(["todo", "in_progress", "completed", "skipped"]);

export interface DayHistorySummary {
  date: string;
  tasksCompleted: number;
  tasksTotal: number;
  completionPercent: number;
  sleepMinutes: number | null;
  focusedMinutes: number;
  goalsWorkedOn: { id: string; title: string }[];
}

/** One row per calendar date in [from, to] summarizing what actually happened, for browsing history. */
export async function getHistoryRange(userId: string, from: string, to: string): Promise<DayHistorySummary[]> {
  const [occurrences, sleepRecords] = await Promise.all([
    listOccurrencesInRange(userId, from, to),
    listSleepRecordsInRange(userId, from, to),
  ]);

  const byDate = new Map<string, DayHistorySummary & { goalIds: Set<string> }>();
  for (const o of occurrences) {
    if (!byDate.has(o.scheduledDate)) {
      byDate.set(o.scheduledDate, {
        date: o.scheduledDate,
        tasksCompleted: 0,
        tasksTotal: 0,
        completionPercent: 0,
        sleepMinutes: null,
        focusedMinutes: 0,
        goalsWorkedOn: [],
        goalIds: new Set(),
      });
    }
    const entry = byDate.get(o.scheduledDate)!;
    if (COUNTABLE.has(o.status)) {
      entry.tasksTotal += 1;
      if (o.status === "completed") entry.tasksCompleted += 1;
    }
    entry.focusedMinutes += o.focusedMinutes;
    if (o.status === "completed" && o.goalId) entry.goalIds.add(o.goalId);
  }
  for (const entry of byDate.values()) {
    entry.completionPercent = entry.tasksTotal === 0 ? 0 : Math.round((entry.tasksCompleted / entry.tasksTotal) * 100);
  }

  for (const s of sleepRecords) {
    const entry = byDate.get(s.date);
    if (entry) entry.sleepMinutes = s.durationMinutes;
    else
      byDate.set(s.date, {
        date: s.date,
        tasksCompleted: 0,
        tasksTotal: 0,
        completionPercent: 0,
        sleepMinutes: s.durationMinutes,
        focusedMinutes: 0,
        goalsWorkedOn: [],
        goalIds: new Set(),
      });
  }

  const allGoalIds = [...new Set([...byDate.values()].flatMap((e) => [...e.goalIds]))];
  const goalRows = allGoalIds.length ? await db<GoalRow>("goals").whereIn("id", allGoalIds) : [];
  const goalTitleById = new Map(goalRows.map((g) => [g.id, g.title]));

  for (const entry of byDate.values()) {
    entry.goalsWorkedOn = [...entry.goalIds].map((id) => ({ id, title: goalTitleById.get(id) ?? "Untitled goal" }));
  }

  return [...byDate.values()]
    .map(({ goalIds: _goalIds, ...rest }) => rest)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
