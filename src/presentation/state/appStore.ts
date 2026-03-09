import type { EventItem } from '../../domain/events'

export type SyncStatus = 'idle' | 'syncing' | 'error'

export type AppState = {
  events: EventItem[]
  initialized: boolean
  pendingTasks: number
  syncStatus: SyncStatus
  lastError: string | null
}

type Listener = () => void

const initialState: AppState = {
  events: [],
  initialized: false,
  pendingTasks: 0,
  syncStatus: 'idle',
  lastError: null,
}

export class AppStore {
  private state: AppState = initialState

  private listeners = new Set<Listener>()

  getState = () => this.state

  setState = (nextState: Partial<AppState>) => {
    this.state = {
      ...this.state,
      ...nextState,
    }
    this.listeners.forEach(listener => listener())
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
