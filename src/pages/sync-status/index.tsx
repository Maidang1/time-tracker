import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'

import { useTheme } from '../../hooks/useTheme'
import { useSyncStatusViewModel } from '../../presentation/hooks/useSyncStatusViewModel'

export default function SyncStatusPage() {
  const { actualTheme } = useTheme()
  const { actions, initialized, lastError, pendingTasks, syncStatus } = useSyncStatusViewModel()
  const [submitting, setSubmitting] = useState(false)

  const isDark = actualTheme === 'dark'
  const shellClass = isDark
    ? 'min-h-screen bg-[#0d1015] text-[#f6efe4] px-[24rpx] py-[32rpx] flex flex-col items-center justify-center gap-[24rpx]'
    : 'min-h-screen bg-[#f4ecdf] text-[#18120d] px-[24rpx] py-[32rpx] flex flex-col items-center justify-center gap-[24rpx]'
  const cardClass = isDark
    ? 'w-full max-w-[720rpx] rounded-[24rpx] border-[2rpx] border-[#303847] bg-[#151a22] p-[32rpx] shadow-[0_16rpx_36rpx_#00000030]'
    : 'w-full max-w-[720rpx] rounded-[24rpx] border-[2rpx] border-[#2e2218] bg-[#fffdf8] p-[32rpx] shadow-[0_16rpx_36rpx_#7a4d2414]'
  const buttonClass = isDark
    ? 'mr-0 rounded-[999px] border-[2rpx] border-[#465063] bg-[#151a22] text-[#f6efe4] px-[26rpx] h-[72rpx] leading-[72rpx] text-[26rpx]'
    : 'mr-0 rounded-[999px] border-[2rpx] border-[#2e2218] bg-[#fffdf8] text-[#18120d] px-[26rpx] h-[72rpx] leading-[72rpx] text-[26rpx]'
  const primaryButtonClass = isDark
    ? 'mr-0 rounded-[999px] border-[2rpx] border-[#f6b74f] bg-[#f0a429] text-[#211607] px-[26rpx] h-[72rpx] leading-[72rpx] text-[26rpx] font-semibold'
    : 'mr-0 rounded-[999px] border-[2rpx] border-[#ad5a00] bg-[#f6821f] text-[#fffdf8] px-[26rpx] h-[72rpx] leading-[72rpx] text-[26rpx] font-semibold'

  const handleSync = async () => {
    setSubmitting(true)
    const success = await actions.syncNow()
    setSubmitting(false)
    Taro.showToast({
      title: success ? '同步完成' : '同步失败',
      icon: success ? 'success' : 'none',
    })
  }

  return (
    <View className={shellClass}>
      <View className={cardClass}>
        <Text className="text-[44rpx] font-semibold">同步中心</Text>
        <Text className="text-[26rpx] opacity-80 mt-[12rpx]">
          {initialized ? '本地修改会先落地，再排队同步到云端。' : '应用仍在初始化。'}
        </Text>

        <View className="grid grid-cols-2 gap-[16rpx] mt-[24rpx]">
          <SyncStat label="状态" value={syncStatus === 'syncing' ? '同步中' : syncStatus === 'error' ? '异常' : '空闲'} />
          <SyncStat label="待处理任务" value={String(pendingTasks)} />
        </View>

        {lastError ? (
          <View className="rounded-[18rpx] border-[2rpx] border-[#d35d47] p-[18rpx] mt-[20rpx]">
            <Text className="text-[26rpx]">最近错误：{lastError}</Text>
          </View>
        ) : null}

        <View className="flex gap-[12rpx] mt-[24rpx]">
          <Button className={`flex-1 ${primaryButtonClass}`} loading={submitting} onClick={handleSync}>
            立即同步
          </Button>
          <Button className={`flex-1 ${buttonClass}`} onClick={() => Taro.navigateBack()}>
            返回
          </Button>
        </View>
      </View>
    </View>
  )
}

function SyncStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-[18rpx] bg-[#0000000d] p-[18rpx]">
      <Text className="text-[24rpx] opacity-80">{label}</Text>
      <Text className="text-[34rpx] font-semibold mt-[8rpx]">{value}</Text>
    </View>
  )
}
