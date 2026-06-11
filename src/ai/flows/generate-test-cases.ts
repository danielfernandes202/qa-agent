'use server';

/**
 * @fileOverview AI flow for generating comprehensive QA test cases.
 *
 * This file defines the Genkit flow and prompt used to analyze Jira ticket
 * descriptions and acceptance criteria to produce structured test cases.
 *
 * - generateTestCases: A server function that wraps the AI flow.
 * - GenerateTestCasesInput: Input schema containing ticket details.
 * - GenerateTestCasesOutput: Output schema containing an array of test cases.
 */

import {ai} from '@/ai/genkit';
import { GenerateTestCasesInputSchema, GenerateTestCasesOutputSchema, type GenerateTestCasesInput, type GenerateTestCasesOutput } from '@/lib/schemas';
import { executeWithFallback } from '@/ai/fallback';


export async function generateTestCases(input: GenerateTestCasesInput): Promise<GenerateTestCasesOutput> {
  return generateTestCasesFlow(input);
}

const generateTestCasesPrompt = ai.definePrompt({
  name: 'generateTestCasesPrompt',
  input: {schema: GenerateTestCasesInputSchema},
  output: {schema: GenerateTestCasesOutputSchema},
  prompt: `You are an expert test case generator for Jira tickets. Your task is to generate a comprehensive set of test cases based on the provided Jira ticket description and acceptance criteria. 

The user has requested a coverage level of: {{coverageLevel}}. 
Based on this level, strictly follow these coverage guidelines:
- Basic: Generate 3-5 test cases. Focus ONLY on the primary happy paths and critical negative paths.
- Standard: Generate 6-10 test cases. Include happy paths, common negative paths, and 1-2 important edge cases.
- End-to-End: Generate 10-15 test cases. Include full user journey flows, integration points, and UI/UX checks.
- Max: Generate 15-25 test cases. Provide comprehensive edge cases, data validation, boundary testing, and negative testing.
- XMax: Generate 25+ test cases. Provide the absolute maximum number of possible scenarios, including extreme edge cases, security considerations, accessibility, performance, and boundary logic.

Each test case must include the following fields:
- testCaseId: A unique identifier for the test case, following the format "{{projectKey}}-TEST-XXX" where XXX is a padded number (e.g., JIRA-TEST-001, JIRA-TEST-002).
- testCaseName: A concise, descriptive name for the test case, summarizing the action and expected outcome.
- description: A one-sentence summary of the test case's goal.
- precondition: The state or setup required before executing the test case (e.g., "User is logged in and on the dashboard page."). Can be "None" if not applicable.
- testSteps: A clear, ordered list of steps to execute the test case.
- expectedResult: A detailed description of the expected outcome after executing the test steps.
- actualResult: Leave this field blank.
- status: Leave this field blank.

Here is the Jira ticket information:
- Project Key: {{projectKey}}
- Description: {{{description}}}
- Acceptance Criteria: {{{acceptanceCriteria}}}

Based on this information, generate a complete list of test cases that satisfies the {{coverageLevel}} coverage level. Be thorough and think about different user scenarios. The output must be a JSON array of test case objects.
`,
});

const generateTestCasesFlow = ai.defineFlow(
  {
    name: 'generateTestCasesFlow',
    inputSchema: GenerateTestCasesInputSchema,
    outputSchema: GenerateTestCasesOutputSchema,
  },
  async input => {
    // Start all requests concurrently in the background
    const p1 = generateTestCasesPrompt(input, { model: 'googleai/gemini-3.1-flash-lite' });
    const p2 = generateTestCasesPrompt(input, { model: 'googleai/gemma-4-31b-it' });
    const p3 = generateTestCasesPrompt(input, { model: 'googleai/gemma-4-26b-a4b-it' });

    // Wait for the primary model. If it succeeds, return immediately without waiting for the slower models.
    try {
        const res1 = await p1;
        if (res1.output) {
            console.log("Using primary model: gemini-3.1-flash-lite");
            return res1.output;
        }
    } catch (e) {
        console.warn("Primary model failed, falling back to secondary model: gemma-4-31b-it");
    }

    // Since p2 started at the exact same time as p1, if p1 failed after 2 seconds, 
    // p2 has already been running for 2 seconds. We just wait for it to finish.
    try {
        const res2 = await p2;
        if (res2.output) {
            console.warn("Using secondary model: gemma-4-31b-it");
            return res2.output;
        }
    } catch (e) {
        console.warn("Secondary model failed, falling back to tertiary model: gemma-4-26b-a4b-it");
    }

    // Wait for the tertiary model
    try {
        const res3 = await p3;
        if (res3.output) {
            console.warn("Using tertiary model: gemma-4-26b-a4b-it");
            return res3.output;
        }
    } catch (e) {
        console.error("Tertiary model failed:", e);
    }

    // If execution reaches here, all models failed
    throw new Error("All AI models failed to generate test cases or timed out. Please try again.");
  }
);
