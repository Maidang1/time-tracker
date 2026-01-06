import { useMemo, useState } from 'react'
import { Button, Input, Picker, Text, View } from '@tarojs/components'
import { navigateTo, useDidShow, useRouter } from '@tarojs/taro'

import {
  calculateDurationMinutes,
  createRecord,
  loadEvents,
  persistEvents
} from '../../utils/eventStore'
import type { EventItem } from '../../types/events'
import { useEventData } from '../../hooks/useEventData'
import { formatMinutes } from '../../utils/time'
import PageHeader from '../../components/PageHeader'
import HeaderMeta from '../../components/HeaderMeta'

import './index.scss'

const replaceEvent = (event: EventItem) => {
  const events = loadEvents()
  const next = events.map(item => (item.id === event.id ? event : item))
  persistEvents(next)
}

export default function EventDetail () {
  const router = useRouter()
  const eventId = Number(router.params?.id || 0)

  const { eventData, setEventData } = useEventData(eventId)
  const [recordDate, setRecordDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [showRecordDialog, setShowRecordDialog] = useState(false)

  const refreshEvent = () => {
    const events = loadEvents()
    const found = events.find(item => item.id === eventId) || null
    setEventData(found)
  }

  useDidShow(() => {
    refreshEvent()
  })

  const pendingDuration = useMemo(() => {
    if (!startTime || !endTime) return 0
    return calculateDurationMinutes(startTime, endTime)
  }, [startTime, endTime])

  const openRecordDialog = () => {
    const today = new Date().toISOString().slice(0, 10)
    setRecordDate(today)
    setShowRecordDialog(true)
  }

  const handleAddRecord = () => {
    if (!eventData || !recordDate || !startTime || !endTime) return
    const record = createRecord(recordDate, startTime, endTime, note.trim())
    const updated: EventItem = {
      ...eventData,
      records: [record, ...eventData.records]
    }
    replaceEvent(updated)
    setEventData(updated)
    setStartTime('')
    setEndTime('')
    setNote('')
    setShowRecordDialog(false)
  }

  const handleOpenAnalysis = () => {
    navigateTo({
      url: `/pages/event-analysis/index?id=${eventId}`
    })
  }

  if (!eventId) {
    return (
      <View className='event-detail'>
        <View className='blueprint-surface' />
        <View className='empty-state'>
          <Text>缺少事件 ID，请返回上一页。</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='event-detail'>
      <View className='blueprint-surface' />

      {eventData ? (
        <>
          <PageHeader
            left={(
              <View className='brand'>
                <View className='brand-mark'>TT</View>
                <Text className='brand-name'>{eventData.title}</Text>
              </View>
            )}
            right={(
              <View className='header-actions'>
                <Button
                  className='primary-outline'
                  onClick={handleOpenAnalysis}
                  disabled={!eventData.records.length}
                >
                  查看分析
                </Button>
                <Button
                  className='primary-solid'
                  onClick={openRecordDialog}
                >
                  保存记录
                </Button>
              </View>
            )}
          />

          <HeaderMeta
            items={[
              {
                key: 'records',
                text: `共 ${eventData.records.length} 条记录`,
                tone: 'pending'
              }
            ]}
          />

          <View className='panel record-log-panel'>
            <View className='panel-header'>
              <Text className='panel-title'>记录日志</Text>
              <Text className='panel-hint'>
                记录按倒序展示
              </Text>
            </View>

            <View className='record-list timeline'>
              {eventData.records.map(record => (
                <View key={record.id} className='record-card timeline-item'>
                  <View className='record-dot' />
                  <View className='record-row'>
                    <Text className='record-time'>
                      {record.date ? `${record.date} ` : ''}
                      {record.startTime} — {record.endTime}
                    </Text>
                    <Text className='record-duration'>
                      {formatMinutes(record.durationMinutes)}
                    </Text>
                  </View>
                  <Text className='record-note'>
                    {record.note || '暂无备注'}
                  </Text>
                </View>
              ))}

              {!eventData.records.length && (
                <View className='empty-state diagonal'>
                  <Text>暂无记录，请先在上方添加。</Text>
                </View>
              )}
            </View>
          </View>
        </>
      ) : (
        <View className='empty-state'>
          <Text>未找到事件或已被删除。</Text>
        </View>
      )}

      {showRecordDialog && (
        <View className='record-dialog'>
          <View
            className='dialog-mask'
            onClick={() => setShowRecordDialog(false)}
          />
          <View className='dialog-card'>
            <View className='dialog-header'>
              <Text className='dialog-title'>新增记录</Text>
              <Button
                className='dialog-close'
                onClick={() => setShowRecordDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className='record-form'>
              <Picker
                mode='date'
                value={recordDate}
                onChange={event => setRecordDate(event.detail.value)}
              >
                <View className='picker-field'>
                  <Text>{recordDate || '选择日期'}</Text>
                </View>
              </Picker>
              <Picker
                mode='time'
                value={startTime}
                onChange={event => setStartTime(event.detail.value)}
              >
                <View className='picker-field'>
                  <Text>{startTime || '开始时间 08:30'}</Text>
                </View>
              </Picker>
              <Picker
                mode='time'
                value={endTime}
                onChange={event => setEndTime(event.detail.value)}
              >
                <View className='picker-field'>
                  <Text>{endTime || '结束时间 10:00'}</Text>
                </View>
              </Picker>
              <Input
                value={note}
                placeholder='备注或观察'
                className='text-field'
                onInput={event => setNote(event.detail.value)}
              />
              <View className='duration-preview'>
                时长：
                <Text className='duration-strong'>
                  {pendingDuration ? formatMinutes(pendingDuration) : '—'}
                </Text>
              </View>
              <Button className='add-button' onClick={handleAddRecord}>
                保存记录
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
