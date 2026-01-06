import { useMemo } from 'react'
import { Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'

import { useEventData } from '../../hooks/useEventData'
import { formatMinutes } from '../../utils/time'

import './index.scss'

export default function EventAnalysis () {
  const router = useRouter()
  const eventId = Number(router.params?.id || 0)
  const { eventData } = useEventData(eventId)

  const totalMinutes = useMemo(() => {
    if (!eventData) return 0
    return eventData.records.reduce(
      (acc, record) => acc + record.durationMinutes,
      0
    )
  }, [eventData])

  const longestRecord = useMemo(() => {
    if (!eventData) return 0
    return eventData.records.reduce(
      (max, record) => Math.max(max, record.durationMinutes),
      0
    )
  }, [eventData])

  const averageDuration = useMemo(() => {
    if (!eventData || !eventData.records.length) return 0
    return Math.round(totalMinutes / eventData.records.length)
  }, [eventData, totalMinutes])

  if (!eventId) {
    return (
      <View className='event-analysis'>
        <View className='blueprint-surface' />
        <View className='empty-state'>
          <Text>缺少事件 ID，请返回上一页。</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='event-analysis'>
      <View className='blueprint-surface' />

      {eventData ? (
        <>
          <View className='analysis-card'>
            <Text className='eyebrow'>事件分析</Text>
            <Text className='hero-title'>{eventData.title}</Text>
            <Text className='detail-date'>
              创建时间 {new Date(eventData.createdAt).toLocaleString()}
            </Text>

            <View className='detail-stats'>
              <View className='stat-block'>
                <Text className='stat-label'>记录数</Text>
                <Text className='stat-value'>{eventData.records.length}</Text>
              </View>
              <View className='stat-block'>
                <Text className='stat-label'>总时长</Text>
                <Text className='stat-value'>
                  {formatMinutes(totalMinutes)}
                </Text>
              </View>
              <View className='stat-block'>
                <Text className='stat-label'>最长</Text>
                <Text className='stat-value'>
                  {longestRecord ? formatMinutes(longestRecord) : '—'}
                </Text>
              </View>
              <View className='stat-block'>
                <Text className='stat-label'>平均</Text>
                <Text className='stat-value'>
                  {averageDuration ? formatMinutes(averageDuration) : '—'}
                </Text>
              </View>
            </View>
          </View>

          <View className='analysis-panel'>
            {eventData.records.length ? (
              eventData.records.map(record => {
                const width = longestRecord
                  ? Math.round((record.durationMinutes / longestRecord) * 100)
                  : 0
                return (
                  <View key={record.id} className='analysis-row'>
                    <View className='analysis-info'>
                      <Text className='analysis-time'>
                        {record.startTime} - {record.endTime}
                      </Text>
                      <Text className='analysis-label'>
                        {record.note || '无备注'}
                      </Text>
                    </View>
                    <View className='analysis-bar'>
                      <View
                        className='analysis-bar_fill'
                        style={{ width: `${width}%` }}
                      />
                    </View>
                    <Text className='analysis-duration'>
                      {formatMinutes(record.durationMinutes)}
                    </Text>
                  </View>
                )
              })
            ) : (
              <Text className='analysis-empty'>暂无记录可分析。</Text>
            )}
          </View>
        </>
      ) : (
        <View className='empty-state'>
          <Text>未找到事件或已被删除。</Text>
        </View>
      )}
    </View>
  )
}
