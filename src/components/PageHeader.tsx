import type { ReactNode } from 'react'
import { View } from '@tarojs/components'

type PageHeaderProps = {
  left: ReactNode
  right?: ReactNode
  className?: string
}

export default function PageHeader ({ left, right, className }: PageHeaderProps) {
  return (
    <View className={`page-header${className ? ` ${className}` : ''}`}>
      <View className='page-header_left'>{left}</View>
      {right ? <View className='page-header_right'>{right}</View> : null}
    </View>
  )
}
