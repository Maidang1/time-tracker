import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Button, Text, Textarea, View } from '@tarojs/components'

import type { AiInsightResult } from '../services/aiClient'

type AiInsightCardProps = {
  title: string
  description?: string
  disabled?: boolean
  disabledReason?: string
  placeholder?: string
  actionLabel?: string
  resetLabel?: string
  badgeLabel?: string
  extraContent?: ReactNode
  initialResult?: AiInsightResult | null
  className?: string
  onGenerate: (userPrompt: string) => Promise<AiInsightResult>
  onResult?: (result: AiInsightResult) => void
}

export default function AiInsightCard ({
  title,
  description,
  disabled,
  disabledReason,
  placeholder = '补充提示词 (可选)',
  actionLabel = '生成分析',
  resetLabel = '重置',
  badgeLabel = 'DeepSeek',
  extraContent,
  initialResult,
  className,
  onGenerate,
  onResult
}: AiInsightCardProps) {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<AiInsightResult | null>(initialResult ?? null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setResult(initialResult ?? null)
  }, [initialResult])

  const paragraphs = useMemo(() => {
    if (!result?.content) return []
    return result.content
      .split(/\n{2,}/)
      .map(section => section.trim())
      .filter(Boolean)
  }, [result])

  const handleGenerate = async () => {
    if (disabled || isLoading) return
    setIsLoading(true)
    setError('')
    try {
      const response = await onGenerate(prompt)
      setResult(response)
      onResult?.(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (isLoading) return
    setPrompt('')
    setResult(null)
    setError('')
  }

  return (
    <View className={`relative z-[1] border-[2rpx] border-[#1a1a1a] rounded-[22rpx] p-[28rpx] sm:p-[32rpx] bg-[#ffffff] shadow-[0_18rpx_36rpx_#00000012] flex flex-col gap-[24rpx]${className ? ` ${className}` : ''}`}>
      <View className='flex justify-between gap-[16rpx]'>
        <View>
          <Text className='text-[36rpx] font-semibold leading-[1.3]'>{title}</Text>
          {description ? <Text className='mt-[8rpx] text-[26rpx] text-[#4a4a4a] block leading-[1.5]'>{description}</Text> : null}
        </View>
        <View className='self-start border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[20rpx] py-[8rpx] text-[24rpx] font-medium bg-[#f5f5f0]'>来自 {badgeLabel}</View>
      </View>

      {extraContent ? <View className='flex flex-wrap gap-[12rpx]'>{extraContent}</View> : null}

      <View className='flex flex-col gap-[12rpx]'>
        <Textarea
          value={prompt}
          placeholder={placeholder}
          className='min-h-[140rpx] border-[2rpx] border-[#1a1a1a] rounded-[18rpx] px-[20rpx] py-[16rpx] text-[28rpx] bg-[#f5f5f0]'
          onInput={event => setPrompt(event.detail.value)}
          maxlength={400}
        />
        {disabled && disabledReason ? (
          <Text className='text-[24rpx] text-[#888888]'>{disabledReason}</Text>
        ) : (
          <Text className='text-[24rpx] text-[#888888]'>补充你关心的角度，空着也可以直接分析。</Text>
        )}
      </View>

      <View className='flex gap-[16rpx]'>
        <Button
          className='flex-1 rounded-[16rpx] border-[2rpx] border-[#1a1a1a] text-[28rpx] h-[90rpx] leading-[90rpx] bg-transparent text-[#1a1a1a] disabled:opacity-60'
          onClick={handleReset}
          disabled={isLoading}
        >
          {resetLabel}
        </Button>
        <Button
          className='flex-1 rounded-[16rpx] border-[2rpx] border-[#1a1a1a] text-[28rpx] h-[90rpx] leading-[90rpx] bg-[#f6821f] text-[#ffffff] shadow-[0_12rpx_22rpx_#f6821f33] disabled:opacity-60'
          onClick={handleGenerate}
          disabled={disabled || isLoading}
        >
          {isLoading ? '召唤中…' : actionLabel}
        </Button>
      </View>

      {isLoading ? (
        <View className='text-[26rpx] text-[#4a4a4a]'>正在召唤 DeepSeek…</View>
      ) : null}

      {error ? <View className='border-[2rpx] border-[#d93025] rounded-[14rpx] px-[20rpx] py-[16rpx] text-[#d93025] text-[26rpx]'>{error}</View> : null}

      {result ? (
        <View className='border-[2rpx] dashed border-[#1a1a1a] rounded-[18rpx] p-[20rpx] flex flex-col gap-[12rpx] bg-[#fcfbf7]'>
          <View className='text-[24rpx] text-[#4a4a4a]'>
            <Text>最新结果 · {new Date(result.createdAt).toLocaleString()}</Text>
          </View>
          <View className='flex flex-col gap-[12rpx]'>
            {paragraphs.length
              ? paragraphs.map((paragraph, index) => (
                  <Text key={index} className='text-[28rpx] leading-[1.6] text-[#1a1a1a]'>
                    {paragraph}
                  </Text>
                ))
              : <Text className='text-[28rpx] leading-[1.6] text-[#1a1a1a]'>{result.content}</Text>}
          </View>
        </View>
      ) : null}
    </View>
  )
}
