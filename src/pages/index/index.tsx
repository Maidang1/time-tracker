import { useMemo, useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import type { EventItem, EventType } from '../../domain/events'
import HeaderMeta from '../../components/HeaderMeta'
import PageHeader from '../../components/PageHeader'
import SwipeableItem from '../../components/SwipeableItem'
import { useTheme } from '../../hooks/useTheme'
import { useEventsViewModel } from '../../presentation/hooks/useEventsViewModel'

const emptyDraft = {
  title: '',
  description: '',
  type: 'time' as EventType,
}

export default function IndexPage() {
  const { actualTheme } = useTheme()
  const { actions, events, initialized, lastError, pendingTasks, syncStatus, typeLabelMap } =
    useEventsViewModel()
  const [showEditor, setShowEditor] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
  const dialogClass = `${cardClass} w-[84vw] max-w-[680rpx]`
  const inputClass = isDark
    ? 'h-[88rpx] rounded-[18rpx] border-[2rpx] border-[#465063] bg-[#0d1015] px-[24rpx] text-[28rpx] text-[#f6efe4]'
    : 'h-[88rpx] rounded-[18rpx] border-[2rpx] border-[#2e2218] bg-[#fffaf1] px-[24rpx] text-[28rpx] text-[#18120d]'

  const syncLabel = useMemo(() => {
    if (syncStatus === 'syncing') {
      return '同步中'
    }
    if (pendingTasks > 0) {
      return `待同步 ${pendingTasks}`
    }
    return '已同步'
  }, [pendingTasks, syncStatus])

  const openCreateDialog = () => {
    setEditingEvent(null)
    setDraft(emptyDraft)
    setShowEditor(true)
  }

  const openEditDialog = (event: EventItem) => {
    setEditingEvent(event)
    setDraft({
      title: event.title,
      description: event.description,
      type: event.type,
    })
    setShowEditor(true)
  }

  const closeDialog = () => {
    setEditingEvent(null)
    setDraft(emptyDraft)
    setShowEditor(false)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const result = editingEvent
      ? await actions.updateEvent(editingEvent.id, draft)
      : await actions.createEvent(draft)
    setSubmitting(false)

    if (!result.ok) {
      Taro.showToast({ title: result.error || '保存失败', icon: 'none' })
      return
    }

    Taro.showToast({ title: editingEvent ? '事件已更新' : '事件已创建', icon: 'success' })
    closeDialog()
  }

  const handleDelete = async () => {
    if (!pendingDeleteId) {
      return
    }

    setSubmitting(true)
    const result = await actions.deleteEvent(pendingDeleteId)
    setSubmitting(false)
    setPendingDeleteId(null)
    if (!result.ok) {
      Taro.showToast({ title: result.error || '删除失败', icon: 'none' })
      return
    }
    Taro.showToast({ title: '事件已删除', icon: 'success' })
  }

  return (
    <View className={shellClass}>
      <PageHeader
        left={(
          <View className="flex flex-col gap-[6rpx]">
            <Text className="text-[48rpx] font-semibold">Chrono Pulse</Text>
            <Text className={isDark ? 'text-[24rpx] text-[#a8b0bf]' : 'text-[24rpx] text-[#615346]'}>
              事件、打卡和待办统一到一个时间轴里。
            </Text>
          </View>
        )}
        right={(
          <View className="flex items-center gap-[12rpx]">
            <Button
              className={buttonClass}
              onClick={() => Taro.navigateTo({ url: '/pages/sync-status/index' })}
            >
              同步
            </Button>
            <Button className={primaryButtonClass} onClick={openCreateDialog}>
              新建
            </Button>
          </View>
        )}
      />

      <HeaderMeta
        items={[
          { key: 'count', text: `${events.length} 个事件`, tone: 'completed' },
          {
            key: 'sync',
            text: syncLabel,
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

      <View className={cardClass}>
        <View className="flex items-center justify-between mb-[16rpx]">
          <Text className="text-[34rpx] font-semibold">事件列表</Text>
          <Text className={isDark ? 'text-[24rpx] text-[#a8b0bf]' : 'text-[24rpx] text-[#615346]'}>
            {initialized ? '本地优先，云端异步同步' : '初始化中'}
          </Text>
        </View>

        <View className="flex flex-col gap-[16rpx]">
          {events.map(event => (
            <SwipeableItem
              key={event.id}
              actions={[
                { text: '编辑', onClick: () => openEditDialog(event) },
                { text: '删除', type: 'danger', onClick: () => setPendingDeleteId(event.id) },
              ]}
            >
              <View
                className={isDark
                  ? 'rounded-[20rpx] border-[2rpx] border-[#303847] bg-[#10151d] p-[22rpx] flex items-center justify-between'
                  : 'rounded-[20rpx] border-[2rpx] border-[#2e2218] bg-[#fffaf1] p-[22rpx] flex items-center justify-between'}
                onClick={() => Taro.navigateTo({ url: `/pages/event-detail/index?id=${event.id}` })}
              >
                <View className="flex-1 pr-[16rpx] flex flex-col items-start gap-[8rpx] min-w-0">
                  <View className="w-full min-w-0">
                    <Text className="text-[30rpx] font-semibold leading-[1.3] break-words">
                      {event.title}
                    </Text>
                  </View>
                  <View className="w-full min-w-0">
                    <Text
                      className={`text-[24rpx] leading-[1.35] break-words ${
                        isDark ? 'text-[#a8b0bf]' : 'text-[#615346]'
                      }`}
                    >
                      {event.description || '暂无说明'}
                    </Text>
                  </View>
                </View>
                <View className="shrink-0 flex items-center gap-[12rpx]">
                  <Text
                    className={isDark
                      ? 'px-[16rpx] py-[8rpx] rounded-[999px] border-[2rpx] border-[#465063] bg-[#151a22] text-[22rpx] text-[#f6efe4]'
                      : 'px-[16rpx] py-[8rpx] rounded-[999px] border-[2rpx] border-[#b8946f] bg-[#f6ecde] text-[22rpx] text-[#5f4735]'}
                  >
                    {typeLabelMap[event.type]}
                  </Text>
                  <Text className="text-[34rpx]">›</Text>
                </View>
              </View>
            </SwipeableItem>
          ))}

          {!events.length ? (
            <View className={isDark
              ? 'rounded-[18rpx] border-[2rpx] border-dashed border-[#465063] p-[28rpx] text-center text-[26rpx] text-[#a8b0bf]'
              : 'rounded-[18rpx] border-[2rpx] border-dashed border-[#b8946f] p-[28rpx] text-center text-[26rpx] text-[#615346]'}>
              暂无事件，先建一个开始记录。
            </View>
          ) : null}
        </View>
      </View>

      {showEditor ? (
        <View className="fixed inset-0 z-[10] flex items-center justify-center">
          <View className="absolute inset-0 bg-[#00000066]" onClick={closeDialog} />
          <View className={`${dialogClass} relative z-[1] flex flex-col gap-[16rpx]`}>
            <View className="flex items-center justify-between">
              <Text className="text-[34rpx] font-semibold">{editingEvent ? '编辑事件' : '新建事件'}</Text>
              <Button className={buttonClass} onClick={closeDialog}>关闭</Button>
            </View>

            {!editingEvent ? (
              <View className="flex gap-[12rpx]">
                {(['time', 'checkin', 'todo'] as EventType[]).map(type => (
                  <Button
                    key={type}
                    className={`flex-1 rounded-[16rpx] h-[80rpx] leading-[80rpx] text-[26rpx] ${
                      draft.type === type ? primaryButtonClass : buttonClass
                    }`}
                    onClick={() => setDraft(current => ({ ...current, type }))}
                  >
                    {typeLabelMap[type]}
                  </Button>
                ))}
              </View>
            ) : null}

            <Input
              className={inputClass}
              placeholder="事件标题"
              value={draft.title}
              onInput={event => setDraft(current => ({ ...current, title: event.detail.value }))}
            />
            <Input
              className={inputClass}
              placeholder="事件说明"
              value={draft.description}
              onInput={event => setDraft(current => ({ ...current, description: event.detail.value }))}
            />
            <Button className={primaryButtonClass} loading={submitting} onClick={handleSubmit}>
              {editingEvent ? '保存修改' : '创建事件'}
            </Button>
          </View>
        </View>
      ) : null}

      {pendingDeleteId ? (
        <View className="fixed inset-0 z-[10] flex items-center justify-center">
          <View className="absolute inset-0 bg-[#00000066]" onClick={() => setPendingDeleteId(null)} />
          <View className={`${dialogClass} relative z-[1] flex flex-col gap-[16rpx]`}>
            <Text className="text-[34rpx] font-semibold">删除事件</Text>
            <Text className="text-[26rpx] leading-[1.5]">删除事件会同时移除它的全部记录，这个操作不可恢复。</Text>
            <View className="flex gap-[12rpx]">
              <Button className={`flex-1 ${buttonClass}`} onClick={() => setPendingDeleteId(null)}>
                取消
              </Button>
              <Button
                className={isDark
                  ? 'mr-0 flex-1 rounded-[999px] bg-[#d35d47] text-[#fffdf8] h-[72rpx] leading-[72rpx] text-[26rpx]'
                  : 'mr-0 flex-1 rounded-[999px] bg-[#c9412f] text-[#fffdf8] h-[72rpx] leading-[72rpx] text-[26rpx]'}
                loading={submitting}
                onClick={handleDelete}
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
