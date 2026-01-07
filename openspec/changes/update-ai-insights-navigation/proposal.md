# Change: Update AI insights to a dedicated page

## Why
The current AI insight modal is cramped and blocks context; a dedicated page improves readability and focus.

## What Changes
- Replace the home-page AI 洞察 trigger to navigate to a new AI insights page.
- Present the AI insight UI as a full page instead of a modal panel.
- Update the ai-insights spec to reflect the navigation change.
- Prompt for DeepSeek configuration on AI 洞察 entry clicks when missing.

## Impact
- Affected specs: `openspec/specs/ai-insights/spec.md`
- Affected code: `src/pages/index/index.tsx`, new `src/pages/ai-insights/*`, routing config.
