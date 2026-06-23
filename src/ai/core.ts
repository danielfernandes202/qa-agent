import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Global Genkit instance configured for production use.
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-3.1-flash-lite',
});

/**
 * Centralized array of fallback models in order of preference.
 */
export const FALLBACK_MODELS = [
  'googleai/gemini-3.1-flash-lite',
  'googleai/gemma-4-31b-it',
  'googleai/gemma-4-26b-a4b-it',
  'googleai/gemini-2.5-flash'
];

/**
 * Executes a Genkit generation with sequential fallback across multiple models.
 */
export async function generateWithFallback(options: any, logInternal?: (msg: string) => void) {
  for (const model of FALLBACK_MODELS) {
    try {
      if (logInternal) logInternal(`Attempting model: ${model}`);
      const res = await ai.generate({ ...options, model });
      if (logInternal) logInternal(`Successfully used model: ${model}`);
      return res;
    } catch (e: any) {
      const errDetails = e.detail ? JSON.stringify(e.detail) : e.message;
      if (logInternal) logInternal(`Model ${model} failed with error: ${errDetails}`);
      console.warn(`Model ${model} failed:`, e);
    }
  }

  // If we reach here, all models failed
  throw new Error('All AI models failed to generate content or timed out. Please try again.');
}

/**
 * Executes an arbitrary AI prompt function with sequential fallback.
 * Useful for the frontend flows where we wrap prompts.
 */
export async function executeWithFallback<Input, Output>(
  promptFn: (input: Input, opts?: { model?: string }) => Promise<{ output?: Output | null }>,
  input: Input
): Promise<Output> {
  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`Attempting model: ${model}`);
      const res = await promptFn(input, { model });
      if (res.output) {
        console.log(`Successfully used model: ${model}`);
        return res.output;
      }
    } catch (e) {
      console.warn(`Model ${model} failed:`, e);
    }
  }

  throw new Error('All AI models failed to generate content or timed out. Please try again.');
}
