import Taro from '@tarojs/taro'
import type { EventRepository, SyncTaskRepository } from '../../application/contracts'
import type { EventItem } from '../../domain/events'
import { normalizeEvents } from '../../domain/events'

const STORAGE_KEY_EVENTS = 'chrono-pulse-events'
const STORAGE_KEY_TASKS = 'chrono-pulse-sync-tasks'

export class LocalEventRepository implements EventRepository {
  async load(): Promise<EventItem[]> {
    const stored = Taro.getStorageSync(STORAGE_KEY_EVENTS)
    if (!Array.isArray(stored)) {
      return []
    }
    return normalizeEvents(stored)
  }

  async save(events: EventItem[]): Promise<void> {
    Taro.setStorageSync(STORAGE_KEY_EVENTS, events)
  }
}

export class LocalSyncTaskRepository implements SyncTaskRepository {
  async load() {
    const stored = Taro.getStorageSync(STORAGE_KEY_TASKS)
    return Array.isArray(stored) ? stored : []
  }

  async save(tasks: any[]): Promise<void> {
    Taro.setStorageSync(STORAGE_KEY_TASKS, tasks)
  }
}
