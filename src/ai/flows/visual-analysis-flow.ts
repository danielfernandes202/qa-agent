'use server';
/**
 * @fileOverview An AI-powered visual analysis flow for web UI.
 *
 * - analyzeVisuals - A function that analyzes a screenshot for UI/UX and accessibility issues.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { VisualAnalysisInput, VisualAnalysisOutput } from '@/lib/schemas';
import { VisualAnalysisInputSchema, VisualAnalysisOutputSchema } from '@/lib/schemas';
import { executeWithFallback } from '@/ai/fallback';

export async function analyzeVisuals(input: VisualAnalysisInput): Promise<VisualAnalysisOutput> {
  return visualAnalysisFlow(input);
}

const visualAnalysisPrompt = ai.definePrompt({
    name: 'visualAnalysisPrompt',
    input: { schema: VisualAnalysisInputSchema },
    output: { schema: VisualAnalysisOutputSchema },
    prompt: `You are a world-class UI/UX and Quality Assurance expert with a specialization in Web Content Accessibility Guidelines (WCAG). Your task is to meticulously analyze the provided webpage screenshot and identify any visual, user experience, or accessibility issues. Be thorough and act as if you are a meticulous human tester.

Analyze this screenshot for the page at {{pageUrl}}:
{{media url=screenshotDataUri}}

Instructions:
1.  **Examine the Layout**: Look for any layout problems such as overlapping elements, broken grids, inconsistent spacing or alignment, or elements that might be outside the viewport boundaries on common screen sizes.
2.  **Check Content**: Identify any content issues. This includes placeholder text (like "Lorem Ipsum"), missing or broken images, truncated text, or large empty content areas that seem unintentional.
3.  **Review Design Consistency**: Check for inconsistencies in the design system. Do fonts, colors, button styles, or spacing vary in a way that seems unintentional or unprofessional?
4.  **Assess Accessibility (WCAG Focus)**: From a visual standpoint, identify potential accessibility issues based on WCAG 2.1 AA criteria.
    *   **Color Contrast**: Check for poor color contrast between text and its background (violates WCAG 1.4.3). Note any text that appears difficult to read.
    *   **Text Legibility**: Identify any text that is too small to be easily readable.
    *   **Touch Target Size**: Assess if interactive elements like buttons and links appear to be at least 44x44 CSS pixels in size, with sufficient spacing to prevent accidental taps (violates WCAG 2.5.5).
    *   **Missing Form Labels**: Look for form inputs (text fields, checkboxes, etc.) that do not have a visible text label.
    *   **Text in Images**: Identify any important text that is part of an image rather than being actual text content (violates WCAG 1.4.5).
    *   **Clear Focus Indicators**: While a static image can't show focus, note if any element looks like it has a very subtle or non-existent focus state that would be hard to see.
5.  **Formulate Issues**: For each problem you identify, create a structured issue object. Each issue must have:
    *   \`id\`: A unique string identifier (e.g., "issue-1", "issue-2").
    *   \`type\`: Classify the issue as 'layout', 'content', 'design', or 'accessibility'.
    *   \`severity\`: Rate the severity as 'low', 'medium', 'high', or 'critical'.
    *   \`title\`: A concise, clear title for the problem.
    *   \`description\`: A detailed description explaining the problem and its potential impact on the user experience. Mention the relevant WCAG principle if applicable.
    *   \`element\`: If you can reasonably infer a CSS selector for the problematic element, provide it. Otherwise, omit this field.
    *   \`suggestions\`: Provide a list of clear, actionable suggestions to fix the problem.

Your entire response must be a single JSON object that is an array of these issue objects. If you find no issues, return an empty array.
`,
});

const visualAnalysisFlow = ai.defineFlow(
  {
    name: 'visualAnalysisFlow',
    inputSchema: VisualAnalysisInputSchema,
    outputSchema: VisualAnalysisOutputSchema,
  },
  async (input) => {
    try {
      return await executeWithFallback(visualAnalysisPrompt, input);
    } catch (e) {
      console.warn('AI analysis returned no output or failed:', e);
      return [];
    }
  }
);
