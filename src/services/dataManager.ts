import type {
  CreateCheckinRecordInput,
  CreateTimeRecordInput,
  CreateTodoRecordInput,
  EventItem,
  EventRecord,
  EventType,
} from '../domain/events'
import { getAppServices } from '../infrastructure/bootstrap/appBootstrap'

type Listener = () => void

class DataManagerCompat {
  private listeners = new Set<Listener>()

  constructor() {
    const { store } = getAppServices()
    store.subscribe(() => {
      this.listeners.forEach(listener => listener())
    })
  }

  async initialize() {
    await getAppServices().eventService.initialize()
  }

  async waitForInitialization() {
    const state = getAppServices().store.getState()
    if (!state.initialized) {
      await this.initialize()
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setSyncErrorCallback() {}

  getAllEvents() {
    return getAppServices().store.getState().events
  }

  getEventById(id: number) {
    return getAppServices().eventService.getEvent(id) || undefined
  }

  async createEvent(title: string, description: string, type: EventType = 'time') {
    const result = await getAppServices().eventService.createEvent({ title, description, type })
    return result.data || null
  }

  async updateEvent(event: EventItem) {
    const result = await getAppServices().eventService.updateEvent(event.id, {
      title: event.title,
      description: event.description,
    })
    return result.ok
  }

  async deleteEvent(eventId: number) {
    const result = await getAppServices().eventService.deleteEvent(eventId)
    return result.ok
  }

  async createRecord(
    eventId: number,
    recordData: CreateTimeRecordInput | CreateCheckinRecordInput | CreateTodoRecordInput,
  ) {
    const result = await getAppServices().eventService.createRecord(eventId, recordData)
    const event = result.data
    return event ? event.records[0] || null : null
  }

  async updateRecord(
    eventId: number,
    record: EventRecord,
  ) {
    const input =
      record.kind === 'time'
        ? {
            startDate: record.startDate,
            startTime: record.startTime,
            endDate: record.endDate,
            endTime: record.endTime,
            note: record.note,
          }
        : record.kind === 'checkin'
          ? {
              startDate: record.startDate,
              note: record.note,
            }
          : {
              note: record.note,
            }
    const result = await getAppServices().eventService.updateRecord(eventId, record.id, input)
    return result.ok
  }

  async deleteRecord(eventId: number, recordId: number) {
    const result = await getAppServices().eventService.deleteRecord(eventId, recordId)
    return result.ok
  }

  async toggleRecordComplete(eventId: number, recordId: number) {
    const result = await getAppServices().eventService.toggleTodoRecord(eventId, recordId)
    return result.ok
  }

  hasChanges() {
    return getAppServices().store.getState().pendingTasks > 0
  }

  getPendingChangesCount() {
    return getAppServices().store.getState().pendingTasks
  }

  async syncToRemote() {
    return getAppServices().eventService.syncNow()
  }

  clear() {
    this.listeners.clear()
  }
}

export default new DataManagerCompat()
