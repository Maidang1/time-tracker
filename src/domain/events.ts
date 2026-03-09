export type EventType = 'time' | 'checkin' | 'todo'

type BaseRecord = {
  id: number
  note: string
  createdAt: string
}

export type TimeRecord = BaseRecord & {
  kind: 'time'
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  durationMinutes: number
  date?: string
}

export type CheckinRecord = BaseRecord & {
  kind: 'checkin'
  startDate: string
  endDate: string
  startTime: ''
  endTime: ''
  durationMinutes: 0
  date?: string
}

export type TodoRecord = BaseRecord & {
  kind: 'todo'
  startDate: ''
  endDate: ''
  startTime: ''
  endTime: ''
  durationMinutes: 0
  completed: boolean
  completedAt?: string
  date?: string
}

export type EventRecord = TimeRecord | CheckinRecord | TodoRecord

type BaseEvent<TType extends EventType, TRecord extends EventRecord> = {
  _id?: string
  _openid?: string
  id: number
  title: string
  description: string
  type: TType
  createdAt: string
  updatedAt: string
  records: TRecord[]
}

export type TimeEvent = BaseEvent<'time', TimeRecord>
export type CheckinEvent = BaseEvent<'checkin', CheckinRecord>
export type TodoEvent = BaseEvent<'todo', TodoRecord>
export type EventItem = TimeEvent | CheckinEvent | TodoEvent

export type CreateEventInput = {
  title: string
  description?: string
  type: EventType
}

export type UpdateEventInput = {
  title: string
  description?: string
}

export type CreateTimeRecordInput = {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  note?: string
}

export type CreateCheckinRecordInput = {
  startDate: string
  note?: string
}

export type CreateTodoRecordInput = {
  note: string
}

export type RecordInput =
  | CreateTimeRecordInput
  | CreateCheckinRecordInput
  | CreateTodoRecordInput

export type EventSummary = {
  countLabel: string
  actionLabel: string
}

export type TimeAnalytics = {
  type: 'time'
  totalMinutes: number
  longestRecord: number
  shortestRecord: number
  medianDuration: number
  averageDuration: number
  recordCount: number
  thisWeekMinutes: number
  thisMonthMinutes: number
  durationBuckets: {
    short: number
    medium: number
    long: number
  }
}

export type CheckinAnalytics = {
  type: 'checkin'
  totalDays: number
  consecutiveDays: number
  currentMonth: string
}

export type TodoAnalytics = {
  type: 'todo'
  total: number
  completed: number
  pending: number
  completionRate: string
}

export type EventAnalytics = TimeAnalytics | CheckinAnalytics | TodoAnalytics

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

const MINUTES_PER_DAY = 24 * 60

export const normalizeEventType = (value: unknown): EventType => {
  if (value === 'checkin' || value === 'todo') {
    return value
  }
  return 'time'
}

export const formatLocalDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export const calculateDurationMinutes = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
) => {
  const start = new Date(`${startDate} ${startTime}`).getTime()
  const end = new Date(`${endDate} ${endTime}`).getTime()

  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new DomainError('时间格式不合法')
  }

  const diff = end - start
  if (diff < 0) {
    throw new DomainError('结束时间不能早于开始时间')
  }

  return Math.floor(diff / 1000 / 60)
}

const compareRecordTimeDesc = (left: EventRecord, right: EventRecord) => {
  const leftDate = `${left.startDate || left.date || ''} ${left.startTime || '00:00'}`
  const rightDate = `${right.startDate || right.date || ''} ${right.startTime || '00:00'}`
  return new Date(rightDate).getTime() - new Date(leftDate).getTime()
}

const assertEventTitle = (title: string) => {
  if (!title.trim()) {
    throw new DomainError('事件标题不能为空')
  }
}

const createBaseEvent = (input: CreateEventInput) => {
  assertEventTitle(input.title)
  const now = new Date().toISOString()
  return {
    id: Date.now(),
    title: input.title.trim(),
    description: input.description?.trim() || '',
    type: input.type,
    createdAt: now,
    updatedAt: now,
  }
}

export const createEvent = (input: CreateEventInput): EventItem => {
  const base = createBaseEvent(input)
  if (input.type === 'checkin') {
    return { ...base, type: 'checkin', records: [] }
  }
  if (input.type === 'todo') {
    return { ...base, type: 'todo', records: [] }
  }
  return { ...base, type: 'time', records: [] }
}

export const updateEventMetadata = (
  event: EventItem,
  input: UpdateEventInput,
): EventItem => {
  assertEventTitle(input.title)
  return {
    ...event,
    title: input.title.trim(),
    description: input.description?.trim() || '',
    updatedAt: new Date().toISOString(),
  } as EventItem
}

export const createRecordForEvent = (
  event: EventItem,
  input: RecordInput,
): EventRecord => {
  const now = new Date().toISOString()
  const id = Date.now()

  if (event.type === 'time') {
    const payload = input as CreateTimeRecordInput
    const durationMinutes = calculateDurationMinutes(
      payload.startDate,
      payload.startTime,
      payload.endDate,
      payload.endTime,
    )
    return {
      kind: 'time',
      id,
      createdAt: now,
      note: payload.note?.trim() || '',
      startDate: payload.startDate,
      startTime: payload.startTime,
      endDate: payload.endDate,
      endTime: payload.endTime,
      durationMinutes,
      date: payload.startDate,
    }
  }

  if (event.type === 'checkin') {
    const payload = input as CreateCheckinRecordInput
    const startDate = payload.startDate
    const duplicated = event.records.some(record => record.startDate === startDate)
    if (duplicated) {
      throw new DomainError('同一天只能打卡一次')
    }
    return {
      kind: 'checkin',
      id,
      createdAt: now,
      note: payload.note?.trim() || '',
      startDate,
      endDate: startDate,
      startTime: '',
      endTime: '',
      durationMinutes: 0,
      date: startDate,
    }
  }

  const payload = input as CreateTodoRecordInput
  if (!payload.note.trim()) {
    throw new DomainError('待办内容不能为空')
  }

  return {
    kind: 'todo',
    id,
    createdAt: now,
    note: payload.note.trim(),
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    durationMinutes: 0,
    completed: false,
  }
}

export const updateRecordForEvent = (
  event: EventItem,
  recordId: number,
  input: RecordInput,
): EventRecord[] => {
  const original = event.records.find(record => record.id === recordId)
  if (!original) {
    throw new DomainError('记录不存在')
  }

  const updated = createRecordForEvent(event, input)
  const record = {
    ...updated,
    id: original.id,
    createdAt: original.createdAt,
  } as EventRecord

  return sortRecordsDesc(
    event.records.map(item => (item.id === recordId ? record : item)),
  )
}

export const deleteRecordForEvent = (event: EventItem, recordId: number) =>
  event.records.filter(record => record.id !== recordId)

export const toggleTodoRecord = (event: TodoEvent, recordId: number): TodoRecord[] => {
  return event.records.map(record => {
    if (record.id !== recordId) {
      return record
    }

    const nextCompleted = !record.completed
    return {
      ...record,
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
    }
  })
}

export const withUpdatedRecords = (
  event: EventItem,
  records: EventRecord[],
): EventItem => ({
  ...event,
  records: sortRecordsDesc(records) as typeof event.records,
  updatedAt: new Date().toISOString(),
}) as EventItem

export const sortEventsDesc = (events: EventItem[]) =>
  [...events].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )

export const sortRecordsDesc = <T extends EventRecord>(records: T[]) =>
  [...records].sort(compareRecordTimeDesc)

const normalizeBaseRecord = (record: any) => ({
  id: Number(record?.id) || Date.now(),
  note: typeof record?.note === 'string' ? record.note : '',
  createdAt:
    typeof record?.createdAt === 'string' && record.createdAt
      ? record.createdAt
      : new Date().toISOString(),
})

const normalizeRecord = (eventType: EventType, rawRecord: any): EventRecord => {
  const base = normalizeBaseRecord(rawRecord)

  if (eventType === 'time') {
    const startDate = rawRecord?.startDate || rawRecord?.date || formatLocalDate(new Date())
    const endDate = rawRecord?.endDate || startDate
    const startTime = rawRecord?.startTime || '00:00'
    const endTime = rawRecord?.endTime || startTime
    let durationMinutes = Number(rawRecord?.durationMinutes) || 0
    if (!durationMinutes) {
      try {
        durationMinutes = calculateDurationMinutes(startDate, startTime, endDate, endTime)
      } catch {
        durationMinutes = 0
      }
    }
    return {
      ...base,
      kind: 'time',
      startDate,
      endDate,
      startTime,
      endTime,
      durationMinutes,
      date: startDate,
    }
  }

  if (eventType === 'checkin') {
    const startDate = rawRecord?.startDate || rawRecord?.date || formatLocalDate(new Date())
    return {
      ...base,
      kind: 'checkin',
      startDate,
      endDate: rawRecord?.endDate || startDate,
      startTime: '',
      endTime: '',
      durationMinutes: 0,
      date: startDate,
    }
  }

  return {
    ...base,
    kind: 'todo',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    durationMinutes: 0,
    completed: Boolean(rawRecord?.completed),
    completedAt: rawRecord?.completedAt,
  }
}

export const normalizeEvent = (rawEvent: any): EventItem => {
  const type = normalizeEventType(rawEvent?.type)
  const createdAt =
    typeof rawEvent?.createdAt === 'string' && rawEvent.createdAt
      ? rawEvent.createdAt
      : new Date().toISOString()
  const updatedAt =
    typeof rawEvent?.updatedAt === 'string' && rawEvent.updatedAt
      ? rawEvent.updatedAt
      : createdAt

  const base = {
    _id: rawEvent?._id,
    _openid: rawEvent?._openid,
    id: Number(rawEvent?.id) || Date.now(),
    title: typeof rawEvent?.title === 'string' ? rawEvent.title : '未命名事件',
    description: typeof rawEvent?.description === 'string' ? rawEvent.description : '',
    type,
    createdAt,
    updatedAt,
  }

  const records = Array.isArray(rawEvent?.records)
    ? sortRecordsDesc(rawEvent.records.map((record: any) => normalizeRecord(type, record)))
    : []

  if (type === 'checkin') {
    return { ...base, type, records: records as CheckinRecord[] }
  }
  if (type === 'todo') {
    return { ...base, type, records: records as TodoRecord[] }
  }
  return { ...base, type, records: records as TimeRecord[] }
}

export const normalizeEvents = (rawEvents: any[]): EventItem[] =>
  sortEventsDesc(rawEvents.map(normalizeEvent))

export const eventHasPendingTask = (
  eventId: number,
  tasks: Array<{ type: 'upsert' | 'delete'; eventId: number }>,
) => tasks.some(task => task.eventId === eventId)

export const mergeRemoteEvents = (
  localEvents: EventItem[],
  remoteEvents: EventItem[],
  pendingTasks: Array<{ type: 'upsert' | 'delete'; eventId: number }>,
) => {
  const localMap = new Map(localEvents.map(event => [event.id, event]))
  const merged = [...localEvents]

  remoteEvents.forEach(remoteEvent => {
    const localEvent = localMap.get(remoteEvent.id)
    if (!localEvent) {
      merged.push(remoteEvent)
      return
    }

    if (eventHasPendingTask(remoteEvent.id, pendingTasks)) {
      return
    }

    const remoteUpdatedAt = new Date(remoteEvent.updatedAt).getTime()
    const localUpdatedAt = new Date(localEvent.updatedAt).getTime()
    if (remoteUpdatedAt > localUpdatedAt) {
      const index = merged.findIndex(item => item.id === remoteEvent.id)
      if (index >= 0) {
        merged[index] = remoteEvent
      }
    }
  })

  return sortEventsDesc(merged)
}

export const getEventSummary = (event: EventItem): EventSummary => {
  if (event.type === 'checkin') {
    const totalDays = new Set(event.records.map(record => record.startDate)).size
    return {
      countLabel: `${totalDays} 天打卡`,
      actionLabel: '打卡',
    }
  }

  return {
    countLabel: `${event.records.length} 条记录`,
    actionLabel: event.type === 'todo' ? '新增待办' : '新增记录',
  }
}

export const countCheckinConsecutiveDays = (event: CheckinEvent) => {
  const dates = Array.from(new Set(event.records.map(record => record.startDate))).sort().reverse()
  if (!dates.length) {
    return 0
  }

  const today = formatLocalDate(new Date())
  const yesterday = formatLocalDate(new Date(Date.now() - MINUTES_PER_DAY * 60 * 1000))
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0
  }

  let count = 1
  for (let index = 1; index < dates.length; index += 1) {
    const prev = new Date(dates[index - 1])
    const curr = new Date(dates[index])
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000
    if (diffDays !== 1) {
      break
    }
    count += 1
  }

  return count
}

export const buildEventAnalytics = (event: EventItem): EventAnalytics => {
  if (event.type === 'time') {
    const durations = event.records
      .map(record => record.durationMinutes)
      .filter(duration => duration > 0)
      .sort((left, right) => left - right)
    const totalMinutes = event.records.reduce(
      (sum, record) => sum + record.durationMinutes,
      0,
    )
    const longestRecord = event.records.reduce(
      (max, record) => Math.max(max, record.durationMinutes),
      0,
    )
    const shortestRecord = durations.length ? durations[0] : 0
    const middleIndex = Math.floor(durations.length / 2)
    const medianDuration = !durations.length
      ? 0
      : durations.length % 2 === 0
        ? Math.round((durations[middleIndex - 1] + durations[middleIndex]) / 2)
        : durations[middleIndex]

    const now = new Date()
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getDay() || 7
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - dayOfWeek + 1)

    const monthKey = formatMonthKey(now)
    const thisWeekMinutes = event.records.reduce((sum, record) => {
      const startedAt = new Date(`${record.startDate} ${record.startTime || '00:00'}`)
      if (startedAt.getTime() >= weekStart.getTime()) {
        return sum + record.durationMinutes
      }
      return sum
    }, 0)
    const thisMonthMinutes = event.records.reduce((sum, record) => {
      if (record.startDate.startsWith(monthKey)) {
        return sum + record.durationMinutes
      }
      return sum
    }, 0)

    const durationBuckets = event.records.reduce(
      (buckets, record) => {
        if (record.durationMinutes < 30) {
          buckets.short += 1
        } else if (record.durationMinutes <= 90) {
          buckets.medium += 1
        } else {
          buckets.long += 1
        }
        return buckets
      },
      {
        short: 0,
        medium: 0,
        long: 0,
      },
    )

    return {
      type: 'time',
      totalMinutes,
      longestRecord,
      shortestRecord,
      medianDuration,
      averageDuration: event.records.length
        ? Math.round(totalMinutes / event.records.length)
        : 0,
      recordCount: event.records.length,
      thisWeekMinutes,
      thisMonthMinutes,
      durationBuckets,
    }
  }

  if (event.type === 'checkin') {
    const totalDays = new Set(event.records.map(record => record.startDate)).size
    return {
      type: 'checkin',
      totalDays,
      consecutiveDays: countCheckinConsecutiveDays(event),
      currentMonth: formatMonthKey(new Date()),
    }
  }

  const total = event.records.length
  const completed = event.records.filter(record => record.completed).length
  return {
    type: 'todo',
    total,
    completed,
    pending: total - completed,
    completionRate: total ? ((completed / total) * 100).toFixed(1) : '0',
  }
}
