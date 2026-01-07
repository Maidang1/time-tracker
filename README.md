# Time Track

Time Track 是一个使用 Taro + React 构建的跨端事件记录器。它可以在微信小程序、H5 等多端运行，帮助用户跟踪事件与每个记录的时间投入。

## 本地开发

```bash
pnpm install
pnpm run dev:weapp # 或 dev:h5
```

## DeepSeek AI 洞察配置

1. 申请 DeepSeek API Key，并确认可访问 `https://api.deepseek.com`。
2. 在 `.env.development`、`.env.production` 等环境文件中设置：
   ```bash
   DEEPSEEK_API_KEY="你的 key"
   DEEPSEEK_API_BASE="https://api.deepseek.com"
   DEEPSEEK_MODEL="deepseek-chat"
   ```
3. 运行 `pnpm run test:ai`，验证提示词构造与错误归一逻辑是否正常。
4. 启动开发命令后，首页与事件详情页会出现「AI 洞察」面板，若缺少 Key 则会显示禁用提示。

## AI 洞察快速验证

- 首页卡片会汇总最近事件，分析整体类型、心情与建议。
- 事件详情卡片会分析该事件的记录趋势，并给出投入程度反馈。
- 两个入口均允许输入自定义提示词并在 DeepSeek 输出中标注来源。
