/**
 * @fileOverview Utility for executing AI prompts with a sequential fallback strategy.
 */

export async function executeWithFallback<Input, Output>(
  promptFn: (input: Input, opts?: { model?: string }) => Promise<{ output?: Output | null }>,
  input: Input
): Promise<Output> {
  const models = [
    'googleai/gemini-3.1-flash-lite',
    'googleai/gemma-4-31b-it',
    'googleai/gemma-4-26b-a4b-it',
    'googleai/gemini-2.5-flash'
  ];

  for (const model of models) {
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

  // If execution reaches here, all models failed
  throw new Error('All AI models failed to generate content or timed out. Please try again.');
}
