# Product Requirements Document: QAgent

## Overview

**Product Name:** QAgent  
**Tagline:** The Autonomous QA & Product Engineering Copilot  
**Version:** 1.0  
**Last Updated:** June 2026

---

## Problem Statement

Modern software teams face a critical bottleneck: **testing cannot keep pace with development**.

- QA Engineers spend 60-80% of their time on repetitive manual testing and test maintenance
- Product Managers lose hours extracting actionable tickets from PRDs
- Developers ship code with unknown visual/accessibility regressions
- Existing test automation tools require heavy setup and maintenance overhead

**QAgent solves this by automating the entire QA lifecycle** — from requirement extraction to test execution — allowing teams to ship faster with confidence.

---

## Target Users

| Persona | Role | Primary Pain Point |
|---------|------|-------------------|
| **QA Engineer / SDET** | Builds and maintains test automation | Script creation is tedious; maintenance is expensive |
| **Product Manager** | Defines requirements, manages backlog | Converting PRDs to tickets is manual and error-prone |
| **Frontend Developer** | Builds UI features | Visual regressions slip through to production |

---

## Core User Journeys

### Journey 1: Visual Testing (QA Engineer)
1. User enters target URL and sets parameters (browsers, viewport, depth)
2. QAgent launches an autonomous AI agent via Playwright
3. AI navigates the application, identifies UI elements, and interacts with forms
4. On uncertainty, AI pauses and asks for human input ("Human-in-the-Loop")
5. Detected bugs are logged with screenshots, embeddings, and severity scores
6. User reviews findings and exports to Jira or downloads reports

**Outcome:** Complete visual coverage without writing a single test case manually.

### Journey 2: Document to Jira (Product Manager)
1. User uploads a PRD (PDF/Word)
2. AI extracts requirements, acceptance criteria, and user stories
3. Structured Jira tickets (Epics, Stories, Sub-tasks) are generated
4. User reviews, edits, and pushes directly to Jira

**Outcome:** Hours of manual ticket creation reduced to minutes.

### Journey 3: Test Generation from Requirements (SDET)
1. User pastes requirements or selects Jira tickets
2. AI generates Playwright test scripts with proper selectors and assertions
3. Scripts are validated for correctness
4. User downloads or commits to repository

**Outcome:** Production-ready E2E tests generated in seconds.

### Journey 4: Bug Library Search (QA Team)
1. User searches past bugs using natural language ("login issues on mobile")
2. Semantic search via pgvector finds semantically similar issues
3. Team learns from historical patterns

**Outcome:** Institutional knowledge preserved and searchable.

---

## Feature Status

| Feature | Description | Status | Milestone |
|---------|-------------|--------|-----------|
| Visual AI Tester | Autonomous Playwright agent with live interaction | ✅ Live | v1.0 |
| Document Importer | PRD to Jira ticket extraction | ✅ Live | v1.0 |
| Playwright Generator | E2E test code generation | ✅ Live | v1.0 |
| Bug Library | Semantic bug search with embeddings | ✅ Live | v1.0 |
| Jira Integration | OAuth + ticket creation API | ✅ Live | v1.0 |
| Cybersecurity Scanner | OWASP vulnerability analysis | 🚧 Planned | v1.2 |
| Accessibility Audit | WCAG compliance checking | 🚧 Planned | v1.2 |
| Multi-tenant SaaS | Team workspaces | 📝 Backlog | v2.0 |

---

## Success Metrics

### Primary KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Test case creation time** | 80% reduction | Compare manual vs AI-generated |
| **PRD to ticket conversion** | < 5 minutes per document | Time from upload to Jira |
| **Visual bug detection rate** | > 90% recall | Manual audit of AI findings |

### Secondary KPIs
- Playwright script execution success rate (> 95%)
- Human-in-the-loop approval rate (< 20% of actions)
- Time-to-first-test for new users (< 10 minutes)

---

## Design Principles

- **Speed is a feature:** Interactions must feel instantaneous (< 300ms)
- **Function over decoration:** Data density serves workflow; avoid decorative slop
- **Clear affordances:** Buttons feel tactile (`scale(0.98)` on active)
- **Progressive disclosure:** Complex features reveal themselves when needed
- **AI transparency:** Users understand what the AI is doing and why

## Brand Personality

**Precise, modern, technical, and efficient.**

QAgent should feel like a senior QA engineer paired with a senior frontend developer — opinionated, knowledgeable, but collaborative.

## Anti-references

- Clunky, high-density 2000s enterprise testing dashboards (legacy ALM tools)
- Generic AI "purple/cyan glow" landing pages with infinite marquees
- Falsely complex tech-bro bento grids that lack rhythm

---

## Accessibility & Inclusion

- WCAG AA minimum contrast for all text, forms, and interactive elements
- Honor `prefers-reduced-motion` for all animations
- Keyboard-navigable UI throughout
- Screen reader compatible status updates

---

## Out of Scope (v1.0)

To maintain focus, the following are explicitly **not** included in v1.0:

- Mobile app testing (iOS/Android native)
- API/integration testing (REST/GraphQL)
- Performance/load testing
- Video recording of test sessions
- Team collaboration features (comments, @mentions)
- Custom AI model training
- Self-hosted deployment option

---

## Roadmap

### v1.0 (Current)
- Visual AI Tester
- Document Importer
- Playwright Generator
- Bug Library
- Jira Integration

### v1.1 (Next 4 weeks)
- Enhanced error reporting
- Test run history and analytics
- Better selector strategies for Playwright

### v1.2 (Next 8 weeks)
- Cybersecurity Scanner
- Accessibility Audit (WCAG)
- Improved human-in-the-loop UX

### v2.0 (Future)
- Multi-tenant SaaS with team workspaces
- CI/CD pipeline integration
- Custom testing workflows
- Enterprise SSO (SAML, OIDC)

---

## Technical Notes

- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, Supabase
- **Worker:** Express, Playwright, Genkit, Google Gemini
- **Database:** Postgres with pgvector, Supabase Auth, Vault for secrets
- **Deployment:** Railway (worker), Vercel (frontend)

---

## Register

Product is in active development. See README.md for getting started.
