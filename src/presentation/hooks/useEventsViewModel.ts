import { useMemo } from 'react'
import type { EventItem, EventType } from '../../domain/events'
import { useAppSelector, useAppServices } from '../context/AppServicesContext'

const typeLabelMap: Record<EventType, string> = {
  time: '时间',
  checkin: '打卡',
  todo: '待办',
}

export function useEventsViewModel() {
  const { eventService } = useAppServices()
  const state = useAppSelector(current => current)

  const actions = useMemo(
    () => ({
      createEvent: eventService.createEvent.bind(eventService),
      updateEvent: eventService.updateEvent.bind(eventService),
      deleteEvent: eventService.deleteEvent.bind(eventService),
      syncNow: eventService.syncNow.bind(eventService),
    }),
    [eventService],
  )

  return {
    ...state,
    actions,
    typeLabelMap,
    getEvent: (eventId: number): EventItem | null => eventService.getEvent(eventId),
  }
}
