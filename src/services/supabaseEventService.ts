import { supabase } from "../lib/supabase";
import type { CalendarEvent } from "../types/calendar";
import {
  buildEventDateTime,
  inferEndTime24h,
  splitLocalDateTime,
} from "../utils/calendarUtils";
import { eventDebugLog } from "../utils/eventDebugLog";

function toUserFacingError(error: { code?: string; message: string }): Error {
  if (
    error.message.includes("notify_enabled") ||
    error.message.includes("'notify_enabled'")
  ) {
    return new Error(
      "알림 설정 컬럼(notify_enabled)이 DB에 없습니다. Supabase SQL Editor에서 supabase/migrations/20260630_event_notify.sql 을 실행해 주세요.",
    );
  }
  if (error.code === "23514") {
    if (error.message.includes("events_category_check")) {
      eventDebugLog("Supabase DB 실패 [SUPABASE-23514 events_category_check]", {
        code: error.code,
        dbMessage: error.message,
      });
      return new Error(
        "일정 카테고리가 DB와 맞지 않습니다. Supabase SQL Editor에서 events 테이블 category 제약을 schema.sql과 맞게 업데이트해 주세요.",
      );
    }
    if (error.message.includes("events_ends_after_starts")) {
      eventDebugLog(
        "Supabase DB 실패 [SUPABASE-23514 events_ends_after_starts]",
        {
          code: error.code,
          dbMessage: error.message,
        },
      );
      return new Error(
        "종료 일시가 시작 일시보다 이릅니다. 종료일·종료 시간을 다시 확인해 주세요.",
      );
    }
    eventDebugLog("Supabase DB 실패 [SUPABASE-23514 unknown]", {
      code: error.code,
      dbMessage: error.message,
    });
    return new Error(`저장 제약 조건 오류: ${error.message}`);
  }
  if (error.message.includes("events_category_check")) {
    return new Error(
      "일정 카테고리가 DB와 맞지 않습니다. Supabase에서 schema.sql을 다시 실행해 주세요.",
    );
  }
  return new Error(error.message || "일정을 저장하지 못했습니다.");
}

/** DB row 타입 */
interface EventRow {
  id: string;
  user_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  category: string;
  description: string | null;
  all_day: boolean;
  notify_enabled: boolean;
}

function formatEventDate(iso: string, allDay: boolean): string {
  if (allDay) return iso.slice(0, 10);
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseEventDate(value: string, allDay: boolean): string {
  if (allDay) {
    const date = value.slice(0, 10);
    return `${date}T00:00:00.000Z`;
  }

  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function rowToEvent(row: EventRow): CalendarEvent {
  const allDay = row.all_day;
  return {
    id: row.id,
    title: row.title,
    start: formatEventDate(row.starts_at, allDay),
    end: row.ends_at ? formatEventDate(row.ends_at, allDay) : undefined,
    category: row.category as CalendarEvent["category"],
    description: row.description ?? undefined,
    allDay,
    notify: row.notify_enabled ?? false,
  };
}

function resolveAllDay(
  event: Pick<CalendarEvent, "start" | "allDay">,
): boolean {
  if (event.start.includes("T")) return false;
  return event.allDay ?? true;
}

function eventToInsertRow(
  event: Omit<CalendarEvent, "id"> | CalendarEvent,
  userId: string,
): Omit<EventRow, "id"> {
  eventDebugLog("eventToInsertRow: 입력", { event, userId });

  const allDay = resolveAllDay(event);
  const startsAt = parseEventDate(event.start, allDay);
  let endsAt = event.end ? parseEventDate(event.end, allDay) : null;

  eventDebugLog("eventToInsertRow: 파싱 직후", {
    allDay,
    startsAt,
    endsAt,
    startMs: new Date(startsAt).getTime(),
    endMs: endsAt ? new Date(endsAt).getTime() : null,
  });

  if (!allDay && endsAt && event.end) {
    const startMs = new Date(startsAt).getTime();
    const endMs = new Date(endsAt).getTime();

    if (endMs <= startMs) {
      const { date: startDate, time: startTime } = splitLocalDateTime(
        event.start,
      );
      const { date: endDate, time: endTime } = splitLocalDateTime(event.end);
      eventDebugLog("eventToInsertRow: end <= start, 보정 시도", {
        startDate,
        startTime,
        endDate,
        endTime,
      });
      if (endDate === startDate) {
        const correctedTime = inferEndTime24h(startTime, endTime);
        const correctedEnd = buildEventDateTime(
          startDate,
          correctedTime,
          false,
        );
        const correctedMs = new Date(
          parseEventDate(correctedEnd, false),
        ).getTime();
        eventDebugLog("eventToInsertRow: 보정 결과", {
          correctedTime,
          correctedEnd,
          correctedMs,
          startMs,
        });
        if (correctedMs > startMs) {
          endsAt = parseEventDate(correctedEnd, false);
        }
      }
    }
  }

  if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    eventDebugLog("eventToInsertRow: 실패 [CLIENT-INSERT-ROW]", {
      event,
      allDay,
      startsAt,
      endsAt,
      startMs: new Date(startsAt).getTime(),
      endMs: new Date(endsAt).getTime(),
    });
    throw new Error(
      `종료 일시는 시작 일시 이후여야 합니다. (시작 ${event.start}, 종료 ${event.end})`,
    );
  }

  const row = {
    user_id: userId,
    title: event.title,
    starts_at: startsAt,
    ends_at: endsAt,
    category: event.category,
    description: event.description ?? null,
    all_day: allDay,
    notify_enabled: event.notify ?? false,
  };

  eventDebugLog("eventToInsertRow: 통과 — Supabase insert 예정", row);
  return row;
}

/** Supabase에서 로그인한 사용자의 일정 목록 조회 */
export async function fetchEvents(userId: string): Promise<CalendarEvent[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data as EventRow[]).map(rowToEvent);
}

/** Supabase에 일정 생성 (DB가 id 발급) */
export async function createEvent(
  event: Omit<CalendarEvent, "id">,
  userId: string,
): Promise<CalendarEvent> {
  if (!supabase) {
    throw new Error("Supabase가 설정되지 않았습니다.");
  }

  const row = eventToInsertRow(event, userId);

  const { data, error } = await supabase
    .from("events")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    eventDebugLog("createEvent: Supabase insert 오류", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      row,
    });
    throw toUserFacingError(error);
  }
  return rowToEvent(data as EventRow);
}

/** Supabase 일정 수정 */
export async function updateEvent(
  event: CalendarEvent,
  userId: string,
): Promise<void> {
  if (!supabase) return;

  const row = eventToInsertRow(event, userId);

  const { error } = await supabase
    .from("events")
    .update(row)
    .eq("id", event.id)
    .eq("user_id", userId);

  if (error) {
    eventDebugLog("updateEvent: Supabase update 오류", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      row,
    });
    throw toUserFacingError(error);
  }
}

/** Supabase 일정 삭제 */
export async function deleteEvent(id: string, userId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

/** Supabase 사용자 일정 전체 삭제 */
export async function deleteAllEvents(userId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

/** localStorage 일정을 Supabase로 일괄 이전 */
export async function importEvents(
  events: CalendarEvent[],
  userId: string,
): Promise<void> {
  if (!supabase || events.length === 0) return;

  const rows = events.map((event) => eventToInsertRow(event, userId));
  const { error } = await supabase.from("events").insert(rows);
  if (error) throw error;
}
