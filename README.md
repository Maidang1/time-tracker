# Chrono Pulse

Chrono Pulse 是一个使用 Taro + React 构建的跨端事件记录器。它可以在微信小程序、H5 等多端运行，帮助用户跟踪事件与每个记录的时间投入。

## 本地开发

```bash
pnpm install
pnpm run dev:weapp # 或 dev:h5
```

## 远端存储

默认情况下，微信小程序环境会继续使用微信云开发；其他环境不启用远端存储。

如需启用 GitHub 远端存储，请在构建环境中提供以下变量：

```bash
REMOTE_STORE_PROVIDER=github
GITHUB_SYNC_OWNER=your-org-or-user
GITHUB_SYNC_REPO=chrono-pulse-data
GITHUB_SYNC_BRANCH=main
GITHUB_SYNC_FILE_PATH=chrono-pulse/events.json
GITHUB_SYNC_TOKEN=github_pat_xxx
```


