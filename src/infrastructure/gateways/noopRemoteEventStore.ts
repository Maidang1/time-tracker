import type { EventItem } from '../../domain/events'
import type { RemoteEventStore } from '../../application/contracts'

// Fallback remote store used when the runtime has no supported cloud backend.
export class NoopRemoteEventStore implements RemoteEventStore {
  async initialize(): Promise<void> {}

  async pullEvents(): Promise<EventItem[]> {
    return []
  }

  async upsertEvent(_event: EventItem): Promise<void> {}

  async deleteEvent(_eventId: number): Promise<void> {}
}
