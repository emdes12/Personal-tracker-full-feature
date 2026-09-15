export interface User {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  sleepGoalMinutes: number;
}

export interface Area {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface Plan {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Progress {
  completed: number;
  total: number;
  percent: number;
}

export type GoalHealth = "on_track" | "at_risk" | "behind" | "completed" | "no_deadline";

export interface Goal {
  id: string;
  userId: string;
  planId: string | null;
  areaId: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "active" | "completed" | "archived" | "cancelled";
  startDate: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  progress: Progress;
  health: GoalHealth;
  daysRemaining: number | null;
  activity?: { focusedMinutes: number; daysActive: number };
}

export interface DashboardStats {
  thisWeek: { completed: number; total: number; percent: number };
  thisMonth: { completed: number; total: number; percent: number };
  monthLabel: string;
  goals: { id: string; title: string; percent: number }[];
  sleepAvgMinutes: number | null;
  currentStreak: number;
  longestStreak: number;
}

export interface LifetimeStats {
  tasksCompleted: number;
  focusedMinutes: number;
  activeDays: number;
}

export interface Target {
  id: string;
  goalId: string;
  parentTargetId: string | null;
  type: "milestone" | "monthly" | "weekly" | "custom";
  title: string;
  description: string | null;
  status: string;
  orderIndex: number;
  startDate: string | null;
  dueDate: string | null;
  progress: Progress;
  children: Target[];
}

export type OccurrenceStatus = "todo" | "in_progress" | "completed" | "skipped" | "cancelled" | "rescheduled";

export interface TaskOccurrence {
  id: string;
  userId: string;
  taskId: string;
  areaId: string | null;
  goalId: string | null;
  targetId: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: OccurrenceStatus;
  scheduledDate: string;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number | null;
  completedAt: string | null;
  focusStartedAt: string | null;
  focusedMinutes: number;
  rescheduledFromId: string | null;
  rescheduledToId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodayResponse {
  date: string;
  carriedOver: TaskOccurrence[];
  today: TaskOccurrence[];
  now: TaskOccurrence | null;
  upNext: TaskOccurrence | null;
  later: TaskOccurrence[];
  completion: Progress;
}

export interface Note {
  id: string;
  userId: string;
  content: string;
  goalId: string | null;
  targetId: string | null;
  taskId: string | null;
  occurrenceId: string | null;
  reviewId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SleepQuality = "poor" | "fair" | "good" | "excellent";

export interface SleepRecord {
  id: string;
  userId: string;
  date: string;
  sleepAt: string;
  wakeAt: string;
  durationMinutes: number;
  quality: SleepQuality | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReview {
  id: string;
  userId: string;
  date: string;
  accomplished: string | null;
  blockers: string | null;
  focusTomorrow: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailySummary {
  date: string;
  tasksCompleted: number;
  tasksIncomplete: number;
  tasksSkipped: number;
  tasksCarriedOver: number;
  completionPercent: number;
  focusMinutes: number;
  goalsWorkedOn: { id: string; title: string }[];
  sleep: { durationMinutes: number; quality: SleepQuality | null } | null;
  occurrences: TaskOccurrence[];
}

export interface DayHistorySummary {
  date: string;
  tasksCompleted: number;
  tasksTotal: number;
  completionPercent: number;
  sleepMinutes: number | null;
  focusedMinutes: number;
  goalsWorkedOn: { id: string; title: string }[];
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiProposedTask {
  title: string;
  scheduledDate: string;
  startTime?: string | null;
  endTime?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  goalId?: string | null;
}

export interface AiProposedTarget {
  title: string;
  type: "milestone" | "monthly" | "weekly" | "custom";
  dueDate?: string | null;
}

export interface AiChatResult {
  reply: string;
  proposedTasks: AiProposedTask[];
  proposedTargets: { goalId: string; targets: AiProposedTarget[] } | null;
}

export interface SearchResults {
  goals: { id: string; title: string }[];
  plans: { id: string; name: string }[];
  targets: { id: string; goalId: string; title: string }[];
  tasks: { id: string; title: string }[];
  notes: { id: string; content: string }[];
  reviews: { id: string; date: string }[];
}
