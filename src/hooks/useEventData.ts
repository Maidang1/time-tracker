import { useCallback, useState } from 'react'
import { useDidShow } from '@tarojs/taro'

import type { EventItem } from '../types/events'
import { loadEvents } from '../utils/eventStore'

export const useEventData = (eventId: number) => {
  const [eventData, setEventData] = useState<EventItem | null>(null)

  const refreshEvent = useCallback(() => {
    const events = loadEvents()
    const found = events.find(item => item.id === eventId) || null
    setEventData(found)
  }, [eventId])

  useDidShow(() => {
    refreshEvent()
  })

  return { eventData, setEventData, refreshEvent }
}
