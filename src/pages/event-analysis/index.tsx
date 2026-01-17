import { useMemo } from 'react'
import { Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'

import { useEventData } from '../../hooks/useEventData'
import { formatMinutes } from '../../utils/time'

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
      <View className='min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#f5f5f0] text-[#1a1a1a] font-sans relative box-border flex flex-col gap-[24rpx]'>
        <View className='absolute inset-0 bg-[#f5f5f0] opacity-70 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]' />
        <View className='border-[2rpx] dashed border-[#888888] rounded-[16rpx] p-[28rpx] text-[#4a4a4a] text-center bg-[#ffffff] text-[26rpx] leading-[1.5] relative z-[1]'>
          <Text>缺少事件 ID，请返回上一页。</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#f5f5f0] text-[#1a1a1a] font-sans relative box-border flex flex-col gap-[24rpx]'>
      <View className='absolute inset-0 bg-[#f5f5f0] opacity-70 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]' />

      {eventData ? (
        <>
          <View className='relative z-[1] border-[2rpx] border-[#1a1a1a] rounded-[20rpx] p-[28rpx] bg-[#ffffff] shadow-[0_16rpx_32rpx_#00000014] flex flex-col gap-[16rpx]'>
            <Text className='text-[24rpx] uppercase tracking-[0.12em] text-[#4a4a4a] leading-[1.4]'>事件分析</Text>
            <Text className='text-[64rpx] leading-[1.25] font-bold'>{eventData.title}</Text>
            <Text className='text-[24rpx] uppercase tracking-[0.12em] text-[#888888] leading-[1.4]'>
              创建时间 {new Date(eventData.createdAt).toLocaleString()}
            </Text>

            <View className='grid grid-cols-2 gap-[16rpx]'>
              <View className='border-[2rpx] border-[#1a1a1a] rounded-[16rpx] p-[20rpx] flex flex-col gap-[8rpx] bg-[#fafafa]'>
                <Text className='text-[24rpx] uppercase tracking-[0.1em] text-[#888888] leading-[1.35]'>记录数</Text>
                <Text className='text-[36rpx] font-bold leading-[1.2]'>{eventData.records.length}</Text>
              </View>
              <View className='border-[2rpx] border-[#1a1a1a] rounded-[16rpx] p-[20rpx] flex flex-col gap-[8rpx] bg-[#fafafa]'>
                <Text className='text-[24rpx] uppercase tracking-[0.1em] text-[#888888] leading-[1.35]'>总时长</Text>
                <Text className='text-[36rpx] font-bold leading-[1.2]'>
                  {formatMinutes(totalMinutes)}
                </Text>
              </View>
              <View className='border-[2rpx] border-[#1a1a1a] rounded-[16rpx] p-[20rpx] flex flex-col gap-[8rpx] bg-[#fafafa]'>
                <Text className='text-[24rpx] uppercase tracking-[0.1em] text-[#888888] leading-[1.35]'>最长</Text>
                <Text className='text-[36rpx] font-bold leading-[1.2]'>
                  {longestRecord ? formatMinutes(longestRecord) : '—'}
                </Text>
              </View>
              <View className='border-[2rpx] border-[#1a1a1a] rounded-[16rpx] p-[20rpx] flex flex-col gap-[8rpx] bg-[#fafafa]'>
                <Text className='text-[24rpx] uppercase tracking-[0.1em] text-[#888888] leading-[1.35]'>平均</Text>
                <Text className='text-[36rpx] font-bold leading-[1.2]'>
                  {averageDuration ? formatMinutes(averageDuration) : '—'}
                </Text>
              </View>
            </View>
          </View>

          <View className='mt-[24rpx] border-[2rpx] border-[#1a1a1a] rounded-[18rpx] p-[24rpx] bg-[#fdfdf7] flex flex-col gap-[16rpx] relative z-[1]'>
            {eventData.records.length ? (
              eventData.records.map(record => {
                const width = longestRecord
                  ? Math.round((record.durationMinutes / longestRecord) * 100)
                  : 0
                return (
                  <View key={record.id} className='grid grid-cols-1 gap-[12rpx] items-start'>
                    <View className='flex flex-col gap-[6rpx]'>
                      <Text className='text-[28rpx] font-semibold'>
                        {record.startTime} - {record.endTime}
                      </Text>
                      <Text className='text-[24rpx] text-[#888888]'>
                        {record.note || '无备注'}
                      </Text>
                    </View>
                    <View className='w-full h-[12rpx] border-[2rpx] border-[#1a1a1a] rounded-[999px] bg-[#e5e5e5] overflow-hidden'>
                      <View
                        className='h-full bg-[linear-gradient(90deg,#f6821f,#ffaa5b)]'
                        style={{ width: `${width}%` }}
                      />
                    </View>
                    <Text className='text-[26rpx] font-semibold text-left'>
                      {formatMinutes(record.durationMinutes)}
                    </Text>
                  </View>
                )
              })
            ) : (
              <Text className='text-[26rpx] text-[#4a4a4a]'>暂无记录可分析。</Text>
            )}
          </View>
        </>
      ) : (
        <View className='border-[2rpx] dashed border-[#888888] rounded-[16rpx] p-[28rpx] text-[#4a4a4a] text-center bg-[#ffffff] text-[26rpx] leading-[1.5] relative z-[1]'>
          <Text>未找到事件或已被删除。</Text>
        </View>
      )}
    </View>
  )
}
