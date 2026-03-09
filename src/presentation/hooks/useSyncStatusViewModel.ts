import { useMemo } from 'react'
import { useAppSelector, useAppServices } from '../context/AppServicesContext'

export function useSyncStatusViewModel() {
  const { eventService } = useAppServices()
  const state = useAppSelector(current => current)

  const actions = useMemo(
    () => ({
      syncNow: eventService.syncNow.bind(eventService),
    }),
    [eventService],
  )

  return {
    ...state,
    actions,
  }
}
