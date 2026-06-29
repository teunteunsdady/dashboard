import { useEffect, useState } from "react";
import type {
  CalendarEvent,
  EventCategory,
  EventCategoryMeta,
} from "../../types/calendar";
import { eventDebugLog } from "../../utils/eventDebugLog";
import {
  buildEventDateTime,
  formatEventFormSnapshot,
  isAllDayEvent,
  localToday,
  normalizeTimedForm,
  readEventFormRawInputs,
  resolveTimedEventEnd,
  splitLocalDateTime,
  syncEventFormFromDom,
  validateEventForm,
} from "../../utils/calendarUtils";
import {
  clearEventNotificationHistory,
  isNotificationSupported,
  requestNotificationPermissionFromUserGesture,
} from "../../utils/eventNotifications";
import { DatePicker } from "../ui/DatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { TimePicker } from "../ui/TimePicker";
import { Toggle } from "../ui/Toggle";

export type EventModalMode = "create" | "edit";

interface EventModalProps {
  isOpen: boolean;
  mode: EventModalMode;
  event: CalendarEvent | null;
  categories: EventCategoryMeta[];
  onClose: () => void;
  onSave: (event: CalendarEvent) => Promise<void>;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

interface EventForm {
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  category: EventCategory;
  description: string;
  notify: boolean;
}

const emptyForm = (defaultStart?: string): EventForm => {
  const isTimed = defaultStart?.includes("T");
  const { date: startDate, time: startTime } = defaultStart
    ? splitLocalDateTime(defaultStart)
    : { date: localToday(), time: "09:00" };

  return {
    title: "",
    allDay: !isTimed,
    startDate,
    startTime: isTimed ? startTime : "09:00",
    endDate: "",
    endTime: "",
    category: "personal",
    description: "",
    notify: false,
  };
};

const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-main focus:ring-2 focus:ring-main/20";

/** 일정 추가/수정/삭제 모달 — 종일·시간 지정 지원 */
export function EventModal({
  isOpen,
  mode,
  event,
  categories,
  onClose,
  onSave,
  onDelete,
  readOnly = false,
}: EventModalProps) {
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [formError, setFormError] = useState<{
    message: string;
    snapshot?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setSaving(false);

    if (mode === "edit" && event) {
      const allDay = isAllDayEvent(event);
      const startParts = splitLocalDateTime(event.start);
      const endParts = event.end ? splitLocalDateTime(event.end) : null;

      setForm({
        title: event.title,
        allDay,
        startDate: startParts.date,
        startTime: allDay ? "09:00" : startParts.time,
        endDate: endParts?.date ?? "",
        endTime: allDay ? "" : (endParts?.time ?? ""),
        category: event.category,
        description: event.description ?? "",
        notify: event.notify ?? false,
      });
    } else {
      setForm(emptyForm(event?.start));
    }
  }, [isOpen, mode, event]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readOnly || saving) return;

    const rawInputs = readEventFormRawInputs(e.currentTarget);
    eventDebugLog("EventModal: submit raw DOM", rawInputs);

    const syncedForm = syncEventFormFromDom(form, e.currentTarget);
    const normalizedForm = syncedForm.allDay
      ? syncedForm
      : normalizeTimedForm(syncedForm);
    setForm(normalizedForm);
    eventDebugLog("EventModal: submit normalized form", normalizedForm);

    const validation = validateEventForm(
      {
        ...normalizedForm,
        title: normalizedForm.title,
      },
      rawInputs,
    );
    if (validation.error) {
      eventDebugLog("EventModal: 클라이언트 검증 실패", validation);
      setFormError({
        message: validation.error,
        snapshot: validation.snapshot,
      });
      return;
    }

    const start = buildEventDateTime(
      normalizedForm.startDate,
      normalizedForm.startTime,
      normalizedForm.allDay,
    );

    let end: string | undefined;
    if (normalizedForm.allDay) {
      end = normalizedForm.endDate || undefined;
    } else {
      end = resolveTimedEventEnd(normalizedForm);
    }

    const payload: CalendarEvent = {
      id: mode === "edit" && event ? event.id : "",
      title: normalizedForm.title.trim(),
      start,
      end,
      category: normalizedForm.category,
      description: normalizedForm.description.trim() || undefined,
      allDay: normalizedForm.allDay,
      notify: normalizedForm.notify,
    };

    eventDebugLog("EventModal: Supabase 저장 payload", payload);

    setSaving(true);
    setFormError(null);
    try {
      if (mode === "edit" && event?.id) {
        clearEventNotificationHistory(event.id);
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      eventDebugLog("EventModal: 저장 catch", {
        message: err instanceof Error ? err.message : err,
        payload,
      });
      const message =
        err instanceof Error ? err.message : "일정을 저장하지 못했습니다.";
      setFormError({
        message,
        snapshot: formatEventFormSnapshot(normalizedForm, rawInputs),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (mode === "edit" && event && onDelete) {
      clearEventNotificationHistory(event.id);
      onDelete(event.id);
      onClose();
    }
  };

  const handleNotifyChange = (notify: boolean) => {
    if (!notify) {
      setForm((prev) => ({ ...prev, notify: false }));
      return;
    }

    if (!isNotificationSupported()) {
      setFormError({
        message:
          "이 브라우저는 알림을 지원하지 않습니다. iOS는 홈 화면에 추가한 뒤 시도해 주세요.",
      });
      return;
    }

    if (Notification.permission === "granted") {
      setForm((prev) => ({ ...prev, notify: true }));
      setFormError(null);
      return;
    }

    if (Notification.permission === "denied") {
      setFormError({
        message:
          "알림이 차단되어 있습니다. 브라우저(또는 사이트) 설정에서 알림을 허용해 주세요.",
      });
      return;
    }

    void requestNotificationPermissionFromUserGesture().then((granted) => {
      if (granted) {
        setForm((prev) => ({ ...prev, notify: true }));
        setFormError(null);
      } else {
        setFormError({ message: "알림 권한이 필요합니다." });
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        readOnly ? "일정 보기" : mode === "create" ? "일정 추가" : "일정 수정"
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className={readOnly ? "pointer-events-none opacity-90" : undefined}>
        {formError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            <p className="font-medium">{formError.message}</p>
            {formError.snapshot && (
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-red-100/60 px-2.5 py-2 font-mono text-xs leading-relaxed text-red-700">
                {formError.snapshot}
              </pre>
            )}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            제목
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={fieldClass}
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        <Toggle
          checked={form.allDay}
          onChange={(allDay) => {
            setForm((prev) => {
              if (allDay) {
                return { ...prev, allDay, endTime: "" };
              }
              return { ...prev, allDay, endDate: "", endTime: "" };
            });
          }}
          label="종일 일정"
          description={
            form.allDay
              ? "하루 종일 또는 기간으로 저장됩니다."
              : "시작·종료 시간을 지정합니다."
          }
        />

        {form.allDay ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatePicker
              label="시작일"
              name="startDate"
              value={form.startDate}
              onChange={(startDate) =>
                setForm((prev) => ({
                  ...prev,
                  startDate,
                  endDate:
                    prev.endDate && prev.endDate < startDate
                      ? startDate
                      : prev.endDate,
                }))
              }
              required
            />
            <DatePicker
              label="종료일"
              name="endDate"
              value={form.endDate}
              onChange={(endDate) => setForm({ ...form, endDate })}
              placeholder="선택 안 함"
              hint="비우면 하루 일정으로 저장돼요. 종료일을 넣으면 기간 일정이 됩니다."
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DatePicker
                label="시작일"
                name="startDate"
                value={form.startDate}
                onChange={(startDate) =>
                  setForm((prev) => ({
                    ...prev,
                    startDate,
                    endDate:
                      prev.endDate && prev.endDate < startDate
                        ? startDate
                        : prev.endDate,
                  }))
                }
                required
              />
              <TimePicker
                label="시작 시간"
                name="startTime"
                value={form.startTime}
                onChange={(startTime) => setForm({ ...form, startTime })}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DatePicker
                label="종료일"
                name="endDate"
                value={form.endDate}
                onChange={(endDate) => setForm({ ...form, endDate })}
                placeholder="선택 안 함"
                hint="비우면 시작일과 같은 날·종료 시간만 지정됩니다."
              />
              <TimePicker
                label="종료 시간"
                name="endTime"
                value={form.endTime}
                referenceStartTime={form.startTime}
                allowEmpty
                onChange={(endTime) =>
                  setForm((prev) => ({
                    ...prev,
                    endTime,
                    endDate:
                      endTime && !prev.endDate ? prev.startDate : prev.endDate,
                  }))
                }
                placeholder="13:00"
                hint="비우면 종료 시간 없이 저장돼요. 13:00 또는 1:00 입력 시 24시간 형식으로 저장됩니다."
              />
            </div>
          </>
        )}

        <Select
          label="카테고리"
          id="event-category"
          value={form.category}
          onChange={(category) =>
            setForm({ ...form, category: category as EventCategory })
          }
          options={categories.map((cat) => ({
            value: cat.id,
            label: cat.label,
          }))}
        />

        <Toggle
          checked={form.notify}
          onChange={handleNotifyChange}
          disabled={readOnly}
          label="브라우저 알림"
          description={
            form.allDay
              ? "종일 일정은 당일 09:00에 알려드려요. 백그라운드 알림을 켜면 탭을 닫아도 받을 수 있습니다."
              : "일정 시작 시간에 알려드려요. 백그라운드 알림을 켜면 탭을 닫아도 받을 수 있습니다."
          }
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            메모
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className={`${fieldClass} resize-none`}
            placeholder="선택 사항"
          />
        </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-4">
          {!readOnly && mode === "edit" && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm font-medium text-red-500 hover:text-red-600"
            >
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
            >
              {readOnly ? "닫기" : "취소"}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white hover:bg-main-dark disabled:opacity-50"
              >
                {saving ? "저장 중…" : mode === "create" ? "추가" : "저장"}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
