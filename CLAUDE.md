# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and other AI coding assistants when working with code in this repository.

## Build and Development Commands

### Frontend (Next.js)
- Develop: `npm run dev` - Starts dev server on port 3000
- Build: `npm run build` - Production build
- Start: `npm run start` - Production server
- Lint: `npm run lint`
- Test: `npm run test` - Runs Jest in watch mode
- Test single file: `npx jest path/to/file.test.tsx --no-watch`

### Worker (Express/Playwright)
- Develop: `cd worker && npx ts-node server.ts` - Starts on port 3001
- Start (production): `cd worker && npm run start`

## Architecture Overview

This is a modern QA automation platform (QAgent) split into two main pieces:
1. **Frontend**: A Next.js 15 application using the App Router, integrated with Supabase for backend services.
2. **Worker**: An Express/Playwright microservice that powers the autonomous AI testing.

### Key Directories
- `src/app/`: Next.js routes using App Router. Core features under `/qa-test-assistant/*`:
  - `/visual-tester` - Live autonomous AI testing interface
  - `/document-importer` - PDF to Jira ticket generation
  - `/playwright-generator` - E2E test script generation
  - `/bug-library` - Semantic search over historical bugs
- `worker/`: Express microservice with Playwright and Genkit for autonomous testing
- `src/components/`: Shadcn/Radix UI components
- `src/lib/`: Utility functions, Supabase client, schemas
- `src/hooks/`: Custom React hooks
- `src/providers/`: React context providers

### Tech Stack
- **Framework**: Next.js 15 (App Router), React 18
- **Language**: TypeScript
- **AI**: Genkit, Google Gemini (`gemini-2.5-flash`, `gemini-3.1-flash-lite`, `gemma-4-31b-it`)
- **Automation**: Playwright (chromium)
- **Backend/Database**: Supabase (Postgres, Auth, Storage, PgVector)
- **State**: TanStack Query (React Query)
- **Styling**: Tailwind CSS v3, Radix UI (Shadcn components)
- **Testing**: Jest, React Testing Library, jsdom

### Database Structure (Supabase)
Core tables:
- `test_runs`: Tracks visual tester sessions
- `visual_bugs`: Bug reports with screenshots and `pgvector` embeddings for semantic search
- `test_run_events`: Real-time event stream for live testing sessions
- `user_jira_credentials`: Jira integration tokens (using Supabase Vault extension)
- `playwright_scripts`: Stores generated E2E test scripts
- `workspaces`: Multi-user project access control
- `user_workspaces`: Workspace membership mapping

### Worker Architecture
The worker runs an autonomous AI agent that:
1. Launches Playwright browser (headless chromium)
2. Uses an AI agent with tools (navigate, click, type, getPageInfo, askUserForInput)
3. Sends real-time events via Supabase to the frontend
4. Generates embeddings for bugs using `googleai/gemini-embedding-2`
5. Falls back through model tiers: gemini-3.1-flash-lite → gemma-4-31b-it → gemma-4-26b-a4b-it

### Testing Architecture
- Jest with next/jest configuration
- Path mapping: `@/` → `src/`
- Tests located alongside components: `__tests__/page.test.tsx`
- Supports component testing with jsdom environment
