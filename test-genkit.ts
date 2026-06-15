import { ai } from './src/ai/genkit.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const modelsToTest = [
    'googleai/gemini-1.5-flash-latest',
    'googleai/gemini-1.5-flash-001',
    'googleai/gemini-1.5-flash-002',
    'googleai/gemini-2.0-flash',
    'googleai/gemini-2.5-flash',
    'googleai/gemini-1.5-pro'
  ];

  for (const model of modelsToTest) {
    try {
      console.log(`Testing ${model}...`);
      const res = await ai.generate({
        model,
        prompt: 'Hello',
      });
      console.log(`Success with ${model}:`, res.text);
      break;
    } catch (e: any) {
      console.error(`Failed ${model}:`, e.message);
    }
  }
}

run();
