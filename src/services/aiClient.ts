import Taro from '@tarojs/taro'

import type { AiScope } from '../utils/aiPrompt'
import { DEFAULT_SYSTEM_PROMPT, normalizeAiErrorMessage } from '../utils/aiPrompt'
import { getDeepSeekConfig, isDeepSeekConfigured } from '../utils/aiConfig'

export type AiInsightResult = {
  content: string
  createdAt: number
}

type DeepSeekMessage = {
  role: 'system' | 'user'
  content: string
}

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

export type AiInsightRequest = {
  scope: AiScope
  prompt: string
  systemPrompt?: string
}

export class AiClientError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message)
    this.name = 'AiClientError'
  }
}

export const isDeepSeekEnabled = () => isDeepSeekConfigured()

const buildMessages = (prompt: string, systemPrompt?: string): DeepSeekMessage[] => {
  return [
    {
      role: 'system',
      content: systemPrompt || DEFAULT_SYSTEM_PROMPT
    },
    {
      role: 'user',
      content: prompt
    }
  ]
}

export const fetchAiInsight = async ({ prompt, systemPrompt }: AiInsightRequest): Promise<AiInsightResult> => {
  const { apiKey, apiBase, model } = getDeepSeekConfig()
  if (!apiKey) {
    throw new AiClientError('DeepSeek API key 未配置')
  }

  try {
    const response = await Taro.request<DeepSeekResponse>({
      url: `${apiBase}/v1/chat/completions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      data: {
        model,
        temperature: 0.35,
        messages: buildMessages(prompt, systemPrompt)
      }
    })

    if (response.data?.error) {
      throw new AiClientError(response.data.error.message || 'DeepSeek 返回了错误')
    }

    const content = response.data?.choices?.[0]?.message?.content
    if (!content) {
      throw new AiClientError('DeepSeek 没有返回内容，请稍后再试。')
    }

    return {
      content,
      createdAt: Date.now()
    }
  } catch (error) {
    const normalized = normalizeAiErrorMessage(error)
    if (error instanceof AiClientError) {
      throw error
    }
    throw new AiClientError(normalized, error)
  }
}
