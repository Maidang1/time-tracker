# Chrono Pulse - Cross-Platform Event Logger

Chrono Pulse is a cross-platform event tracker built with Taro + React. It can run on multiple platforms including WeChat Mini Programs, H5, and other cross-end platforms to help users track events and time investment for each record.

## Project Overview

- **Name**: Chrono Pulse (时光脉搏)
- **Framework**: Taro v4.1.5 + React
- **Language**: TypeScript
- **Target Platforms**: WeChat Mini Program, H5, and multiple other cross-platform targets
- **Purpose**: An event logging application that tracks user activities and time investments
- **Data Storage**: WeChat Cloud Development (Tencent's BaaS solution)

## Architecture & Technologies

The project leverages the Taro framework which enables write-once-run-anywhere functionality across multiple platforms. Key technologies include:

- **Runtime Dependencies**:
  - React 18 for UI components
  - Taro framework for cross-platform compatibility
  - WeChat Cloud Development SDK for backend services
- **Dev Dependencies**:
  - TypeScript for type safety
  - TailwindCSS for styling with custom icon plugin
  - ESLint for code linting
  - Husky and lint-staged for Git hooks
  - Commitlint for conventional commit messages

## Data Model

### EventItem
- `id`: Numeric business identifier
- `title`: Event title
- `description`: Event description
- `createdAt`: ISO 8601 timestamp
- `updatedAt`: Optional update timestamp
- `records`: Array of EventRecord objects

### EventRecord
- `id`: Numeric identifier
- `startDate`, `endDate`: Date strings (YYYY-MM-DD)
- `startTime`, `endTime`: Time strings (HH:mm)
- `durationMinutes`: Duration in minutes
- `note`: Textual notes
- `createdAt`: ISO 8601 creation timestamp

## AI Integration

The application includes DeepSeek AI integration for insights generation:
- **GLOBAL_INSIGHT_INSTRUCTION**: Analyzes multiple events to determine types/directions, infer mood/prefrences/hobbies, and provide recommendations
- **EVENT_INSIGHT_INSTRUCTION**: Analyzes individual events focusing on duration changes, note trends, and engagement levels
- API configuration is managed through environment variables (DEEPSEEK_API_KEY, DEEPSEEK_API_BASE, DEEPSEEK_MODEL)

## Building and Running

### Prerequisites
- Node.js and pnpm installed

### Setup
```bash
pnpm install
```

### Development
```bash
pnpm run dev:weapp    # For WeChat Mini Program development
pnpm run dev:h5       # For H5 development
```

### Production Build
```bash
pnpm run build:weapp  # For WeChat Mini Program build
pnpm run build:h5     # For H5 build
```

## Testing

AI functionality can be tested with:
```bash
pnpm run test:ai
```

## Development Structure

The application follows Taro's standard directory structure:
- `src/pages/` - Application pages (index, event detail, AI insights, etc.)
- `src/components/` - Reusable UI components
- `src/services/` - Backend services (Cloud DB integration)
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions (AI prompts, data processing)
- `src/types/` - TypeScript type definitions

## Cloud Development Integration

The application uses WeChat Cloud Development for backend services:
- Automatic user identification (_openid)
- Secure data isolation between users
- Cloud functions, storage, and database capabilities
- Environment configured via CLOUD_ENV_ID variable

## Special Features

1. **Cross-Platform Compatibility**: Single codebase targeting multiple platforms
2. **AI-Powered Insights**: DeepSeek integration for analyzing user activities
3. **Secure Data Storage**: Automatic user-based data access control
4. **Time Tracking**: Detailed duration tracking with notes
5. **Responsive UI**: Using TailwindCSS with icon integration

## Environment Configuration

Key environment variables are stored in .env files:
- `DEEPSEEK_API_KEY` - DeepSeek API key for AI features
- `DEEPSEEK_API_BASE` - API endpoint (default: https://api.deepseek.com)
- `DEEPSEEK_MODEL` - Model name (default: deepseek-chat)
- `CLOUD_ENV_ID` - WeChat cloud development environment ID

## Development Conventions

- Uses TypeScript for type safety
- Follows Taro conventions for cross-platform development
- Leverages React hooks for state management
- Utilizes TailwindCSS utility classes for styling
- Implements conventional commits with commitlint
- Uses Husky for Git hooks to enforce code quality

This project serves as a great example of a modern cross-platform application leveraging cloud services and AI integration for enhanced user experience.