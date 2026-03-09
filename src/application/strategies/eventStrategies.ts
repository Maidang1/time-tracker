import type {
  CheckinAnalytics,
  CreateCheckinRecordInput,
  CreateTimeRecordInput,
  CreateTodoRecordInput,
  EventAnalytics,
  EventItem,
  EventSummary,
  RecordInput,
  UpdateEventInput,
} from '../../domain/events'
import {
  buildEventAnalytics,
  createRecordForEvent,
  getEventSummary,
  updateEventMetadata,
} from '../../domain/events'

export interface EventStrategy {
  readonly type: EventItem['type']
  createRecord(event: EventItem, input: RecordInput): ReturnType<typeof createRecordForEvent>
  updateMetadata(event: EventItem, input: UpdateEventInput): EventItem
  summary(event: EventItem): EventSummary
  analytics(event: EventItem): EventAnalytics
}

class TimeEventStrategy implements EventStrategy {
  readonly type = 'time' as const

  createRecord(event: EventItem, input: RecordInput) {
    return createRecordForEvent(event, input as CreateTimeRecordInput)
  }

  updateMetadata(event: EventItem, input: UpdateEventInput) {
    return updateEventMetadata(event, input)
  }

  summary(event: EventItem) {
    return getEventSummary(event)
  }

  analytics(event: EventItem) {
    return buildEventAnalytics(event)
  }
}

class CheckinEventStrategy implements EventStrategy {
  readonly type = 'checkin' as const

  createRecord(event: EventItem, input: RecordInput) {
    return createRecordForEvent(event, input as CreateCheckinRecordInput)
  }

  updateMetadata(event: EventItem, input: UpdateEventInput) {
    return updateEventMetadata(event, input)
  }

  summary(event: EventItem) {
    return getEventSummary(event)
  }

  analytics(event: EventItem) {
    return buildEventAnalytics(event) as CheckinAnalytics
  }
}

class TodoEventStrategy implements EventStrategy {
  readonly type = 'todo' as const

  createRecord(event: EventItem, input: RecordInput) {
    return createRecordForEvent(event, input as CreateTodoRecordInput)
  }

  updateMetadata(event: EventItem, input: UpdateEventInput) {
    return updateEventMetadata(event, input)
  }

  summary(event: EventItem) {
    return getEventSummary(event)
  }

  analytics(event: EventItem) {
    return buildEventAnalytics(event)
  }
}

const strategies: Record<EventItem['type'], EventStrategy> = {
  time: new TimeEventStrategy(),
  checkin: new CheckinEventStrategy(),
  todo: new TodoEventStrategy(),
}

export const getEventStrategy = (eventType: EventItem['type']) => strategies[eventType]
