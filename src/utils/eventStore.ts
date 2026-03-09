import type {
  CreateCheckinRecordInput,
  CreateTimeRecordInput,
  CreateTodoRecordInput,
  EventItem,
  EventRecord,
} from '../domain/events'
import { calculateDurationMinutes, createEvent, createRecordForEvent } from '../domain/events'

export { calculateDurationMinutes }

export const loadEvents = (): EventItem[] => []

export const persistEvents = (_events: EventItem[]) => undefined

export const updateEvent = (_event: EventItem) => undefined

export const deleteEvent = (_eventId: number) => undefined

export const createLocalEvent = (title: string, description: string): EventItem =>
  createEvent({
    title,
    description,
    type: 'time',
  })

export const createRecord = (
  date: string,
  startTime: string,
  endTime: string,
  note: string,
): EventRecord =>
  createRecordForEvent(createLocalEvent('临时事件', ''), {
    startDate: date,
    startTime,
    endDate: date,
    endTime,
    note,
  } as CreateTimeRecordInput | CreateCheckinRecordInput | CreateTodoRecordInput)
