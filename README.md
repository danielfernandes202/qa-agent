# QAgent

QAgent is an autonomous QA testing assistant designed for modern development teams. It leverages the power of AI (Genkit & Google Gemini models) and headless browser automation (Playwright) to intelligently explore web applications, identify visual and functional bugs, and generate robust test automation scripts.

## Features

- **Autonomous Visual Tester**: Point the agent to a URL, and it will navigate the page, interact with elements, identify layout/accessibility/content bugs, take screenshots, and compile a final JSON report automatically.
- **Playwright Test Generator**: Automatically generate end-to-end Playwright automation scripts from natural language requirements or Jira tickets.
- **Supabase Backend Integration**: Securely stores visual bug reports, test run metadata, screenshots, and PgVector embeddings for semantic bug search.

## Architecture

- **Frontend**: Next.js 15 (App Router), deployed on Vercel.
- **Worker**: Express server running Playwright and Genkit AI logic, deployed on Railway.
- **Database & Auth**: Supabase (Postgres, Storage, Auth, and PgVector).

## Getting Started

### Local Development (Frontend)
```bash
npm install
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### Local Development (Playwright Worker)
Ensure you have playwright installed locally.
```bash
cd worker
npm install
npx ts-node server.ts
```
The worker runs on `http://localhost:3001` by default.

### Environment Setup
Make sure you copy `.env.example` to `.env` (or `.env.local`) and fill in your Supabase URLs, keys, and Google AI API keys.
