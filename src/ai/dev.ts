
'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-test-cases.ts';
import '@/ai/flows/draft-jira-bug-flow.ts';
import '@/ai/flows/generate-playwright-code.ts';
import '@/ai/flows/analyze-document-flow.ts';
import '@/ai/flows/health-fitness-flow.ts';
import '@/ai/flows/investment-advisor-flow.ts';
import '@/ai/flows/generate-image-flow.ts';
import '@/ai/flows/interview-cracker-flow.ts';
import '@/ai/flows/mock-interview-flow.ts';
import '@/ai/flows/resume-builder-flow.ts';
