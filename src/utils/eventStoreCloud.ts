import Taro from '@tarojs/taro'

import type { EventItem, EventRecord } from '../types/events'
import {
  fetchEventsFromCloud as fetchEventsFromCloudNew,
  createEventInCloud,
  updateEventInCloud,
  deleteEventInCloud,
  fetchEventWithRecords,
  createRecordInCloud,
  updateRecordInCloud,
  deleteRecordInCloud,
  fetchRecordsByEventId
} from '../services/databaseService'

const STORAGE_KEY = 'blueprint_event_log'
const USE_CLOUD = true // 设置为 true 使用云开发，false 使用本地存储

const defaultEvents: EventItem[] = []

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(part => Number(part) || 0)
  return hours * 60 + minutes
}

export const calculateDurationMinutes = (start: string, end: string) => {
  const startMinutes = toMinutes(start)
  const endMinutes = toMinutes(end)
  const diff = endMinutes - startMinutes
  return diff >= 0 ? diff : diff + 24 * 60
}

// 从本地存储加载
const loadFromLocal = (): EventItem[] => {
  try {
    const stored = Taro.getStorageSync(STORAGE_KEY)
    if (stored && Array.isArray(stored)) {
      return stored as EventItem[]
    }
  } catch (error) {
    console.warn('Unable to read storage, using defaults.', error)
  }
  Taro.setStorageSync(STORAGE_KEY, defaultEvents)
  return defaultEvents
}

// 保存到本地存储
const persistToLocal = (events: EventItem[]) => {
  Taro.setStorageSync(STORAGE_KEY, events)
}

// 加载事件（支持云开发或本地存储）
export const loadEvents = async (): Promise<EventItem[]> => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      const events = await fetchEventsFromCloudNew()
      return events.length > 0 ? events : defaultEvents
    } catch (error) {
      console.error('云端加载失败，使用本地存储:', error)
      return []
    }
  }
  return loadFromLocal()
}

// 同步版本（向后兼容）
export const loadEventsSync = (): EventItem[] => {
  return loadFromLocal()
}

// 创建事件
export const createEvent = async (title: string, description: string): Promise<EventItem> => {
  const now = new Date()
  const event: EventItem = {
    id: Date.now(),
    title,
    description,
    createdAt: now.toISOString(),
    records: [] // 初始化为空数组，因为我们现在分别存储记录
  }

  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      await createEventInCloud(event)
    } catch (error) {
      console.error('云端创建失败:', error)
      // 降级到本地存储
      const events = loadFromLocal()
      events.push(event)
      persistToLocal(events)
    }
  } else {
    const events = loadFromLocal()
    events.push(event)
    persistToLocal(events)
  }

  return event
}

// 更新事件
export const updateEvent = async (event: EventItem) => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      await updateEventInCloud(event)
    } catch (error) {
      console.error('云端更新失败:', error)
      // 降级到本地存储
      const events = loadFromLocal()
      const next = events.map(item => (item.id === event.id ? event : item))
      persistToLocal(next)
    }
  } else {
    const events = loadFromLocal()
    const next = events.map(item => (item.id === event.id ? event : item))
    persistToLocal(next)
  }
}

// 删除事件
export const deleteEvent = async (eventId: number) => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      await deleteEventInCloud(eventId)
    } catch (error) {
      console.error('云端删除失败:', error)
      // 降级到本地存储
      const events = loadFromLocal()
      const next = events.filter(item => item.id !== eventId)
      persistToLocal(next)
    }
  } else {
    const events = loadFromLocal()
    const next = events.filter(item => item.id !== eventId)
    persistToLocal(next)
  }
}

// 获取单个事件及其记录
export const loadEventWithRecords = async (eventId: number): Promise<EventItem | null> => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      return await fetchEventWithRecords(eventId)
    } catch (error) {
      console.error('云端加载事件及其记录失败:', error)
      return null
    }
  }

  // 本地存储的替代方案
  const events = loadFromLocal()
  return events.find(event => event.id === eventId) || null
}

// 创建记录
export const createRecord = async (
  eventId: number,
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  note: string
): Promise<void> => {
  const record: Omit<EventRecord, 'id' | 'createdAt'> & { eventId: number } = {
    startDate,
    startTime,
    endDate,
    endTime,
    durationMinutes: calculateDurationMinutes(startTime, endTime),
    note,
    eventId
  }

  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      await createRecordInCloud(record)
    } catch (error) {
      console.error('云端创建记录失败:', error)
      // 降级到本地存储 - 需要更新本地事件记录
      const events = loadFromLocal()
      const eventIndex = events.findIndex(e => e.id === eventId)
      if (eventIndex !== -1) {
        const newRecord: EventRecord = {
          ...record,
          id: Date.now(),
          createdAt: new Date().toISOString()
        }
        events[eventIndex].records.push(newRecord)
        persistToLocal(events)
      }
    }
  } else {
    const events = loadFromLocal()
    const eventIndex = events.findIndex(e => e.id === eventId)
    if (eventIndex !== -1) {
      const newRecord: EventRecord = {
        ...record,
        id: Date.now(),
        createdAt: new Date().toISOString()
      }
      events[eventIndex].records.push(newRecord)
      persistToLocal(events)
    }
  }
}

// 更新记录
export const updateRecord = async (record: EventRecord & { eventId: number }): Promise<void> => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      await updateRecordInCloud(record)
    } catch (error) {
      console.error('云端更新记录失败:', error)
      // 降级到本地存储
      const events = loadFromLocal()
      const eventIndex = events.findIndex(e => e.id === record.eventId)
      if (eventIndex !== -1) {
        const recordIndex = events[eventIndex].records.findIndex(r => r.id === record.id)
        if (recordIndex !== -1) {
          events[eventIndex].records[recordIndex] = record
          persistToLocal(events)
        }
      }
    }
  } else {
    const events = loadFromLocal()
    const eventIndex = events.findIndex(e => e.id === record.eventId)
    if (eventIndex !== -1) {
      const recordIndex = events[eventIndex].records.findIndex(r => r.id === record.id)
      if (recordIndex !== -1) {
        events[eventIndex].records[recordIndex] = record
        persistToLocal(events)
      }
    }
  }
}

// 删除记录
export const deleteRecord = async (recordId: number, eventId: number): Promise<void> => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      await deleteRecordInCloud(recordId, eventId)
    } catch (error) {
      console.error('云端删除记录失败:', error)
      // 降级到本地存储
      const events = loadFromLocal()
      const eventIndex = events.findIndex(e => e.id === eventId)
      if (eventIndex !== -1) {
        events[eventIndex].records = events[eventIndex].records.filter(r => r.id !== recordId)
        persistToLocal(events)
      }
    }
  } else {
    const events = loadFromLocal()
    const eventIndex = events.findIndex(e => e.id === eventId)
    if (eventIndex !== -1) {
      events[eventIndex].records = events[eventIndex].records.filter(r => r.id !== recordId)
      persistToLocal(events)
    }
  }
}

// 获取事件的记录
export const loadRecordsByEventId = async (
  eventId: number,
  page: number = 1,
  pageSize: number = 50
): Promise<EventRecord[]> => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      return await fetchRecordsByEventId(eventId, page, pageSize)
    } catch (error) {
      console.error('云端加载事件记录失败:', error)
      // 降级到本地存储
      const events = loadFromLocal()
      const event = events.find(e => e.id === eventId)
      return event ? event.records : []
    }
  }

  // 本地存储的替代方案
  const events = loadFromLocal()
  const event = events.find(e => e.id === eventId)
  return event ? event.records : []
}

// 创建记录（辅助函数，返回记录对象但不保存）
export const createRecordObject = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  note: string
): Omit<EventRecord, 'id' | 'createdAt'> => ({
  startDate,
  startTime,
  endDate,
  endTime,
  durationMinutes: calculateDurationMinutes(startTime, endTime),
  note
})

// 获取所有事件及其记录（用于AI分析等功能）
export const loadAllEventsWithRecords = async (): Promise<EventItem[]> => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (USE_CLOUD && typeof Taro.cloud !== 'undefined') {
    try {
      // 首先获取所有事件
      const events = await fetchEventsFromCloudNew()

      // 为每个事件获取其记录
      const eventsWithRecords = await Promise.all(
        events.map(async (event) => {
          let records: EventRecord[] = []
          try {
            records = await fetchRecordsByEventId(event.id, 1, 100) // 获取前100条记录
          } catch (recordsError: any) {
            // 如果是集合不存在的错误，继续但没有记录
            if (recordsError.errMsg && recordsError.errMsg.includes('collection not exists')) {
              console.warn(`记录集合不存在，返回事件但没有记录`)
            } else {
              console.error('获取事件记录失败:', recordsError)
              throw recordsError
            }
          }

          return {
            ...event,
            records
          }
        })
      )

      return eventsWithRecords
    } catch (error) {
      console.error('云端加载所有事件及其记录失败:', error)
      return []
    }
  }

  // 本地存储的替代方案
  return loadFromLocal()
}
