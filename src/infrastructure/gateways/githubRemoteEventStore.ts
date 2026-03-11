import Taro from '@tarojs/taro'
import type { RemoteEventStore } from '../../application/contracts'
import type { EventItem } from '../../domain/events'
import { normalizeEvents } from '../../domain/events'
import type { GitHubRemoteStoreConfig } from '../config/remoteStoreConfig'

type GitHubFileResponse = {
  type?: string
  content?: string
  sha?: string
}

type GitHubRequestOptions = {
  method: 'GET' | 'PUT'
  path: string
  data?: Record<string, unknown>
}

type RemoteEventsFile = {
  events: EventItem[]
  sha: string | null
}

const GITHUB_API_BASE_URL = 'https://api.github.com'

const encodeBase64 = (value: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes = new TextEncoder().encode(value)
  let output = ''

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0
    const chunk = (a << 16) | (b << 8) | c

    output += chars[(chunk >> 18) & 63]
    output += chars[(chunk >> 12) & 63]
    output += index + 1 < bytes.length ? chars[(chunk >> 6) & 63] : '='
    output += index + 2 < bytes.length ? chars[chunk & 63] : '='
  }

  return output
}

const decodeBase64 = (value: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const normalized = value.replace(/\s/g, '')
  const bytes: number[] = []

  for (let index = 0; index < normalized.length; index += 4) {
    const encodedA = normalized[index]
    const encodedB = normalized[index + 1]
    const encodedC = normalized[index + 2]
    const encodedD = normalized[index + 3]

    const a = chars.indexOf(encodedA)
    const b = chars.indexOf(encodedB)
    const c = encodedC === '=' ? -1 : chars.indexOf(encodedC)
    const d = encodedD === '=' ? -1 : chars.indexOf(encodedD)

    if (a < 0 || b < 0 || (encodedC !== '=' && c < 0) || (encodedD !== '=' && d < 0)) {
      throw new Error('GitHub 返回了无效的 Base64 内容')
    }

    const chunk = (a << 18) | (b << 12) | ((Math.max(c, 0) & 63) << 6) | (Math.max(d, 0) & 63)
    bytes.push((chunk >> 16) & 255)

    if (encodedC !== '=') {
      bytes.push((chunk >> 8) & 255)
    }
    if (encodedD !== '=') {
      bytes.push(chunk & 255)
    }
  }

  return new TextDecoder().decode(new Uint8Array(bytes))
}

const encodeContentPath = (filePath: string) =>
  filePath
    .split('/')
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join('/')

const toGitHubError = (statusCode: number, fallback: string) => {
  if (statusCode === 401 || statusCode === 403) {
    return new Error('GitHub 鉴权失败，请检查 Token 权限')
  }
  if (statusCode === 404) {
    return new Error('GitHub 仓库、分支或文件不存在')
  }
  if (statusCode === 409 || statusCode === 422) {
    return new Error('GitHub 文件提交冲突，请稍后重试')
  }
  if (statusCode >= 500) {
    return new Error('GitHub 服务暂时不可用')
  }
  return new Error(fallback)
}

export class GitHubRemoteEventStore implements RemoteEventStore {
  constructor(private readonly config: GitHubRemoteStoreConfig) {}

  async initialize() {
    this.assertConfig()
    const remoteFile = await this.readRemoteFile(true)
    if (remoteFile.sha) {
      return
    }
    await this.writeEvents([], null, 'chore(sync): initialize remote events')
  }

  async pullEvents() {
    const remoteFile = await this.readRemoteFile()
    return remoteFile.events
  }

  async upsertEvent(event: EventItem) {
    await this.mutateEvents(
      events => {
        const nextEvents = [...events]
        const index = nextEvents.findIndex(item => item.id === event.id)
        if (index >= 0) {
          nextEvents[index] = event
          return nextEvents
        }
        return [event, ...nextEvents]
      },
      `chore(sync): upsert event ${event.id}`,
    )
  }

  async deleteEvent(eventId: number) {
    await this.mutateEvents(
      events => events.filter(event => event.id !== eventId),
      `chore(sync): delete event ${eventId}`,
    )
  }

  private assertConfig() {
    if (!this.config.owner || !this.config.repo || !this.config.branch || !this.config.filePath) {
      throw new Error('GitHub 远端存储配置不完整')
    }

    if (!this.config.token) {
      throw new Error('GitHub 远端存储缺少 Token')
    }
  }

  private async mutateEvents(
    mutate: (events: EventItem[]) => EventItem[],
    commitMessage: string,
  ) {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const remoteFile = await this.readRemoteFile()
        const nextEvents = normalizeEvents(mutate(remoteFile.events))
        await this.writeEvents(nextEvents, remoteFile.sha, commitMessage)
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('GitHub 同步失败')
        if (!lastError.message.includes('提交冲突') || attempt > 0) {
          throw lastError
        }
      }
    }

    throw lastError || new Error('GitHub 同步失败')
  }

  private async readRemoteFile(allowMissingFile = false): Promise<RemoteEventsFile> {
    const response = await this.request<GitHubFileResponse>({
      method: 'GET',
      path: `/repos/${encodeURIComponent(this.config.owner)}/${encodeURIComponent(this.config.repo)}/contents/${encodeContentPath(this.config.filePath)}?ref=${encodeURIComponent(this.config.branch)}`,
    })

    if (allowMissingFile && response.statusCode === 404) {
      return {
        events: [],
        sha: null,
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw toGitHubError(response.statusCode, '读取 GitHub 远端数据失败')
    }

    const data = response.data
    if (data?.type !== 'file' || typeof data.content !== 'string') {
      throw new Error('GitHub 远端文件内容格式不正确')
    }

    try {
      const parsed = JSON.parse(decodeBase64(data.content))
      if (!Array.isArray(parsed)) {
        throw new Error('GitHub 远端文件必须是事件数组')
      }
      return {
        events: normalizeEvents(parsed),
        sha: typeof data.sha === 'string' ? data.sha : null,
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '解析 GitHub 远端数据失败')
    }
  }

  private async writeEvents(events: EventItem[], sha: string | null, message: string) {
    const payload: Record<string, unknown> = {
      message,
      content: encodeBase64(JSON.stringify(events, null, 2)),
      branch: this.config.branch,
    }

    if (sha) {
      payload.sha = sha
    }

    const response = await this.request({
      method: 'PUT',
      path: `/repos/${encodeURIComponent(this.config.owner)}/${encodeURIComponent(this.config.repo)}/contents/${encodeContentPath(this.config.filePath)}`,
      data: payload,
    })

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw toGitHubError(response.statusCode, '写入 GitHub 远端数据失败')
    }
  }

  private async request<T>({ method, path, data }: GitHubRequestOptions) {
    const response = await Taro.request<T>({
      url: `${GITHUB_API_BASE_URL}${path}`,
      method,
      data,
      header: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.config.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    return {
      statusCode: response.statusCode,
      data: response.data,
    }
  }
}
