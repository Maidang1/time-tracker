export type RemoteStoreProvider = 'github' | 'wechat-cloud' | 'none'

export type GitHubRemoteStoreConfig = {
  provider: 'github'
  owner: string
  repo: string
  branch: string
  filePath: string
  token: string
}

export type WechatCloudRemoteStoreConfig = {
  provider: 'wechat-cloud'
}

export type NoopRemoteStoreConfig = {
  provider: 'none'
}

export type RemoteStoreConfig =
  | GitHubRemoteStoreConfig
  | WechatCloudRemoteStoreConfig
  | NoopRemoteStoreConfig

const normalizeProvider = (value: string): RemoteStoreProvider | null => {
  if (value === 'github' || value === 'wechat-cloud' || value === 'none') {
    return value
  }
  return null
}

export const getRemoteStoreConfig = (
  hasWechatCloudSupport: boolean,
): RemoteStoreConfig => {
  const configuredProvider = normalizeProvider(REMOTE_STORE_PROVIDER)

  if (configuredProvider === 'github') {
    return {
      provider: 'github',
      owner: GITHUB_SYNC_OWNER.trim(),
      repo: GITHUB_SYNC_REPO.trim(),
      branch: GITHUB_SYNC_BRANCH.trim() || 'main',
      filePath: GITHUB_SYNC_FILE_PATH.trim() || 'chrono-pulse/events.json',
      token: GITHUB_SYNC_TOKEN.trim(),
    }
  }

  if (configuredProvider === 'wechat-cloud') {
    return { provider: 'wechat-cloud' }
  }

  if (configuredProvider === 'none') {
    return { provider: 'none' }
  }

  if (hasWechatCloudSupport) {
    return { provider: 'wechat-cloud' }
  }

  return { provider: 'none' }
}
