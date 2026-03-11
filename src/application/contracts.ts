import type { EventItem } from '../domain/events'

export type SyncTask = {
  id: string
  type: 'upsert' | 'delete'
  eventId: number
  payload?: EventItem
  timestamp: number
}

export type CommandResult<T> = {
  ok: boolean
  data?: T
  error?: string
}

export interface EventRepository {
  load(): Promise<EventItem[]>
  save(events: EventItem[]): Promise<void>
}

export interface SyncTaskRepository {
  load(): Promise<SyncTask[]>
  save(tasks: SyncTask[]): Promise<void>
}

export interface RemoteEventStore {
  initialize(): Promise<void>
  pullEvents(): Promise<EventItem[]>
  upsertEvent(event: EventItem): Promise<void>
  deleteEvent(eventId: number): Promise<void>
}
