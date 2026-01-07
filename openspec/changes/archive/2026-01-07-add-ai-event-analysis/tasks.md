## 1. Planning & UI
- [x] 1.1 Validate requirements with product (global vs detail AI insights, prompt UX) and confirm DeepSeek API availability (key/env names).
- [x] 1.2 Produce low-fidelity layout for home AI Insights drawer/panel and event detail AI section, including prompt input placement and response cards.

## 2. DeepSeek Service Layer
- [x] 2.1 Add env/config plumbing for DeepSeek endpoint + key, including fallbacks for dev builds.
- [x] 2.2 Implement a typed service helper that accepts request context (all events vs single event), merges base prompt + user prompt, calls DeepSeek, and normalizes responses/errors.
- [x] 2.3 Write unit tests (or stub harness) for prompt construction and error normalization.

## 3. Home Page AI Insights
- [x] 3.1 Add UI entry (button/card) on `pages/index` that opens the AI analyzer panel.
- [x] 3.2 Implement the panel with prompt input, selected events summary, loading/response states, and DeepSeek invocation using aggregated event data (title, description, records snapshot).
- [x] 3.3 Handle errors, retries, and empty state messaging.

## 4. Event Detail AI Insights
- [x] 4.1 Add AI analysis section near record list header with short description + prompt input trigger.
- [x] 4.2 When invoked, send the specific event's full records (including duration deltas and notes) plus optional user prompt to DeepSeek and render analysis focusing on engagement/investment.
- [x] 4.3 Ensure UI handles navigation away / repeated calls, and caches the latest response per event to avoid re-fetch.

## 5. QA & Docs
- [x] 5.1 Document configuration steps for DeepSeek (readme or env sample) and guard missing keys by disabling AI entry with tooltip.
- [ ] 5.2 Manually test on WeChat devtools + H5 for both all-events and per-event analyses, covering success/error states.
- [x] 5.3 Update OpenSpec change with implementation notes and confirm requirements satisfied.
