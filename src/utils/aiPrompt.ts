import type { EventItem, EventRecord } from '../types/events'

export type AiScope = 'allEvents' | 'event'

const MAX_EVENTS = 10
const MAX_RECORDS_PER_EVENT = 5

export type AggregatedEventRecord = {
  date: string
  durationMinutes: number
  note: string
}

export type AggregatedEvent = {
  id: number
  title: string
  description: string
  recordCount: number
  totalMinutes: number
  recentRecords: AggregatedEventRecord[]
}

export type GlobalEventContext = {
  totalEvents: number
  totalRecords: number
  events: AggregatedEvent[]
}

export type EventDetailContext = {
  id: number
  title: string
  description: string
  totalMinutes: number
  averageMinutes: number
  longestMinutes: number
  records: AggregatedEventRecord[]
}

export const GLOBAL_INSIGHT_INSTRUCTION =
  '你是 DeepSeek AI 助手，请根据提供的事件列表判断事件类型/方向，推测可能的心情、偏好和爱好，最后给出建议。输出使用简洁的中文分段，包含“心情 & 兴趣”、“关键观察”、“建议”三个段落。'

export const EVENT_INSIGHT_INSTRUCTION =
  '你是 DeepSeek AI 助手，请分析单个事件的记录，重点观察时长变化、备注变化和投入程度。给出“投入程度”、“趋势解读”、“建议”三个段落，语言保持积极。'

export const DEFAULT_SYSTEM_PROMPT =
  'You are DeepSeek, a thoughtful activity analyst who always responds in Simplified Chinese. Keep answers empathetic and actionable.'

const truncateNote = (note: string) => {
  if (!note) return ''
  if (note.length <= 80) return note
  return `${note.slice(0, 77)}...`
}

const aggregateRecords = (records: EventRecord[], limit = MAX_RECORDS_PER_EVENT): AggregatedEventRecord[] => {
  return records.slice(0, limit).map(record => ({
    date: record.date ?? Date.now().toString(),
    durationMinutes: record.durationMinutes,
    note: truncateNote(record.note)
  }))
}

export const buildGlobalEventContext = (events: EventItem[]): GlobalEventContext => {
  const limited = events.slice(0, MAX_EVENTS)
  const aggregated = limited.map(event => {
    const totalMinutes = event.records.reduce((acc, record) => acc + record.durationMinutes, 0)
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      recordCount: event.records.length,
      totalMinutes,
      recentRecords: aggregateRecords(event.records)
    }
  })

  return {
    totalEvents: events.length,
    totalRecords: events.reduce((acc, event) => acc + event.records.length, 0),
    events: aggregated
  }
}

export const buildEventDetailContext = (event: EventItem): EventDetailContext => {
  const totalMinutes = event.records.reduce((acc, record) => acc + record.durationMinutes, 0)
  const averageMinutes = event.records.length ? Math.round(totalMinutes / event.records.length) : 0
  const longestMinutes = event.records.reduce((max, record) => Math.max(max, record.durationMinutes), 0)

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    totalMinutes,
    averageMinutes,
    longestMinutes,
    records: aggregateRecords(event.records, Math.max(MAX_RECORDS_PER_EVENT, event.records.length))
  }
}

type ComposePromptArgs = {
  baseInstruction: string
  context: Record<string, unknown>
  userPrompt?: string
}

export const composeInsightPrompt = ({ baseInstruction, context, userPrompt }: ComposePromptArgs) => {
  const contextBlock = JSON.stringify(context, null, 2)
  const segments = [baseInstruction, '--- 数据快照 ---', contextBlock]
  if (userPrompt && userPrompt.trim()) {
    segments.push('--- 用户补充 ---', userPrompt.trim())
  }
  return segments.join('\n\n')
}

export const normalizeAiErrorMessage = (error: unknown) => {
  if (!error) return '无法连接到 DeepSeek，请稍后重试。'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message || '请求 DeepSeek 失败。'
  if (typeof error === 'object') {
    const source = error as Record<string, unknown>
    if (typeof source.message === 'string') return source.message
    if (typeof source.errMsg === 'string') return source.errMsg
    if (typeof source.statusText === 'string') return source.statusText
  }
  return 'DeepSeek 服务暂时不可用，请稍后重试。'
}
