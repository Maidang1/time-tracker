import { Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'

import { useTheme } from '../../hooks/useTheme'
import { useEventDetailViewModel } from '../../presentation/hooks/useEventDetailViewModel'
import { formatMinutes } from '../../utils/time'

export default function EventAnalysisPage() {
  const router = useRouter()
  const eventId = Number(router.params?.id || 0)
  const { actualTheme } = useTheme()
  const { analytics, event } = useEventDetailViewModel(eventId)

  const isDark = actualTheme === 'dark'
  const shellClass = isDark
    ? 'min-h-screen bg-[#0d1015] text-[#f6efe4] px-[24rpx] py-[32rpx] flex flex-col gap-[24rpx]'
    : 'min-h-screen bg-[#f4ecdf] text-[#18120d] px-[24rpx] py-[32rpx] flex flex-col gap-[24rpx]'
  const cardClass = isDark
    ? 'rounded-[24rpx] border-[2rpx] border-[#303847] bg-[#151a22] p-[24rpx] shadow-[0_16rpx_36rpx_#00000030]'
    : 'rounded-[24rpx] border-[2rpx] border-[#2e2218] bg-[#fffdf8] p-[24rpx] shadow-[0_16rpx_36rpx_#7a4d2414]'

  if (!event || !analytics) {
    return (
      <View className={shellClass}>
        <View className={cardClass}>
          <Text className="text-[30rpx]">无法分析这个事件，先返回详情页确认数据是否存在。</Text>
        </View>
      </View>
    )
  }

  return (
    <View className={shellClass}>
      <View className={`${cardClass} flex flex-col gap-[14rpx]`}>
        <View>
          <Text className="text-[24rpx] leading-[1.3] opacity-80">事件分析</Text>
        </View>
        <View className="w-full min-w-0">
          <Text className="text-[44rpx] font-semibold leading-[1.2] break-words">
            {event.title}
          </Text>
        </View>
        <View>
          <Text className="text-[24rpx] leading-[1.35] opacity-80">
            创建于 {new Date(event.createdAt).toLocaleString('zh-CN')}
          </Text>
        </View>
      </View>

      {analytics.type === 'time' ? (
        <>
          <View className={cardClass}>
            <StatsGrid
              items={[
                ['记录数', String(analytics.recordCount)],
                ['总时长', formatMinutes(analytics.totalMinutes)],
                ['最长单次', analytics.longestRecord ? formatMinutes(analytics.longestRecord) : '—'],
                ['平均时长', analytics.averageDuration ? formatMinutes(analytics.averageDuration) : '—'],
              ]}
            />
          </View>

          <View className={`${cardClass} flex flex-col gap-[18rpx]`}>
            <View className="flex flex-col gap-[8rpx]">
              <Text className="text-[30rpx] font-semibold">时长分析</Text>
              <Text className="text-[24rpx] opacity-80">
                从单次时长、近期投入和记录分布看这类时间记录的节奏。
              </Text>
            </View>

            <StatsGrid
              items={[
                ['最短单次', analytics.shortestRecord ? formatMinutes(analytics.shortestRecord) : '—'],
                ['中位时长', analytics.medianDuration ? formatMinutes(analytics.medianDuration) : '—'],
                ['本周累计', analytics.thisWeekMinutes ? formatMinutes(analytics.thisWeekMinutes) : '0m'],
                ['本月累计', analytics.thisMonthMinutes ? formatMinutes(analytics.thisMonthMinutes) : '0m'],
              ]}
            />

            <View className="grid grid-cols-3 gap-[16rpx]">
              <DurationBucketCard label="短时" hint="< 30m" value={analytics.durationBuckets.short} />
              <DurationBucketCard label="中段" hint="30-90m" value={analytics.durationBuckets.medium} />
              <DurationBucketCard label="长时" hint="> 90m" value={analytics.durationBuckets.long} />
            </View>
          </View>
        </>
      ) : null}

      {analytics.type === 'checkin' ? (
        <View className={cardClass}>
          <StatsGrid
            items={[
              ['累计打卡天数', String(analytics.totalDays)],
              ['连续打卡天数', String(analytics.consecutiveDays)],
              ['当前月份', analytics.currentMonth],
            ]}
          />
        </View>
      ) : null}

      {analytics.type === 'todo' ? (
        <View className={cardClass}>
          <StatsGrid
            items={[
              ['总待办', String(analytics.total)],
              ['已完成', String(analytics.completed)],
              ['未完成', String(analytics.pending)],
              ['完成率', `${analytics.completionRate}%`],
            ]}
          />
        </View>
      ) : null}

      <View className={cardClass}>
        <Text className="text-[30rpx] font-semibold mb-[12rpx]">最近记录</Text>
        <View className="flex flex-col gap-[12rpx]">
          {event.records.slice(0, 5).map(record => (
            <View
              key={record.id}
              className={isDark
                ? 'rounded-[18rpx] border-[2rpx] border-[#303847] bg-[#10151d] p-[18rpx]'
                : 'rounded-[18rpx] border-[2rpx] border-[#2e2218] bg-[#fffaf1] p-[18rpx]'}
            >
              <Text className="text-[28rpx] font-semibold">
                {record.kind === 'time' ? `${record.startDate} ${record.startTime}` : record.kind === 'checkin' ? record.startDate : record.note}
              </Text>
              <Text className="text-[24rpx] opacity-80">
                {record.kind === 'time'
                  ? `${formatMinutes(record.durationMinutes)} · ${record.note || '无备注'}`
                  : record.kind === 'checkin'
                    ? record.note || '已完成打卡'
                    : `${record.completed ? '已完成' : '待处理'} · 创建于 ${new Date(record.createdAt).toLocaleString('zh-CN')}`}
              </Text>
            </View>
          ))}

          {!event.records.length ? <Text className="text-[26rpx]">暂无记录。</Text> : null}
        </View>
      </View>
    </View>
  )
}

function StatsGrid({ items }: { items: string[][] }) {
  return (
    <View className="grid grid-cols-2 gap-[16rpx]">
      {items.map(([label, value]) => (
        <View key={label} className="rounded-[18rpx] bg-[#0000000d] p-[18rpx] flex flex-col gap-[10rpx]">
          <View>
            <Text className="text-[24rpx] leading-[1.3] opacity-80">{label}</Text>
          </View>
          <View className="min-w-0">
            <Text className="text-[34rpx] font-semibold leading-[1.2] break-words">{value}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function DurationBucketCard({
  hint,
  label,
  value,
}: {
  hint: string
  label: string
  value: number
}) {
  return (
    <View className="rounded-[18rpx] bg-[#0000000d] p-[18rpx] flex flex-col gap-[10rpx]">
      <View className="flex flex-col gap-[4rpx]">
        <Text className="text-[24rpx] leading-[1.3] opacity-80">{label}</Text>
        <Text className="text-[20rpx] leading-[1.3] opacity-60">{hint}</Text>
      </View>
      <View>
        <Text className="text-[34rpx] font-semibold leading-[1.2]">{value}</Text>
      </View>
    </View>
  )
}
