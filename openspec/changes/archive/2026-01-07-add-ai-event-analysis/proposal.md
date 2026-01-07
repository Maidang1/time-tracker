## Why
- Users want AI-assisted insights about their activity across all events to understand trends, moods, and interests without manually compiling data.
- Single-event detail pages need richer interpretation of record trends (duration patterns, note themes) to judge engagement level.
- The AI analyses must leverage DeepSeek as the large language model and allow users to augment prompts interactively.

## What Changes
- Add an "AI Insights" entry point on the home page that summarizes all stored events, emphasizing event types/directions and inferring user mood/hobbies.
- Extend the event detail page with an AI section that analyzes that event's records (duration changes, note evolution) to gauge engagement, combining system prompts with optional user-entered prompt text.
- Provide an inline prompt input so users can append their own instructions before invoking either analysis, and display structured AI responses with attribution (DeepSeek) and loading/error states.
- Wire both UIs to a shared DeepSeek service wrapper that packages relevant event data plus user prompt into the model request.

## Impact
- Introduces DeepSeek API configuration (keys, endpoint) and runtime dependency; needs secure storage via env variables.
- Adds new UI components for AI request states (input, chip summary, skeleton) on index and event detail pages.
- Requires new specs for AI insight capability and testing around prompt combination and failure handling.
- Potentially increases bundle size and runtime latency; gating or caching may be needed later.
