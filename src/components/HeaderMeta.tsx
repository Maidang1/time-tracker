import type { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'

type MetaTone = 'pending' | 'completed' | 'neutral'

export type HeaderMetaItem = {
  key: string
  text: ReactNode
  tone?: MetaTone
  onClick?: () => void
  className?: string
}

type HeaderMetaProps = {
  items: HeaderMetaItem[]
  className?: string
}

export default function HeaderMeta ({ items, className }: HeaderMetaProps) {
  return (
    <View className={`flex gap-[16rpx] relative z-[1]${className ? ` ${className}` : ''}`}>
      {items.map(item => (
        <View
          key={item.key}
          className={`flex items-center gap-[8rpx] px-[16rpx] py-[8rpx] border-[2rpx] border-[#1a1a1a] rounded-[999px] bg-[#ffffff]${item.className ? ` ${item.className}` : ''}`}
          onClick={item.onClick}
        >
          <View className={`w-[14rpx] h-[14rpx] rounded-full ${item.tone === 'pending' ? 'bg-[#f08c26]' : item.tone === 'completed' ? 'bg-[#28b463]' : 'bg-[#888888]'}`} />
          <Text className='text-[24rpx] text-[#1a1a1a]'>{item.text}</Text>
        </View>
      ))}
    </View>
  )
}
