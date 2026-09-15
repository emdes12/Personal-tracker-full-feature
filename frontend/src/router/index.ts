import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/today" },
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue"), meta: { public: true } },
    { path: "/signup", name: "signup", component: () => import("../views/SignupView.vue"), meta: { public: true } },
    { path: "/today", name: "today", component: () => import("../views/TodayView.vue") },
    { path: "/dashboard", name: "dashboard", component: () => import("../views/DashboardView.vue") },
    { path: "/goals", name: "goals", component: () => import("../views/GoalsView.vue") },
    { path: "/goals/:id", name: "goal-detail", component: () => import("../views/GoalDetailView.vue") },
    { path: "/plans", name: "plans", component: () => import("../views/PlansView.vue") },
    { path: "/calendar", name: "calendar", component: () => import("../views/CalendarView.vue") },
    { path: "/history", name: "history", component: () => import("../views/HistoryView.vue") },
    { path: "/review/:date", name: "review", component: () => import("../views/ReviewView.vue") },
    { path: "/search", name: "search", component: () => import("../views/SearchView.vue") },
    { path: "/assistant", name: "assistant", component: () => import("../views/AssistantView.vue") },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.fetchMe();
  }
  if (!to.meta.public && !auth.user) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.meta.public && auth.user) {
    return { name: "today" };
  }
  return true;
});

export default router;
