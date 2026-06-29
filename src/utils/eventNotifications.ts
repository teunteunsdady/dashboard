import {
  ALL_DAY_NOTIFY_HOUR,
  EVENT_NOTIFY_MINUTES_BEFORE,
} from "../constants/eventNotify";
import { STORAGE_PREFIX } from "../constants/brand";
import type { CalendarEvent } from "../types/calendar";
import { isAllDayEvent } from "./calendarUtils";

const NOTIFIED_KEY = `${STORAGE_PREFIX}-event-notified`;
const NOTIFY_OFFSET_MS = EVENT_NOTIFY_MINUTES_BEFORE * 60 * 1000;

/** 일정 시작 시각 (notify=false면 null) */
export function getEventStartTime(event: CalendarEvent): Date | null {
  if (!event.notify) return null;

  const datePart = event.start.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);

  if (isAllDayEvent(event)) {
    return new Date(year, month - 1, day, ALL_DAY_NOTIFY_HOUR, 0, 0, 0);
  }

  const timePart = event.start.includes("T")
    ? event.start.split("T")[1]
    : "00:00";
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/** 알림 발송 시각 (시작 10분 전) */
export function getEventNotificationTime(event: CalendarEvent): Date | null {
  const start = getEventStartTime(event);
  if (!start) return null;
  return new Date(start.getTime() - NOTIFY_OFFSET_MS);
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/** 알림 권한 요청 — granted면 true */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/** 사용자 탭 직후 호출 (iOS — requestPermission을 같은 제스처 흐름에서 시작) */
export function requestNotificationPermissionFromUserGesture(): Promise<boolean> {
  if (!isNotificationSupported()) return Promise.resolve(false);
  if (Notification.permission === "granted") return Promise.resolve(true);
  if (Notification.permission === "denied") return Promise.resolve(false);

  return Notification.requestPermission().then((result) => result === "granted");
}

function loadNotifiedKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveNotifiedKeys(keys: Set<string>): void {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...keys]));
  } catch {
    // ignore
  }
}

export function notificationDedupeKey(eventId: string, atMs: number): string {
  return `${eventId}:${atMs}`;
}

export function wasEventNotified(eventId: string, atMs: number): boolean {
  return loadNotifiedKeys().has(notificationDedupeKey(eventId, atMs));
}

export function markEventNotified(eventId: string, atMs: number): void {
  const keys = loadNotifiedKeys();
  keys.add(notificationDedupeKey(eventId, atMs));
  saveNotifiedKeys(keys);
}

/** 알림 시각 변경·삭제 시 해당 일정의 기록 제거 */
export function clearEventNotificationHistory(eventId: string): void {
  const keys = loadNotifiedKeys();
  for (const key of keys) {
    if (key.startsWith(`${eventId}:`)) keys.delete(key);
  }
  saveNotifiedKeys(keys);
}

function formatNotificationBody(event: CalendarEvent): string {
  const start = getEventStartTime(event);
  if (!start) return "";

  if (isAllDayEvent(event)) {
    return `오늘 종일 일정 · ${start.toLocaleDateString("ko-KR")}`;
  }

  const startLabel = start.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${EVENT_NOTIFY_MINUTES_BEFORE}분 후 시작 · ${startLabel}`;
}

export function showEventNotification(event: CalendarEvent, notifyAt: Date): void {
  if (!isNotificationSupported() || Notification.permission !== "granted")
    return;

  const notification = new Notification(event.title, {
    body: formatNotificationBody(event),
    tag: notificationDedupeKey(event.id, notifyAt.getTime()),
    icon: "/favicon.ico",
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

const DUE_WINDOW_MS = 5 * 60 * 1000;

/** 놓친 알림 보정 (탭이 백그라운드였을 때) */
export function fireDueNotifications(
  events: CalendarEvent[],
  now = Date.now(),
): void {
  if (!isNotificationSupported() || Notification.permission !== "granted")
    return;

  for (const event of events) {
    const at = getEventNotificationTime(event);
    if (!at) continue;

    const atMs = at.getTime();
    if (atMs > now) continue;
    if (now - atMs > DUE_WINDOW_MS) continue;
    if (wasEventNotified(event.id, atMs)) continue;

    showEventNotification(event, at);
    markEventNotified(event.id, atMs);
  }
}
