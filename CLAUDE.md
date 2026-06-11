# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands
- Develop: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Test (watch): `npm run test`
- Test (single): `npx jest <path-to-file>`

## Architecture Overview
This is a Next.js 15 application using the App Router, integrated with Firebase and Genkit for AI capabilities.

### Key Directories
- `src/app/`: Contains the application routes and pages. Many routes (e.g., `/culinary-assistant`, `/cybersecurity-analyzer`) are specialized AI tools.
- `src/ai/`: Centralized AI logic using Genkit.
    - `genkit.ts`: Genkit initialization and configuration.
    - `flows/`: AI workflows and specialized logic.
- `src/components/`: Reusable UI components (built with Radix UI and Tailwind CSS).
- `src/lib/`: Utility functions and shared library code.
- `src/hooks/`: Custom React hooks.
- `src/providers/`: React context providers for global state.
- `src/context/` & `src/contexts/`: State management contexts.

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **AI**: Genkit, Google Generative AI
- **Backend/Database**: Firebase (Firestore, Auth)
- **Styling**: Tailwind CSS, Radix UI
- **Testing**: Jest, React Testing Library
