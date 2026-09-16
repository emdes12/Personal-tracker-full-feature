// Row shapes returned by Knex (after camelCasing — see caseMap.ts), one per
// table. These replace Drizzle's inferred `$inferSelect` types; insert
// payloads are just `Partial<Row>` minus generated columns where relevant.

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  timezone: string;
  sleepGoalMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AreaRow {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  isDefault: boolean;
  createdAt: Date;
}

export type PlanType = "yearly" | "quarterly" | "monthly" | "personal" | "project" | "career" | "school" | "work" | "lifestyle";
export type PlanStatus = "active" | "completed" | "archived";

export interface PlanRow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: PlanType;
  status: PlanStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type GoalPriority = "low" | "medium" | "high" | "urgent";
export type GoalStatus = "active" | "completed" | "archived" | "cancelled";

export interface GoalRow {
  id: string;
  userId: string;
  planId: string | null;
  areaId: string | null;
  title: string;
  description: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  startDate: string | null;
  deadline: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TargetType = "milestone" | "monthly" | "weekly" | "custom";
export type TargetStatus = "active" | "completed" | "archived" | "cancelled";

export interface TargetRow {
  id: string;
  userId: string;
  goalId: string;
  parentTargetId: string | null;
  type: TargetType;
  title: string;
  description: string | null;
  status: TargetStatus;
  orderIndex: number;
  startDate: string | null;
  dueDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type RecurrenceType = "daily" | "weekdays" | "weekly" | "monthly" | "custom";

export interface TaskRow {
  id: string;
  userId: string;
  areaId: string | null;
  goalId: string | null;
  targetId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
  defaultDurationMinutes: number | null;
  isRecurring: boolean;
  recurrenceType: RecurrenceType | null;
  recurrenceConfig: Record<string, unknown> | null;
  recurrenceStartDate: string | null;
  recurrenceEndDate: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type OccurrenceStatus = "todo" | "in_progress" | "completed" | "skipped" | "cancelled" | "rescheduled";

export interface TaskOccurrenceRow {
  id: string;
  userId: string;
  taskId: string;
  areaId: string | null;
  goalId: string | null;
  targetId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: OccurrenceStatus;
  scheduledDate: string;
  startAt: Date | null;
  endAt: Date | null;
  durationMinutes: number | null;
  completedAt: Date | null;
  focusStartedAt: Date | null;
  focusedMinutes: number;
  rescheduledFromId: string | null;
  rescheduledToId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ReminderOffsetType = "at_start" | "5_min" | "10_min" | "15_min" | "custom";
export type ReminderKind = "start" | "end";

export interface TaskReminderRow {
  id: string;
  userId: string;
  occurrenceId: string;
  kind: ReminderKind;
  offsetType: ReminderOffsetType;
  offsetMinutes: number;
  remindAt: Date;
  isSent: boolean;
  sentAt: Date | null;
  createdAt: Date;
}

export interface NoteRow {
  id: string;
  userId: string;
  content: string;
  goalId: string | null;
  targetId: string | null;
  taskId: string | null;
  occurrenceId: string | null;
  reviewId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SleepQuality = "poor" | "fair" | "good" | "excellent";

export interface SleepRecordRow {
  id: string;
  userId: string;
  date: string;
  sleepAt: Date;
  wakeAt: Date;
  durationMinutes: number;
  quality: SleepQuality | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyReviewRow {
  id: string;
  userId: string;
  date: string;
  accomplished: string | null;
  blockers: string | null;
  focusTomorrow: string | null;
  createdAt: Date;
  updatedAt: Date;
}
