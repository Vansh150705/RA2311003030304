

import { Log } from "../../logging_middleware";

export type NotificationType = "Event" | "Result" | "Placement";

export interface Notification {
  ID: string;
  Type: NotificationType | string;
  Message: string;
  Timestamp: string;
  viewed?: boolean;
  score?: number;
}

export interface FetchOptions {
  limit?: number;
  page?: number;
  notification_type?: NotificationType | "";
}

const API_BASE = "/api/notifications";

export async function fetchNotifications(opts: FetchOptions = {}): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.page) params.set("page", String(opts.page));
  if (opts.notification_type) params.set("notification_type", opts.notification_type);

  const url = `${API_BASE}${params.toString() ? "?" + params.toString() : ""}`;

  await Log("frontend", "info", "api", `Fetching notifications — params: ${params.toString() || "none"}`);

  try {
    const res = await fetch(url, {
      headers: { Authorization: "Bearer pre-authorised" },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      await Log("frontend", "error", "api", `Notifications API responded with ${res.status}: ${res.statusText}`);
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const notifications = (data.notifications ?? []) as Notification[];
    await Log("frontend", "info", "api", `Successfully fetched ${notifications.length} notifications`);
    return notifications;
  } catch (err) {
    await Log("frontend", "fatal", "api", `Failed to fetch notifications: ${(err as Error).message}`);
    throw err;
  }
}

const TYPE_WEIGHT: Record<string, number> = { Placement: 3, Result: 2, Event: 1 };
const RECENCY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function computeScore(notification: Notification, now = new Date()): number {
  const typeWeight = TYPE_WEIGHT[notification.Type] ?? 0;
  const ts = new Date(notification.Timestamp);
  const ageMs = Math.max(now.getTime() - ts.getTime(), 0);
  const recencyScore = Math.max(1 - ageMs / RECENCY_WINDOW_MS, 0);
  return typeWeight * 1000 + recencyScore;
}

export async function getTopN(notifications: Notification[], n: number): Promise<Notification[]> {
  await Log("frontend", "info", "utils", `Computing top-${n} priority notifications from ${notifications.length} total`);
  const now = new Date();
  const scored = notifications.map((notif) => ({ ...notif, score: computeScore(notif, now) }));
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const result = scored.slice(0, n);
  await Log("frontend", "debug", "utils", `Top-${n} computed. Best: ${result[0]?.score?.toFixed(2)} (${result[0]?.Type} — ${result[0]?.Message})`);
  return result;
}

const VIEWED_KEY = "campus_viewed_ids";

export function getViewedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function markViewed(id: string): void {
  if (typeof window === "undefined") return;
  const ids = getViewedIds();
  ids.add(id);
  localStorage.setItem(VIEWED_KEY, JSON.stringify(Array.from(ids)));
  Log("frontend", "debug", "state", `Notification ${id} marked as viewed`);
}

export function markAllViewed(notifications: Notification[]): void {
  if (typeof window === "undefined") return;
  const ids = getViewedIds();
  notifications.forEach((n) => ids.add(n.ID));
  localStorage.setItem(VIEWED_KEY, JSON.stringify(Array.from(ids)));
  Log("frontend", "info", "state", `Marked ${notifications.length} notifications as viewed`);
}
