import { ai } from '@/ai/genkit';

async function main() {
    console.log("Embedding...");
    try {
        const result = await ai.embed({
            embedder: 'googleai/text-embedding-004',
            content: 'Hello, testing semantic search!'
        });
        
        console.log("Keys:", Object.keys(result));
        if (Array.isArray(result)) {
             console.log("It's an array of length", result.length);
             if (result.length > 0) console.log("Vector length:", result[0].length);
        } else {
             console.log("It's an object");
             // Inspect properties
             for (const key of Object.keys(result)) {
                const val = (result as any)[key];
                if (Array.isArray(val)) {
                    console.log(`Property ${key} is an array of length ${val.length}`);
                }
             }
             // Genkit usually returns a single embedding as an array of floats, or an object with an `embedding` property.
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

main();
