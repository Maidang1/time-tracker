# Project Context

## Purpose
Time Track is a cross-platform Taro mini-app for logging operational events and the time spent on each step. Users can create named events (e.g., launch prep, research sprint), record individual time blocks with notes, and review per-event analytics that highlight accumulated duration, longest stretch, and per-record comparisons. The goal is to give field or lab teams a lightweight, offline-friendly timeline of their work without requiring a backend service.

## Tech Stack
- Taro 4.1 (React renderer, Webpack 5 runner) targeting WeChat mini-programs first, with build targets for H5, Alipay, ByteDance, JD, QQ, Baidu Swan, RN, and Harmony Hybrid via `npm run build:<platform>`.
- React 18 function components with Hooks, written in strict TypeScript (`jsx: react-jsx`, alias `@/*` → `src/*`).
- Styling is authored in Sass/SCSS per page and component plus Tailwind CSS utilities (preflight disabled) compiled through `weapp-tailwindcss` + `UnifiedWebpackPluginV5` so classes emit rpx values.
- Persistence relies on the Taro storage APIs (`Taro.getStorageSync` / `setStorageSync`), keeping all event data in the client sandbox under the `blueprint_event_log` key.
- Tooling: ESLint (`taro/react` preset), Stylelint (standard config), Husky + Commitlint (Conventional Commits), and pnpm for dependency management.

## Project Conventions

### Code Style
- TypeScript everywhere (no implicit `any`, strict null checks) with React function components and hooks; avoid legacy class components.
- Follow `.editorconfig` (2-space indent, UTF-8, newline at EOF). Keep imports ordered by dependency depth (std libs → 3rd party → internal), and prefer `type`-only imports for static types.
- Use descriptive camelCase names for hooks and handlers, kebab-case file names for pages/components, and keep component props typed explicitly.
- Layout uses semantic View/Text wrappers with class names scoped via the page/component SCSS file; Tailwind utilities are acceptable for quick spacing but keep bespoke atoms in SCSS for consistency.
- Shared helpers live under `src/utils` or `src/hooks`; avoid duplicating logic per page—extract pure functions (e.g., `formatMinutes`, `calculateDurationMinutes`) and keep them side-effect free for easier testing later.

### Architecture Patterns
- Taro page modules live under `src/pages/<name>/{index.tsx,index.scss,index.config.ts}`. Keep page-specific dialogs and layouts colocated; reusable UI (headers, swipe row, etc.) belong in `src/components`.
- Cross-cutting state is local to each page. Persistence is through `eventStore.ts`, which hydrates from storage (with seeded demo data) and exposes pure helpers (`loadEvents`, `updateEvent`, `createRecord`). Consumers call these helpers then mirror the state in React.
- Hooks (e.g., `useEventData`) wrap common lifecycle patterns like `useDidShow` so every page re-synchronizes with storage when it regains focus—follow this pattern for future shared behavior.
- Styling assumes a 750px design width. Avoid DOM-specific APIs; only use Taro-compatible components/APIs so every build target stays valid. For swipe gestures, rely on `Taro.getSystemInfoSync` for responsive calculations instead of hard-coding px.
- Keep config-driven behavior in `config/*.ts` and prefer extending Taro's config rather than mutating webpack manually. Tailwind icon support is centralized in `tailwind.config.js`.

### Testing Strategy
- There is no automated test runner yet; manual verification happens through `npm run dev:weapp` (WeChat DevTools) and `npm run dev:h5` for browser previews. Always exercise event creation, editing, deletion, and analysis flows on both small and large screens.
- For logic-only utilities (time math, sorting, storage transforms), prefer to write pure functions with deterministic outputs so they can be unit tested once a runner (Jest/Vitest) is introduced.
- When fixing bugs, add regression coverage either as targeted utility tests (if a harness exists) or by expanding `src/utils` with assertions/guards so we fail fast rather than corrupt storage.
- Record manual test notes in the change proposal/tasks.md so reviewers know which device + platform were covered.

### Git Workflow
- `main` contains deployable code. Create feature branches named after the OpenSpec `change-id` (e.g., `feature/add-event-tags`) and keep the proposal + implementation tied to that branch.
- Husky runs Commitlint on `commit-msg`; commits must follow Conventional Commits (`feat:`, `fix:`, `chore:`…) so they satisfy CI hooks and make change logs scannable.
- Each change starts with an OpenSpec proposal (`openspec/changes/<id>/…`). Do not merge until the proposal is approved and every task in `tasks.md` is checked off.
- Rebase (or `git pull --rebase`) to keep history linear; squash only if it keeps the OpenSpec change easy to trace. Reference the change-id in PR descriptions.

## Domain Context
- The app tracks real-world missions or research work that is naturally split into discrete "events" (projects) and per-event "records" (time slices). Each record stores a date, start/end times, computed duration, and an optional annotation.
- Event data is intentionally offline/local-only: no backend sync exists, so destructive actions (delete event/record) must confirm intent because recovery is impossible without backups.
- Analytics surfaces (event detail → analysis page) assume records are stored in reverse chronological order and rely on durations computed in minutes. Any change that alters calculations must keep `formatMinutes` usage consistent so UI stays human-readable.
- Default seed data (Launch Preparation, Research Sprint) is meant as demo content; treat it as fixtures when altering the storage shape.

## Important Constraints
- Must remain compatible with multiple mini-program targets; avoid DOM APIs, Node-specific modules, or unpolyfilled browser features. Stick to Taro components/APIs that work in WeChat, H5, and RN builds.
- Storage quota is limited on mini-program platforms; keep each event/record lean (no binary blobs, minimal nested objects) and prune unused fields.
- `weapp-tailwindcss` rewrites Tailwind classes to rpx—class names not supported by the plugin will be dropped. Prefer static class names over dynamic string concatenation so the plugin can detect them.
- UI layouts assume a design width of 750 and rely on `rpx`; do not hardcode px values without verifying the `rem2rpx` conversion path.
- No backend auth or networking: all sensitive information must stay on-device, and we cannot rely on remote feature flags or server migrations.

## External Dependencies
- **@tarojs/** packages: runtime, components, CLI, and platform plugins that supply cross-platform UI primitives, storage APIs, navigation, and multi-target builds.
- **weapp-tailwindcss** (`UnifiedWebpackPluginV5` and `postinstall` patch) that enables Tailwind utility classes inside mini-program style scopes.
- **Tailwind CSS + @egoist/tailwindcss-icons** for design tokens and icon fonts compiled at build time.
- **Husky + Commitlint** to enforce Conventional Commit messages on every commit via the `.husky/commit-msg` hook.
- **ESLint + Stylelint** to keep TypeScript/React code and SCSS consistent with the project's style baselines.
