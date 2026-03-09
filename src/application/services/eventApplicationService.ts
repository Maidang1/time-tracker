import type {
  CommandResult,
  EventRepository,
  RemoteSyncGateway,
  SyncTask,
  SyncTaskRepository,
} from '../contracts'
import type {
  CreateCheckinRecordInput,
  CreateEventInput,
  CreateTimeRecordInput,
  CreateTodoRecordInput,
  EventItem,
  RecordInput,
  UpdateEventInput,
} from '../../domain/events'
import {
  DomainError,
  createEvent,
  deleteRecordForEvent,
  formatLocalDate,
  mergeRemoteEvents,
  normalizeEvents,
  sortEventsDesc,
  toggleTodoRecord,
  updateRecordForEvent,
  withUpdatedRecords,
} from '../../domain/events'
import { getEventStrategy } from '../strategies/eventStrategies'
import type { AppStore } from '../../presentation/state/appStore'

const createTaskId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

export class EventApplicationService {
  private syncPromise: Promise<boolean> | null = null

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly syncTaskRepository: SyncTaskRepository,
    private readonly syncGateway: RemoteSyncGateway,
    private readonly store: AppStore,
  ) {}

  async initialize() {
    const [events, tasks] = await Promise.all([
      this.eventRepository.load(),
      this.syncTaskRepository.load(),
    ])

    this.store.setState({
      events,
      pendingTasks: tasks.length,
      initialized: true,
      lastError: null,
    })

    void this.refreshFromRemote()
    if (tasks.length > 0) {
      void this.syncNow()
    }
  }

  private getState() {
    return this.store.getState()
  }

  private async saveLocal(events: EventItem[], tasks: SyncTask[]) {
    await Promise.all([
      this.eventRepository.save(events),
      this.syncTaskRepository.save(tasks),
    ])

    this.store.setState({
      events,
      pendingTasks: tasks.length,
    })
  }

  private async enqueueTask(task: SyncTask, events: EventItem[]) {
    const tasks = [...(await this.syncTaskRepository.load()), task]
    await this.saveLocal(events, tasks)
    void this.syncNow()
  }

  private toFailure<T>(error: unknown): CommandResult<T> {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }

  async createEvent(input: CreateEventInput): Promise<CommandResult<EventItem>> {
    try {
      const event = createEvent(input)
      const events = sortEventsDesc([event, ...this.getState().events])
      await this.enqueueTask(
        {
          id: createTaskId(),
          type: 'upsert',
          eventId: event.id,
          payload: event,
          timestamp: Date.now(),
        },
        events,
      )
      return { ok: true, data: event }
    } catch (error) {
      return this.toFailure(error)
    }
  }

  async updateEvent(eventId: number, input: UpdateEventInput): Promise<CommandResult<EventItem>> {
    try {
      const current = this.getState().events.find(event => event.id === eventId)
      if (!current) {
        throw new DomainError('事件不存在')
      }
      const updated = getEventStrategy(current.type).updateMetadata(current, input)
      const events = sortEventsDesc(
        this.getState().events.map(event => (event.id === eventId ? updated : event)),
      )
      await this.enqueueTask(
        {
          id: createTaskId(),
          type: 'upsert',
          eventId,
          payload: updated,
          timestamp: Date.now(),
        },
        events,
      )
      return { ok: true, data: updated }
    } catch (error) {
      return this.toFailure(error)
    }
  }

  async deleteEvent(eventId: number): Promise<CommandResult<boolean>> {
    try {
      const events = this.getState().events.filter(event => event.id !== eventId)
      await this.enqueueTask(
        {
          id: createTaskId(),
          type: 'delete',
          eventId,
          timestamp: Date.now(),
        },
        events,
      )
      return { ok: true, data: true }
    } catch (error) {
      return this.toFailure(error)
    }
  }

  async createRecord(
    eventId: number,
    input: CreateTimeRecordInput | CreateCheckinRecordInput | CreateTodoRecordInput,
  ): Promise<CommandResult<EventItem>> {
    try {
      const current = this.getState().events.find(event => event.id === eventId)
      if (!current) {
        throw new DomainError('事件不存在')
      }

      const strategy = getEventStrategy(current.type)
      const record = strategy.createRecord(current, input as RecordInput)
      const updated = withUpdatedRecords(current, [record, ...current.records])
      const events = sortEventsDesc(
        this.getState().events.map(event => (event.id === eventId ? updated : event)),
      )
      await this.enqueueTask(
        {
          id: createTaskId(),
          type: 'upsert',
          eventId,
          payload: updated,
          timestamp: Date.now(),
        },
        events,
      )
      return { ok: true, data: updated }
    } catch (error) {
      return this.toFailure(error)
    }
  }

  async updateRecord(
    eventId: number,
    recordId: number,
    input: RecordInput,
  ): Promise<CommandResult<EventItem>> {
    try {
      const current = this.getState().events.find(event => event.id === eventId)
      if (!current) {
        throw new DomainError('事件不存在')
      }

      const records = updateRecordForEvent(current, recordId, input)
      const updated = withUpdatedRecords(current, records)
      const events = sortEventsDesc(
        this.getState().events.map(event => (event.id === eventId ? updated : event)),
      )
      await this.enqueueTask(
        {
          id: createTaskId(),
          type: 'upsert',
          eventId,
          payload: updated,
          timestamp: Date.now(),
        },
        events,
      )
      return { ok: true, data: updated }
    } catch (error) {
      return this.toFailure(error)
    }
  }

  async deleteRecord(eventId: number, recordId: number): Promise<CommandResult<EventItem>> {
    try {
      const current = this.getState().events.find(event => event.id === eventId)
      if (!current) {
        throw new DomainError('事件不存在')
      }

      const updated = withUpdatedRecords(current, deleteRecordForEvent(current, recordId))
      const events = sortEventsDesc(
        this.getState().events.map(event => (event.id === eventId ? updated : event)),
      )
      await this.enqueueTask(
        {
          id: createTaskId(),
          type: 'upsert',
          eventId,
          payload: updated,
          timestamp: Date.now(),
        },
        events,
      )
      return { ok: true, data: updated }
    } catch (error) {
      return this.toFailure(error)
    }
  }

  async toggleTodoRecord(eventId: number, recordId: number): Promise<CommandResult<EventItem>> {
    try {
      const current = this.getState().events.find(event => event.id === eventId)
      if (!current || current.type !== 'todo') {
        throw new DomainError('待办记录不存在')
      }

      const updated = withUpdatedRecords(current, toggleTodoRecord(current, recordId))
      const events = sortEventsDesc(
        this.getState().events.map(event => (event.id === eventId ? updated : event)),
      )
      await this.enqueueTask(
        {
          id: createTaskId(),
          type: 'upsert',
          eventId,
          payload: updated,
          timestamp: Date.now(),
        },
        events,
      )
      return { ok: true, data: updated }
    } catch (error) {
      return this.toFailure(error)
    }
  }

  async checkinToday(eventId: number): Promise<CommandResult<EventItem>> {
    return this.createRecord(eventId, {
      startDate: formatLocalDate(new Date()),
    })
  }

  async refreshFromRemote() {
    try {
      const remoteEvents = await this.syncGateway.pullEvents()
      const tasks = await this.syncTaskRepository.load()
      const merged = mergeRemoteEvents(this.getState().events, remoteEvents, tasks)
      await this.eventRepository.save(merged)
      this.store.setState({
        events: merged,
        lastError: null,
      })
    } catch (error) {
      this.store.setState({
        lastError: error instanceof Error ? error.message : '拉取云端数据失败',
      })
    }
  }

  async syncNow(): Promise<boolean> {
    if (this.syncPromise) {
      return this.syncPromise
    }

    this.syncPromise = (async () => {
      const initialTasks = await this.syncTaskRepository.load()
      if (initialTasks.length === 0) {
        this.store.setState({ syncStatus: 'idle', pendingTasks: 0 })
        return true
      }

      this.store.setState({
        syncStatus: 'syncing',
        lastError: null,
      })

      let tasks = [...initialTasks]
      while (tasks.length > 0) {
        const task = tasks[0]
        try {
          await this.syncGateway.pushTask(task)
          tasks = tasks.slice(1)
          await this.syncTaskRepository.save(tasks)
          this.store.setState({ pendingTasks: tasks.length })
        } catch (error) {
          this.store.setState({
            syncStatus: 'error',
            lastError: error instanceof Error ? error.message : '同步失败',
            pendingTasks: tasks.length,
          })
          return false
        }
      }

      await this.refreshFromRemote()
      this.store.setState({
        syncStatus: 'idle',
        pendingTasks: 0,
      })
      return true
    })()

    try {
      return await this.syncPromise
    } finally {
      this.syncPromise = null
    }
  }

  getEvent(eventId: number) {
    return this.getState().events.find(event => event.id === eventId) || null
  }

  hydrateRawEvents(rawEvents: any[]) {
    const events = normalizeEvents(rawEvents)
    this.store.setState({ events })
  }
}
