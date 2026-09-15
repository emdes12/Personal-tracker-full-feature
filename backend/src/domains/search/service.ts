import { db } from "../../db/index";
import type { DailyReviewRow, GoalRow, NoteRow, PlanRow, TargetRow, TaskRow } from "../../db/types";

const LIMIT = 10;

export interface SearchResults {
  goals: { id: string; title: string }[];
  plans: { id: string; name: string }[];
  targets: { id: string; goalId: string; title: string }[];
  tasks: { id: string; title: string }[];
  notes: { id: string; content: string }[];
  reviews: { id: string; date: string }[];
}

export async function globalSearch(userId: string, query: string): Promise<SearchResults> {
  const pattern = `%${query}%`;

  const [goalRows, planRows, targetRows, taskRows, noteRows, reviewRows] = await Promise.all([
    db<GoalRow>("goals").where({ userId }).whereILike("title", pattern).limit(LIMIT),
    db<PlanRow>("plans").where({ userId }).whereILike("name", pattern).limit(LIMIT),
    db<TargetRow>("targets").where({ userId }).whereILike("title", pattern).limit(LIMIT),
    db<TaskRow>("tasks").where({ userId }).whereILike("title", pattern).limit(LIMIT),
    db<NoteRow>("notes").where({ userId }).whereILike("content", pattern).limit(LIMIT),
    db<DailyReviewRow>("daily_reviews")
      .where({ userId })
      .andWhere((qb) => qb.whereILike("accomplished", pattern).orWhereILike("blockers", pattern).orWhereILike("focusTomorrow", pattern))
      .limit(LIMIT),
  ]);

  return {
    goals: goalRows.map((g) => ({ id: g.id, title: g.title })),
    plans: planRows.map((p) => ({ id: p.id, name: p.name })),
    targets: targetRows.map((t) => ({ id: t.id, goalId: t.goalId, title: t.title })),
    tasks: taskRows.map((t) => ({ id: t.id, title: t.title })),
    notes: noteRows.map((n) => ({ id: n.id, content: n.content })),
    reviews: reviewRows.map((r) => ({ id: r.id, date: r.date })),
  };
}
