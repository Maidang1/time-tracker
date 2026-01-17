
import type { EventItem, EventRecord } from '../types/events'

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(part => Number(part) || 0)
  return hours * 60 + minutes
}

export const calculateDurationMinutes = (start: string, end: string) => {
  const startMinutes = toMinutes(start)
  const endMinutes = toMinutes(end)
  const diff = endMinutes - startMinutes
  return diff >= 0 ? diff : diff + 24 * 60
}

export const loadEvents = (): EventItem[] => {
  // Redesign: No storage access
  return []
}

export const persistEvents = (events: EventItem[]) => {
  // Redesign: No storage access
}

export const updateEvent = (event: EventItem) => {
  // Redesign: No storage access
}

export const deleteEvent = (eventId: number) => {
  // Redesign: No storage access
}

export const createEvent = (title: string, description: string): EventItem => {
  const now = new Date()
  return {
    id: Date.now(),
    title,
    description,
    createdAt: now.toISOString(),
    records: []
  }
}

export const createRecord = (
  date: string,
  startTime: string,
  endTime: string,
  note: string
): EventRecord => ({
  id: Date.now(),
  date,
  startTime,
  endTime,
  durationMinutes: calculateDurationMinutes(startTime, endTime),
  note,
  startDate: '',
  endDate: '',
  createdAt: ''
})
