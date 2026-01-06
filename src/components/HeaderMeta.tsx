import type { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'

type MetaTone = 'pending' | 'completed' | 'neutral'

export type HeaderMetaItem = {
  key: string
  text: ReactNode
  tone?: MetaTone
}

type HeaderMetaProps = {
  items: HeaderMetaItem[]
  className?: string
}

export default function HeaderMeta ({ items, className }: HeaderMetaProps) {
  return (
    <View className={`header-meta${className ? ` ${className}` : ''}`}>
      {items.map(item => (
        <View key={item.key} className='meta-pill'>
          <View className={`meta-dot ${item.tone ?? 'neutral'}`} />
          <Text className='meta-text'>{item.text}</Text>
        </View>
      ))}
    </View>
  )
}
