import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Button, Text, Textarea, View } from '@tarojs/components'

import type { AiInsightResult } from '../services/aiClient'

import './AiInsightCard.scss'

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
    <View className={`ai-card${className ? ` ${className}` : ''}`}>
      <View className='ai-card_header'>
        <View>
          <Text className='ai-card_title'>{title}</Text>
          {description ? <Text className='ai-card_description'>{description}</Text> : null}
        </View>
        <View className='ai-card_badge'>来自 {badgeLabel}</View>
      </View>

      {extraContent ? <View className='ai-card_context'>{extraContent}</View> : null}

      <View className='ai-card_prompt'>
        <Textarea
          value={prompt}
          placeholder={placeholder}
          className='ai-card_textarea'
          onInput={event => setPrompt(event.detail.value)}
          maxlength={400}
        />
        {disabled && disabledReason ? (
          <Text className='ai-card_hint'>{disabledReason}</Text>
        ) : (
          <Text className='ai-card_hint'>补充你关心的角度，空着也可以直接分析。</Text>
        )}
      </View>

      <View className='ai-card_actions'>
        <Button
          className='ai-card_button ghost'
          onClick={handleReset}
          disabled={isLoading}
        >
          {resetLabel}
        </Button>
        <Button
          className='ai-card_button solid'
          onClick={handleGenerate}
          disabled={disabled || isLoading}
        >
          {isLoading ? '召唤中…' : actionLabel}
        </Button>
      </View>

      {isLoading ? (
        <View className='ai-card_status'>正在召唤 DeepSeek…</View>
      ) : null}

      {error ? <View className='ai-card_error'>{error}</View> : null}

      {result ? (
        <View className='ai-card_response'>
          <View className='ai-card_response-meta'>
            <Text>最新结果 · {new Date(result.createdAt).toLocaleString()}</Text>
          </View>
          <View className='ai-card_response-text'>
            {paragraphs.length
              ? paragraphs.map((paragraph, index) => (
                  <Text key={index} className='ai-card_paragraph'>
                    {paragraph}
                  </Text>
                ))
              : <Text className='ai-card_paragraph'>{result.content}</Text>}
          </View>
        </View>
      ) : null}
    </View>
  )
}
