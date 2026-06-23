# Refactoring Plan

## 1. Run-State Machine
The agent loop will be refactored into an explicit state machine with the following states and transitions:
- **planned**: Initial state when a test run is queued.
  - *Trigger*: `POST /api/live-tester` initializes the session. Transitions to `exploring`.
- **exploring**: The agent is actively interacting with the page and generating tool calls.
  - *Trigger*: Navigates to target URL or receives a tool result.
  - *Transition*: Can loop back to `exploring` (after standard tool execution), transition to `awaiting_input` (if user input is needed), or `judging` (if the LLM concludes the test or hits `maxActions`).
- **awaiting_input**: The agent pauses and waits for user intervention (e.g., OTP, CAPTCHA).
  - *Trigger*: `askUserForInputTool` is called.
  - *Transition*: Transitions back to `exploring` when `POST /api/live-tester/:sessionId/input` provides the required input or the wait times out.
- **judging**: Evaluating the gathered screenshots and data to determine if bugs are present.
  - *Trigger*: `maxActions` reached or agent attempts to finalize output. Transitions to `reporting`.
- **reporting**: Formatting the final output JSON and saving visual bug embeddings.
  - *Trigger*: The final schema matches or fallback summary prompt succeeds. Transitions to `done`.
- **done** / **failed**: Terminal states.
  - *Trigger*: Reached after successful upload to Supabase (`done`), or immediately upon session abort/fatal error (`failed`).

## 2. Guardrail Interface
We will introduce a single pre-execution guardrail hook that runs before every tool call is dispatched to the Playwright browser.
- **Function Signature**: `async function checkGuardrails(toolName: string, args: any, sessionState: SessionState): Promise<void>`
- **Intent**: Centralizes safety and boundary checks (e.g., ensuring navigation stays within the allowed target domain, preventing repetitive loops). If the guardrail fails, it throws an error that is fed back to the LLM as a rejected tool execution, preventing bad state mutations.

## 3. Central Model Config
We will unify the currently duplicated model configurations into a single shared module accessible by both the frontend and the worker.
- **Module**: Create a central file (e.g. in `src/ai/core.ts` or a shared `packages` lib) that initializes Genkit.
- **Shared Logic**: It will export a single `generateWithFallback` function, centralizing the model array (`gemini-3.1-flash-lite` -> `gemma-4-31b-it`, etc.) and the embedding model (`gemini-embedding-2`). The worker's `generateWithFallback` and `src/ai/flows` will all import this single source of truth.
