import type { EventAnalytics, EventItem, EventSummary } from '../../domain/events'
import { getEventStrategy } from '../strategies/eventStrategies'

export class AnalyticsService {
  getSummary(event: EventItem): EventSummary {
    return getEventStrategy(event.type).summary(event)
  }

  getAnalytics(event: EventItem): EventAnalytics {
    return getEventStrategy(event.type).analytics(event)
  }
}
