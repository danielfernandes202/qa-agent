<div align="center">
  <img src="public/globe.svg" alt="QAgent Logo" width="120" height="120" />
  
  # 🚀 QAgent (New Francis Legacy)
  
  **The Autonomous QA & Product Engineering Copilot**
  
  [![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database_&_Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
  [![Genkit & Gemini](https://img.shields.io/badge/AI-Google_Genkit_&_Gemini-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
  [![Playwright](https://img.shields.io/badge/Automation-Playwright-2EAD33?style=for-the-badge&logo=playwright)](https://playwright.dev/)
</div>

<br />

## 📖 Executive Summary

QAgent is an advanced, AI-powered Quality Assurance and Product Engineering assistant designed to bridge the gap between product requirements, manual testing, and automated E2E testing. 

By leveraging the capabilities of **Google Gemini** (via the Genkit framework) and **Playwright**, QAgent intelligently navigates web applications, translates product documents into structured Jira tickets, identifies visual and accessibility bugs autonomously, and generates robust test automation scripts with zero manual overhead.

---

## 🎯 Target Audience

QAgent is built for modern, agile development teams aiming to eliminate the bottleneck of manual quality assurance:
- **QA Engineers & SDETs**: Rapidly transition from manual test execution to automated script generation, saving hundreds of hours in Playwright scaffolding.
- **Product Managers**: Instantly convert PRDs (Product Requirements Documents) and PDFs into granular, ready-for-development Jira Epics, Stories, and Sub-tasks.
- **Developers**: Seamlessly identify visual bugs, validate links, and verify accessibility compliance (WCAG) before code hits production.

---

## 💡 The "Why" and "How"

### **The Why (The Problem)**
Traditional QA pipelines are fragmented. Product managers write requirements in isolated documents. QA engineers manually translate those into test cases. SDETs spend weeks writing brittle automation scripts. Meanwhile, visual regressions and accessibility issues slip into production because human visual verification is slow and error-prone.

### **The How (The Solution)**
QAgent centralizes the entire pipeline into a single, autonomous platform:
1. **Ingest**: It ingests PDFs and PRDs, using AI to structure them directly into your project management tools.
2. **Explore**: It uses a headless browser (Playwright) driven by an autonomous AI agent to interact with your application exactly like a real user.
3. **Analyze**: It captures DOM snapshots and screenshots, running them through multimodal AI to detect layout shifts, content errors, and accessibility violations.
4. **Automate**: It automatically generates reliable Playwright scripts based on the identified test cases and user flows.

---

## ✨ Core Functional Capabilities

### 1. 🤖 Autonomous Live Tester & Visual Analysis
Point QAgent to any URL, and it will:
- Navigate the DOM and interact with interactive elements.
- Capture pixel-perfect screenshots and DOM snapshots.
- Run multi-modal analysis to flag **Layout, Content, Design, and Accessibility** issues.
- Generate a comprehensive, severity-ranked JSON report of all visual bugs.

### 2. 📝 Document Importer -> Jira Ticket Generator
Upload product requirements (PDFs):
- QAgent's AI reads and comprehends the document context, target persona, and product goals.
- It breaks the document down into a hierarchical structure of **Epics, Stories, Tasks, and Sub-tasks**.
- Automatically drafts and pushes these tickets to your Jira board.

### 3. ⚙️ Playwright E2E Script Generator
Turn natural language or Jira acceptance criteria into executable code:
- Automatically scaffolds `playwright-test` scripts.
- Incorporates your project's custom Base URL, Authentication flows, and specific DOM selectors.
- Outputs clean, structured, and modular E2E test files.

### 4. 🛡️ Cybersecurity & Threat Analyzer
- Scans user inputs, emails, or text for potential security threats.
- Extracts Indicators of Compromise (IoCs) like malicious IPs, domains, or file hashes.
- Provides actionable mitigation recommendations.

---

## 🏗️ Technology Stack

The architecture is split into a highly responsive frontend and a robust, scalable backend worker:

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [TailwindCSS v3](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) (Shadcn components)
- **State & Data Fetching**: React Query
- **Deployment**: Vercel

### Backend & AI
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Supabase Storage)
- **Vector Search**: `pgvector` for semantic search of bugs and test cases.
- **AI Orchestration**: [Google Genkit](https://firebase.google.com/docs/genkit)
- **AI Models**: Google Gemini (`gemini-2.5-flash`, `gemini-3.1-flash-lite`, `gemma-4`)
- **Browser Automation**: [Playwright](https://playwright.dev/) running in an Express Node.js Worker

---

## 📊 Feasibility Assessment

**Technical Feasibility: High**
The application successfully integrates standard, enterprise-ready tools. The split architecture (Vercel for frontend, persistent Node.js worker for Playwright) circumvents serverless timeout limitations, ensuring long-running AI navigation tasks complete reliably.

**Operational Feasibility: High**
Supabase provides a zero-maintenance database layer with out-of-the-box authentication and storage for screenshots. The use of Gemini's highly efficient `flash` models ensures cost-effective scalability for AI operations.

**Market Feasibility: High**
As teams ship faster with AI-assisted coding tools, QA is becoming the primary bottleneck. A tool that automates the translation of requirements to tests to automation scripts perfectly aligns with current market demands for SDLC acceleration.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Project (with Postgres, Storage, and Auth enabled)
- Google Generative AI API Key

### 1. Environment Setup
Copy the example environment file and fill in your keys:
```bash
cp .env.example .env
```

### 2. Frontend Development
```bash
npm install
npm run dev
```
The dashboard will be available at `http://localhost:3000`.

### 3. Worker Setup (Playwright & AI Server)
The worker handles the heavy lifting for browser automation and AI processing.
```bash
cd worker
npm install
npx playwright install
npm run dev
```
The worker will start on `http://localhost:3001`.

---

<div align="center">
  <i>Built with ❤️ for modern engineering teams.</i>
</div>
