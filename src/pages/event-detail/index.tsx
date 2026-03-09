import { useMemo, useState } from 'react'
import { Button, Input, Picker, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import type { CheckinRecord, EventRecord, TimeRecord, TodoRecord } from '../../domain/events'
import { formatLocalDate } from '../../domain/events'
import CheckinHeatmap from '../../components/CheckinHeatmap'
import HeaderMeta from '../../components/HeaderMeta'
import PageHeader from '../../components/PageHeader'
import SwipeableItem from '../../components/SwipeableItem'
import { useTheme } from '../../hooks/useTheme'
import { useEventDetailViewModel } from '../../presentation/hooks/useEventDetailViewModel'
import { formatMinutes } from '../../utils/time'

type TimeDraft = {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  note: string
}

type CheckinDraft = {
  startDate: string
  note: string
}

type TodoDraft = {
  note: string
}

const createEmptyTimeDraft = (): TimeDraft => {
  const today = formatLocalDate(new Date())
  return {
    startDate: today,
    startTime: '',
    endDate: today,
    endTime: '',
    note: '',
  }
}

const emptyCheckinDraft = (): CheckinDraft => ({
  startDate: formatLocalDate(new Date()),
  note: '',
})

const emptyTodoDraft = (): TodoDraft => ({
  note: '',
})

export default function EventDetailPage() {
  const router = useRouter()
  const eventId = Number(router.params?.id || 0)
  const { actualTheme } = useTheme()
  const { actions, analytics, event, lastError, pendingTasks, summary, syncStatus, today } =
    useEventDetailViewModel(eventId)

  const [editingRecord, setEditingRecord] = useState<EventRecord | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [timeDraft, setTimeDraft] = useState<TimeDraft>(createEmptyTimeDraft)
  const [checkinDraft, setCheckinDraft] = useState<CheckinDraft>(emptyCheckinDraft)
  const [todoDraft, setTodoDraft] = useState<TodoDraft>(emptyTodoDraft)
  const [checkinMonth, setCheckinMonth] = useState(() => analytics?.type === 'checkin' ? analytics.currentMonth : today.slice(0, 7))
  const [submitting, setSubmitting] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  const isDark = actualTheme === 'dark'
  const shellClass = isDark
    ? 'min-h-screen bg-[#0d1015] text-[#f6efe4] px-[24rpx] py-[32rpx] flex flex-col gap-[24rpx]'
    : 'min-h-screen bg-[#f4ecdf] text-[#18120d] px-[24rpx] py-[32rpx] flex flex-col gap-[24rpx]'
  const cardClass = isDark
    ? 'rounded-[24rpx] border-[2rpx] border-[#303847] bg-[#151a22] p-[24rpx] shadow-[0_16rpx_36rpx_#00000030]'
    : 'rounded-[24rpx] border-[2rpx] border-[#2e2218] bg-[#fffdf8] p-[24rpx] shadow-[0_16rpx_36rpx_#7a4d2414]'
  const buttonClass = isDark
    ? 'mr-0 rounded-[999px] border-[2rpx] border-[#465063] bg-[#151a22] text-[#f6efe4] px-[26rpx] h-[72rpx] leading-[72rpx] text-[26rpx]'
    : 'mr-0 rounded-[999px] border-[2rpx] border-[#2e2218] bg-[#fffdf8] text-[#18120d] px-[26rpx] h-[72rpx] leading-[72rpx] text-[26rpx]'
  const primaryButtonClass = isDark
    ? 'mr-0 rounded-[999px] border-[2rpx] border-[#f6b74f] bg-[#f0a429] text-[#211607] px-[26rpx] h-[72rpx] leading-[72rpx] text-[26rpx] font-semibold'
    : 'mr-0 rounded-[999px] border-[2rpx] border-[#ad5a00] bg-[#f6821f] text-[#fffdf8] px-[26rpx] h-[72rpx] leading-[72rpx] text-[26rpx] font-semibold'
  const inputClass = isDark
    ? 'h-[88rpx] rounded-[18rpx] border-[2rpx] border-[#465063] bg-[#0d1015] px-[24rpx] text-[28rpx] text-[#f6efe4]'
    : 'h-[88rpx] rounded-[18rpx] border-[2rpx] border-[#2e2218] bg-[#fffaf1] px-[24rpx] text-[28rpx] text-[#18120d]'
  const dialogClass = `${cardClass} w-[84vw] max-w-[680rpx]`

  const pendingDuration = useMemo(() => {
    if (!timeDraft.startTime || !timeDraft.endTime) {
      return 0
    }
    const start = new Date(`${timeDraft.startDate} ${timeDraft.startTime}`).getTime()
    const end = new Date(`${timeDraft.endDate} ${timeDraft.endTime}`).getTime()
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return 0
    }
    return Math.floor((end - start) / 1000 / 60)
  }, [timeDraft])

  const resetEditor = () => {
    setEditingRecord(null)
    setTimeDraft(createEmptyTimeDraft())
    setCheckinDraft(emptyCheckinDraft())
    setTodoDraft(emptyTodoDraft())
    setShowEditor(false)
  }

  const openCreateEditor = () => {
    setEditingRecord(null)
    setTimeDraft(createEmptyTimeDraft())
    setCheckinDraft(emptyCheckinDraft())
    setTodoDraft(emptyTodoDraft())
    setShowEditor(true)
  }

  const openEditEditor = (record: EventRecord) => {
    setEditingRecord(record)
    if (record.kind === 'time') {
      setTimeDraft({
        startDate: record.startDate,
        startTime: record.startTime,
        endDate: record.endDate,
        endTime: record.endTime,
        note: record.note,
      })
    } else if (record.kind === 'checkin') {
      setCheckinDraft({
        startDate: record.startDate,
        note: record.note,
      })
    } else {
      setTodoDraft({ note: record.note })
    }
    setShowEditor(true)
  }

  const handleSaveRecord = async () => {
    if (!event) {
      return
    }

    setSubmitting(true)

    let result
    if (event.type === 'time') {
      result = editingRecord
        ? await actions.updateRecord(event.id, editingRecord.id, timeDraft)
        : await actions.createRecord(event.id, timeDraft)
    } else if (event.type === 'checkin') {
      result = editingRecord
        ? await actions.updateRecord(event.id, editingRecord.id, checkinDraft)
        : await actions.createRecord(event.id, checkinDraft)
    } else {
      result = editingRecord
        ? await actions.updateRecord(event.id, editingRecord.id, todoDraft)
        : await actions.createRecord(event.id, todoDraft)
    }

    setSubmitting(false)
    if (!result.ok) {
      Taro.showToast({ title: result.error || '保存失败', icon: 'none' })
      return
    }

    Taro.showToast({ title: editingRecord ? '记录已更新' : '记录已创建', icon: 'success' })
    resetEditor()
  }

  const handleDeleteRecord = async () => {
    if (!event || !pendingDeleteId) {
      return
    }
    setSubmitting(true)
    const result = await actions.deleteRecord(event.id, pendingDeleteId)
    setSubmitting(false)
    setPendingDeleteId(null)
    if (!result.ok) {
      Taro.showToast({ title: result.error || '删除失败', icon: 'none' })
      return
    }
    Taro.showToast({ title: '记录已删除', icon: 'success' })
  }

  const handleQuickCheckin = async () => {
    if (!event) {
      return
    }
    setSubmitting(true)
    const result = await actions.checkinToday(event.id)
    setSubmitting(false)
    if (!result.ok) {
      Taro.showToast({ title: result.error || '打卡失败', icon: 'none' })
      return
    }
    Taro.showToast({ title: '打卡成功', icon: 'success' })
  }

  if (!event) {
    return (
      <View className={shellClass}>
        <View className={cardClass}>
          <Text className="text-[30rpx]">未找到事件，可能已被删除。</Text>
        </View>
      </View>
    )
  }

  return (
    <View className={shellClass}>
      <PageHeader
        left={(
          <View className="flex flex-col gap-[6rpx]">
            <Text className="text-[44rpx] font-semibold">{event.title}</Text>
            <Text className={isDark ? 'text-[24rpx] text-[#a8b0bf]' : 'text-[24rpx] text-[#615346]'}>
              {event.description || '暂无描述'}
            </Text>
          </View>
        )}
        right={(
          <View className="flex items-center gap-[12rpx]">
            <Button className={buttonClass} onClick={() => Taro.navigateTo({ url: `/pages/event-analysis/index?id=${event.id}` })}>
              分析
            </Button>
            <Button className={primaryButtonClass} onClick={event.type === 'checkin' ? handleQuickCheckin : openCreateEditor}>
              {event.type === 'checkin' ? '今日打卡' : '新增'}
            </Button>
          </View>
        )}
      />

      <HeaderMeta
        items={[
          {
            key: 'records',
            text: summary?.countLabel || '0 条记录',
            tone: 'completed',
          },
          {
            key: 'sync',
            text: pendingTasks > 0 ? `待同步 ${pendingTasks}` : syncStatus === 'syncing' ? '同步中' : '已同步',
            tone: pendingTasks > 0 ? 'pending' : 'neutral',
            onClick: () => Taro.navigateTo({ url: '/pages/sync-status/index' }),
          },
        ]}
      />

      {lastError ? (
        <View className={`${cardClass} border-[#d35d47]`}>
          <Text className="text-[26rpx] leading-[1.5]">最近一次同步失败：{lastError}</Text>
        </View>
      ) : null}

      {analytics?.type === 'checkin' ? (
        <View className={cardClass}>
          <View className="grid grid-cols-2 gap-[16rpx] mb-[20rpx]">
            <View className={isDark ? 'rounded-[18rpx] bg-[#10151d] p-[20rpx]' : 'rounded-[18rpx] bg-[#fffaf1] p-[20rpx]'}>
              <Text className="text-[24rpx]">连续打卡</Text>
              <Text className="text-[48rpx] font-bold">{analytics.consecutiveDays}</Text>
            </View>
            <View className={isDark ? 'rounded-[18rpx] bg-[#10151d] p-[20rpx]' : 'rounded-[18rpx] bg-[#fffaf1] p-[20rpx]'}>
              <Text className="text-[24rpx]">累计天数</Text>
              <Text className="text-[48rpx] font-bold">{analytics.totalDays}</Text>
            </View>
          </View>

          <CheckinHeatmap
            records={event.records}
            currentMonth={checkinMonth}
            onMonthChange={setCheckinMonth}
            actualTheme={actualTheme}
          />
        </View>
      ) : null}

      <View className={cardClass}>
        <View className="flex items-center justify-between mb-[16rpx]">
          <Text className="text-[34rpx] font-semibold">记录</Text>
          <Text className={isDark ? 'text-[24rpx] text-[#a8b0bf]' : 'text-[24rpx] text-[#615346]'}>
            {event.type === 'todo' ? '点击卡片切换完成状态' : '按时间倒序排列'}
          </Text>
        </View>

        <View className="flex flex-col gap-[16rpx]">
          {event.records.map(record => (
            <SwipeableItem
              key={record.id}
              actions={[
                { text: '编辑', onClick: () => openEditEditor(record) },
                { text: '删除', type: 'danger', onClick: () => setPendingDeleteId(record.id) },
              ]}
            >
              <View
                className={isDark
                  ? 'rounded-[20rpx] border-[2rpx] border-[#303847] bg-[#10151d] p-[22rpx]'
                  : 'rounded-[20rpx] border-[2rpx] border-[#2e2218] bg-[#fffaf1] p-[22rpx]'}
                onClick={() => {
                  if (record.kind === 'todo') {
                    void actions.toggleTodoRecord(event.id, record.id)
                  }
                }}
              >
                {record.kind === 'time' ? (
                  <TimeRecordCard record={record} />
                ) : null}
                {record.kind === 'checkin' ? (
                  <CheckinRecordCard record={record} />
                ) : null}
                {record.kind === 'todo' ? (
                  <TodoRecordCard record={record} />
                ) : null}
              </View>
            </SwipeableItem>
          ))}

          {!event.records.length ? (
            <View className={isDark
              ? 'rounded-[18rpx] border-[2rpx] border-dashed border-[#465063] p-[28rpx] text-center text-[26rpx] text-[#a8b0bf]'
              : 'rounded-[18rpx] border-[2rpx] border-dashed border-[#b8946f] p-[28rpx] text-center text-[26rpx] text-[#615346]'}>
              还没有记录，先添加第一条。
            </View>
          ) : null}
        </View>
      </View>

      {showEditor ? (
        <View className="fixed inset-0 z-[10] flex items-center justify-center">
          <View className="absolute inset-0 bg-[#00000066]" onClick={resetEditor} />
          <View className={`${dialogClass} relative z-[1] flex flex-col gap-[16rpx]`}>
            <View className="flex items-center justify-between">
              <Text className="text-[34rpx] font-semibold">{editingRecord ? '编辑记录' : summary?.actionLabel || '新增记录'}</Text>
              <Button className={buttonClass} onClick={resetEditor}>关闭</Button>
            </View>

            {event.type === 'time' ? (
              <>
                <View className="flex gap-[12rpx]">
                  <Picker mode="date" value={timeDraft.startDate} onChange={evt => setTimeDraft(current => ({ ...current, startDate: evt.detail.value }))}>
                    <View className={`${inputClass} flex items-center`}><Text>{timeDraft.startDate}</Text></View>
                  </Picker>
                  <Picker mode="time" value={timeDraft.startTime} onChange={evt => setTimeDraft(current => ({ ...current, startTime: evt.detail.value }))}>
                    <View className={`${inputClass} flex items-center`}><Text>{timeDraft.startTime || '开始时间'}</Text></View>
                  </Picker>
                </View>
                <View className="flex gap-[12rpx]">
                  <Picker mode="date" value={timeDraft.endDate} onChange={evt => setTimeDraft(current => ({ ...current, endDate: evt.detail.value }))}>
                    <View className={`${inputClass} flex items-center`}><Text>{timeDraft.endDate}</Text></View>
                  </Picker>
                  <Picker mode="time" value={timeDraft.endTime} onChange={evt => setTimeDraft(current => ({ ...current, endTime: evt.detail.value }))}>
                    <View className={`${inputClass} flex items-center`}><Text>{timeDraft.endTime || '结束时间'}</Text></View>
                  </Picker>
                </View>
                <Input
                  className={inputClass}
                  placeholder="备注"
                  value={timeDraft.note}
                  onInput={evt => setTimeDraft(current => ({ ...current, note: evt.detail.value }))}
                />
                <Text className="text-[24rpx]">预计时长：{pendingDuration ? formatMinutes(pendingDuration) : '—'}</Text>
              </>
            ) : null}

            {event.type === 'checkin' ? (
              <>
                <Picker mode="date" value={checkinDraft.startDate} onChange={evt => setCheckinDraft(current => ({ ...current, startDate: evt.detail.value }))}>
                  <View className={`${inputClass} flex items-center`}><Text>{checkinDraft.startDate}</Text></View>
                </Picker>
                <Input
                  className={inputClass}
                  placeholder="打卡备注"
                  value={checkinDraft.note}
                  onInput={evt => setCheckinDraft(current => ({ ...current, note: evt.detail.value }))}
                />
              </>
            ) : null}

            {event.type === 'todo' ? (
              <Input
                className={inputClass}
                placeholder="待办内容"
                value={todoDraft.note}
                onInput={evt => setTodoDraft({ note: evt.detail.value })}
              />
            ) : null}

            <Button className={primaryButtonClass} loading={submitting} onClick={handleSaveRecord}>
              {editingRecord ? '保存修改' : '保存记录'}
            </Button>
          </View>
        </View>
      ) : null}

      {pendingDeleteId ? (
        <View className="fixed inset-0 z-[10] flex items-center justify-center">
          <View className="absolute inset-0 bg-[#00000066]" onClick={() => setPendingDeleteId(null)} />
          <View className={`${dialogClass} relative z-[1] flex flex-col gap-[16rpx]`}>
            <Text className="text-[34rpx] font-semibold">删除记录</Text>
            <Text className="text-[26rpx]">这个操作不会删除事件本身，只会移除当前记录。</Text>
            <View className="flex gap-[12rpx]">
              <Button className={`flex-1 ${buttonClass}`} onClick={() => setPendingDeleteId(null)}>
                取消
              </Button>
              <Button
                className={isDark
                  ? 'mr-0 flex-1 rounded-[999px] bg-[#d35d47] text-[#fffdf8] h-[72rpx] leading-[72rpx] text-[26rpx]'
                  : 'mr-0 flex-1 rounded-[999px] bg-[#c9412f] text-[#fffdf8] h-[72rpx] leading-[72rpx] text-[26rpx]'}
                loading={submitting}
                onClick={handleDeleteRecord}
              >
                删除
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function TimeRecordCard({ record }: { record: TimeRecord }) {
  return (
    <View className="flex flex-col gap-[8rpx]">
      <View className="flex items-center justify-between gap-[12rpx]">
        <Text className="text-[28rpx] font-semibold">
          {record.startDate} {record.startTime} → {record.endDate} {record.endTime}
        </Text>
        <Text className="text-[26rpx] font-semibold">{formatMinutes(record.durationMinutes)}</Text>
      </View>
      <Text className="text-[24rpx] opacity-80">{record.note || '无备注'}</Text>
    </View>
  )
}

function CheckinRecordCard({ record }: { record: CheckinRecord }) {
  return (
    <View className="flex items-center justify-between gap-[12rpx]">
      <View className="flex flex-col gap-[8rpx]">
        <Text className="text-[28rpx] font-semibold">{record.startDate}</Text>
        <Text className="text-[24rpx] opacity-80">{record.note || '无备注'}</Text>
      </View>
      <Text className="text-[26rpx]">已打卡</Text>
    </View>
  )
}

function TodoRecordCard({ record }: { record: TodoRecord }) {
  return (
    <View className="flex flex-col gap-[8rpx]">
      <View className="flex items-center gap-[12rpx]">
        <Text className="text-[32rpx]">{record.completed ? '☑' : '☐'}</Text>
        <Text className={`text-[28rpx] font-semibold ${record.completed ? 'line-through opacity-70' : ''}`}>
          {record.note}
        </Text>
      </View>
      <Text className="text-[24rpx] opacity-80">
        创建于 {new Date(record.createdAt).toLocaleString('zh-CN')}
      </Text>
    </View>
  )
}
