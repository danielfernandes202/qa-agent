import * as dotenv from 'dotenv';
dotenv.config();
import { ai } from './src/ai/genkit';

async function main() {
    console.log("Using API KEY:", process.env.GEMINI_API_KEY ? "YES" : "NO");
    try {
        console.log("Testing gemini-3.1-flash-lite...");
        const res = await ai.generate({
            model: 'googleai/gemini-3.1-flash-lite',
            prompt: 'Reply with "HELLO"'
        });
        console.log("SUCCESS:", res.text);
    } catch (e: any) {
        console.error("ERROR testing gemini-3.1-flash-lite:", e.message);
    }

    try {
        console.log("Testing gemini-1.5-flash...");
        const res2 = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: 'Reply with "HELLO"'
        });
        console.log("SUCCESS:", res2.text);
    } catch (e: any) {
        console.error("ERROR testing gemini-1.5-flash:", e.message);
    }
}

main();
