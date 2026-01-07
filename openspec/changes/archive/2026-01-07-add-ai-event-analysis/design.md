## Overview
Introduces DeepSeek-powered AI insights at two touch points: (1) global all-events analysis from the home page, and (2) per-event analysis on the event detail page. Each combines system prompts with user-provided instructions.

## DeepSeek Integration
- Add `DEEPSEEK_API_KEY` and `DEEPSEEK_API_BASE` (defaulting to official endpoint) to `.env.*`.
- Create `src/services/aiClient.ts` that wraps fetch/Taro.request to DeepSeek's chat completion (or compatible) API. The helper accepts `{ scope: 'allEvents' | 'event', events: EventItem[], prompt: string }`.
- Compose prompts:
  - Base prompt (global): summarize event categories, deduce user mood/hobbies/interests, highlight event directions.
  - Base prompt (event detail): analyze time allocation trends, record note evolution, engagement level.
  - Append user free-text prompt separated by `--- User Prompt ---` if present.
- Response normalized to `{ summary: string, suggestions?: string[], rawText: string }` to keep rendering flexible.

## Data Preparation
- Global: limit to top N (e.g., 10) events ordered by recency; include `title`, `description`, `records` (maybe up to 5 latest). Provide counts and total duration precomputed client-side to reduce tokens.
- Per-event: send all records but reduce payload by mapping to `{ date, durationMinutes, noteSnippet }` + stats (trend lines, longest streak) computed locally.

## UI Layout
### Home Page
- Add "AI 洞察" card below HeaderMeta. Tapping opens a bottom sheet overlay with:
  - Summary of events included (chips showing event names + counts).
  - Multiline input + optional placeholder "补充你的问题 (可选)".
  - Primary button "生成分析" and secondary "重置".
  - Content area showing: loading skeleton, error banner, or response card with hero title (e.g., predicted mood) and bullet insights.

### Event Detail Page
- Insert AI Insight panel above record log. Panel contains:
  - Section title + short copy: "AI 分析投入程度".
  - Prompt input inline plus "生成" button.
  - Response card similar to home but referencing the event specifically; highlight "投入指数" computed or inferred by AI.
  - Optionally persist last response per event in component state/local storage to display previous insights.

### Prompt Modal (Optional)
- For smaller screens, we can reuse the same bottom sheet component triggered from both contexts; props define scope label.

## Error/State Handling
- If no DeepSeek key configured, disable buttons with tooltip "未配置 DeepSeek".
- Show spinner + "正在召唤 DeepSeek…" while waiting.
- Errors show inline card with retry button.
- Cancel outstanding request when panel closes.

## Future Considerations
- Add caching w/ timestamps to avoid re-sending identical payloads.
- Consider background queue if DeepSeek latency is high.
