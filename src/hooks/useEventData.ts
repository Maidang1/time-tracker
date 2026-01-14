import { useState, useEffect, useCallback } from 'react'
import { useDidShow } from '@tarojs/taro'

import type { EventItem } from '../types/events'
import DataManager from '../services/dataManager'

export const useEventData = (eventId: number) => {
  const [eventData, setEventData] = useState<EventItem | null>(null)

  const refreshEvent = useCallback(() => {
    if (!eventId) {
      setEventData(null)
      return
    }

    const event = DataManager.getEventById(eventId)
    setEventData(event || null)
  }, [eventId])

  // 页面显示时刷新数据
  useDidShow(() => {
    refreshEvent()
  })

  // 首次加载
  useEffect(() => {
    refreshEvent()

    const unsubscribe = DataManager.subscribe(() => {
      refreshEvent()
    })

    return unsubscribe
  }, [refreshEvent])

  return { eventData, setEventData, refreshEvent }
}
