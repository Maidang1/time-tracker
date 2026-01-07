import Taro from '@tarojs/taro'

import type { AiInsightResult } from '../services/aiClient'

const EVENT_CACHE_KEY = 'ai_event_insights'

type EventInsightCache = Record<string, AiInsightResult>

const readCache = (): EventInsightCache => {
  try {
    const stored = Taro.getStorageSync<EventInsightCache>(EVENT_CACHE_KEY)
    if (stored && typeof stored === 'object') {
      return stored
    }
  } catch (error) {
    console.warn('Unable to read AI insight cache', error)
  }
  return {}
}

const writeCache = (next: EventInsightCache) => {
  try {
    Taro.setStorageSync(EVENT_CACHE_KEY, next)
  } catch (error) {
    console.warn('Unable to persist AI insight cache', error)
  }
}

export const getCachedEventInsight = (eventId: number) => {
  if (!eventId) return null
  const cache = readCache()
  return cache[String(eventId)] ?? null
}

export const setCachedEventInsight = (eventId: number, insight: AiInsightResult) => {
  if (!eventId) return
  const cache = readCache()
  cache[String(eventId)] = insight
  writeCache(cache)
}
