import type { CalendarEvent, EventCategoryMeta } from '../types/calendar'

/** 일정 카테고리 메타 정보 (색상·라벨) */
export const eventCategories: EventCategoryMeta[] = [
  { id: 'personal', label: '개인', color: '#FACC15' },
  { id: 'finance', label: '금융', color: '#F97316' },
  { id: 'subscription', label: '구독', color: '#A855F7' },
  { id: 'career', label: '취업', color: '#EF4444' },
  { id: 'family', label: '가족', color: '#22C55E' },
  { id: 'church', label: '교회', color: '#3B82F6' },
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
    category: 'finance',
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
    title: '기술 면접',
    start: '2026-07-05',
    end: '2026-07-05',
    category: 'career',
    allDay: false,
  },
  {
    id: '5',
    title: '가족 외식',
    start: '2026-06-26T18:00',
    end: '2026-06-26T20:00',
    category: 'family',
    allDay: false,
  },
  {
    id: '6',
    title: '주일 예배',
    start: '2026-06-29T10:00',
    end: '2026-06-29T12:00',
    category: 'church',
    allDay: false,
  },
]
