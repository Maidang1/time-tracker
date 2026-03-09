import { useAppSelector } from '../presentation/context/AppServicesContext'

export const useEventData = (eventId: number) => {
  const eventData = useAppSelector(state => state.events.find(event => event.id === eventId) || null)
  return {
    eventData,
    setEventData: () => undefined,
    refreshEvent: () => undefined,
  }
}
