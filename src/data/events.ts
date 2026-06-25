import type { CalendarEvent, EventCategoryMeta } from '../types/calendar'

/** 일정 카테고리 메타 정보 (색상·라벨) */
export const eventCategories: EventCategoryMeta[] = [
  { id: 'personal', label: '개인 일정', color: '#007AFF' },
  { id: 'asset', label: '자산 일정', color: '#F59E0B' },
  { id: 'subscription', label: '구독 스케줄', color: '#A855F7' },
  { id: 'project', label: '프로젝트 스프린트', color: '#22C55E' },
]

/** 캘린더 일정 Mock 데이터 (최초 로드 시 시드) */
export const eventsData: CalendarEvent[] = [
  {
    id: '1',
    title: '포트폴리오 리뷰 미팅',
    start: '2026-06-25T14:00',
    end: '2026-06-25T15:30',
    category: 'personal',
    allDay: false,
  },
  {
    id: '2',
    title: '주식 배당금 입금',
    start: '2026-06-28',
    category: 'asset',
    allDay: true,
  },
  {
    id: '3',
    title: 'Netflix 구독 갱신',
    start: '2026-06-30',
    category: 'subscription',
    allDay: true,
  },
  {
    id: '4',
    title: 'Sprint 3 마감',
    start: '2026-07-05',
    end: '2026-07-07',
    category: 'project',
    allDay: true,
  },
  {
    id: '5',
    title: '주간 스탠드업',
    start: '2026-06-26T10:00',
    end: '2026-06-26T10:30',
    category: 'project',
    allDay: false,
  },
]
