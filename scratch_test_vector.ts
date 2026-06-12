import { config } from 'dotenv';
config({ path: '.env' }); // Load Next.js environment variables

async function runTest() {
    console.log("=== Testing Vector Search and PgVector ===");
    
    // Dynamically import to ensure dotenv is applied first
    const { ai } = await import('./src/ai/genkit');
    const { supabase } = await import('./src/lib/supabase');
    const { searchSimilarBugs } = await import('./src/app/actions/vector-search');

    console.log("0. Authenticating...");
    const email = `test_${Date.now()}@example.com`;
    await supabase.auth.signUp({ email, password: "password123" });
    await supabase.auth.signInWithPassword({ email, password: "password123" });
    
    // 1. Create a dummy test run
    console.log("1. Creating dummy test_run...");
    const { data: runData, error: runError } = await supabase
        .from('test_runs')
        .insert([{ tests_performed: 1 }])
        .select('id')
        .single();
        
    if (runError) {
        console.error("Failed to create test_run:", runError.message);
        return;
    }
    const runId = runData.id;
    console.log("Created test_run:", runId);

    const { textEmbedding004 } = await import('@genkit-ai/google-genai');

    // 2. Generate embedding for a dummy bug
    console.log("2. Generating embedding for dummy bug...");
    const bugDescription = "The main navigation header overlaps with the hero section on mobile viewports.";
    const embedResponse = await ai.embed({
        embedder: 'googleai/gemini-embedding-2',
        content: bugDescription
    });

    console.log("Embed Response structure:", JSON.stringify(embedResponse, null, 2));

    let vector: number[] | null = null;
    if (Array.isArray(embedResponse)) {
        if (typeof embedResponse[0] === 'number') {
            vector = embedResponse as number[];
        } else if (embedResponse[0] && Array.isArray((embedResponse[0] as any).embedding)) {
            vector = (embedResponse[0] as any).embedding;
        }
    } else if (embedResponse && Array.isArray((embedResponse as any).embedding)) {
        vector = (embedResponse as any).embedding;
    } else if (embedResponse && Array.isArray((embedResponse as any).values)) {
        vector = (embedResponse as any).values;
    }

    if (!vector) {
        console.error("Could not generate vector for dummy bug.");
        return;
    }
    const vectorStr = `[${vector.join(',')}]`;

    // 3. Insert the dummy bug into visual_bugs
    console.log("3. Inserting dummy visual_bug...");
    const { error: bugError } = await supabase.from('visual_bugs').insert([{
        test_run_id: runId,
        description: bugDescription,
        severity: "high",
        screenshot_url: "https://placeholder.com/mock.jpg",
        embedding: vectorStr
    }]);

    if (bugError) {
        console.error("Failed to insert visual_bug:", bugError.message);
        return;
    }
    console.log("Inserted dummy visual_bug.");

    // 4. Test similarity search
    console.log("4. Testing similarity search RPC...");
    const query = "menu overlaps hero";
    console.log(`Searching for: "${query}"`);
    
    const { bugs, error: searchError } = await searchSimilarBugs(query, 0.2, 5);
    
    if (searchError) {
        console.error("Search failed:", searchError);
        return;
    }
    
    if (bugs && bugs.length > 0) {
        console.log(`Success! Found ${bugs.length} similar bugs:`);
        bugs.forEach(b => {
             console.log(`- Match: ${(b.similarity * 100).toFixed(1)}% | Desc: ${b.description}`);
        });
    } else {
        console.log("Search completed but no bugs found (similarity threshold might be too high).");
    }
    
    console.log("=== Test Complete ===");
}

runTest().catch(console.error);
