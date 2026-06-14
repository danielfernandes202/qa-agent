# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and other AI coding assistants when working with code in this repository.

## Build and Development Commands
- Develop Frontend: `npm run dev`
- Build Frontend: `npm run build`
- Start Frontend: `npm run start`
- Lint: `npm run lint`
- Test (watch): `npm run test`
- Start Worker: `cd worker && npx ts-node server.ts`

## Architecture Overview
This is a modern QA automation platform (QAgent) split into two main pieces:
1. **Frontend**: A Next.js 15 application using the App Router, integrated with Supabase for backend services.
2. **Worker**: An Express/Playwright microservice that powers the autonomous AI testing.

### Key Directories
- `src/app/`: Contains the Next.js routes and pages. The core application logic lives under `/qa-test-assistant` (e.g., `/visual-tester`, `/test-generator`).
- `worker/`: The backend microservice (deployed to Railway) running Playwright and Genkit. Contains the core autonomous visual tester logic (`server.ts`).
- `src/components/`: Reusable UI components (built with Radix UI and Tailwind CSS).
- `src/lib/`: Utility functions and shared library code (including Supabase schema and database utilities).
- `src/hooks/`: Custom React hooks.
- `src/providers/`: React context providers for global state.

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **AI**: Genkit, Google Generative AI (Gemini Flash/Gemma models)
- **Automation**: Playwright
- **Backend/Database**: Supabase (Postgres, Auth, Storage, PgVector)
- **Styling**: Tailwind CSS, Radix UI
- **Testing**: Jest, React Testing Library

### Database Structure
The project relies heavily on Supabase. Core tables include:
- `test_runs`: Tracks visual tester sessions.
- `visual_bugs`: Stores individual bug reports with screenshots and `pgvector` embeddings for semantic search.
- `user_jira_credentials`: Securely stores Jira integration tokens using the Supabase Vault extension.
