import { buildEventDetailContext, buildGlobalEventContext, composeInsightPrompt, EVENT_INSIGHT_INSTRUCTION, GLOBAL_INSIGHT_INSTRUCTION, normalizeAiErrorMessage } from '../src/utils/aiPrompt'
import type { EventItem } from '../src/types/events'

const sampleEvents: EventItem[] = [
  {
    id: 1,
    title: 'Test Event',
    description: 'Outdoor research',
    createdAt: new Date().toISOString(),
    records: [
      { id: 11, date: '2024-05-01', startTime: '08:00', endTime: '09:00', durationMinutes: 60, note: 'Warmup' },
      { id: 12, date: '2024-05-01', startTime: '09:15', endTime: '10:30', durationMinutes: 75, note: 'Focus block' }
    ]
  }
]

const globalContext = buildGlobalEventContext(sampleEvents)
if (globalContext.totalEvents !== 1 || globalContext.totalRecords !== 2) {
  throw new Error('Global context aggregation failed')
}

const globalPrompt = composeInsightPrompt({
  baseInstruction: GLOBAL_INSIGHT_INSTRUCTION,
  context: globalContext,
  userPrompt: '强调户外活动'
})

if (!globalPrompt.includes('强调户外活动')) {
  throw new Error('User prompt not merged correctly')
}

const eventContext = buildEventDetailContext(sampleEvents[0])
if (eventContext.averageMinutes !== 68) {
  throw new Error('Event context average calculation incorrect')
}

const eventPrompt = composeInsightPrompt({
  baseInstruction: EVENT_INSIGHT_INSTRUCTION,
  context: eventContext
})

if (!eventPrompt.includes('--- 数据快照 ---')) {
  throw new Error('Prompt compose missing context divider')
}

const normalizedMessage = normalizeAiErrorMessage({ errMsg: 'request:fail invalid' })
if (!normalizedMessage.includes('request:fail')) {
  throw new Error('Error normalization missing errMsg')
}

console.log('AI prompt harness passed')
