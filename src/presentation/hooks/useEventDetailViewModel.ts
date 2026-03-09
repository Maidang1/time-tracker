import { useMemo } from 'react'
import { formatLocalDate } from '../../domain/events'
import { useAppSelector, useAppServices } from '../context/AppServicesContext'

export function useEventDetailViewModel(eventId: number) {
  const { analyticsService, eventService } = useAppServices()
  const event = useAppSelector(state =>
    state.events.find(item => item.id === eventId) || null,
  )
  const syncStatus = useAppSelector(state => state.syncStatus)
  const pendingTasks = useAppSelector(state => state.pendingTasks)
  const lastError = useAppSelector(state => state.lastError)

  const analytics = useMemo(
    () => (event ? analyticsService.getAnalytics(event) : null),
    [analyticsService, event],
  )

  const summary = useMemo(
    () => (event ? analyticsService.getSummary(event) : null),
    [analyticsService, event],
  )

  return {
    event,
    analytics,
    summary,
    syncStatus,
    pendingTasks,
    lastError,
    today: formatLocalDate(new Date()),
    actions: {
      updateEvent: eventService.updateEvent.bind(eventService),
      createRecord: eventService.createRecord.bind(eventService),
      updateRecord: eventService.updateRecord.bind(eventService),
      deleteRecord: eventService.deleteRecord.bind(eventService),
      toggleTodoRecord: eventService.toggleTodoRecord.bind(eventService),
      checkinToday: eventService.checkinToday.bind(eventService),
      syncNow: eventService.syncNow.bind(eventService),
    },
  }
}
