import type { ReactNode } from 'react'
import { View } from '@tarojs/components'

type PageHeaderProps = {
  left: ReactNode
  right?: ReactNode
  className?: string
}

export default function PageHeader ({ left, right, className }: PageHeaderProps) {
  return (
    <View className={`flex items-center justify-between gap-[16rpx] relative z-[1]${className ? ` ${className}` : ''}`}>
      <View className='flex items-center'>{left}</View>
      {right ? <View className='flex items-center'>{right}</View> : null}
    </View>
  )
}
