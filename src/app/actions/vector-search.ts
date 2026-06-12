'use server';

import { supabase } from '@/lib/supabase';
import { ai } from '@/ai/genkit';

export interface VisualBugResult {
    id: string;
    test_run_id: string;
    description: string;
    severity: string;
    screenshot_url: string;
    created_at: string;
    similarity: number;
}

export async function searchSimilarBugs(query: string, matchThreshold: number = 0.5, matchCount: number = 10, accessToken?: string): Promise<{ bugs: VisualBugResult[], error?: string }> {
    if (!query) return { bugs: [], error: 'Query is required' };

    try {
        // Generate embedding for the search query
        const embedResponse = await ai.embed({
            embedder: 'googleai/gemini-embedding-2',
            content: query
        });

        // Handle genkit output type
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
        } else if (typeof embedResponse === 'object' && embedResponse !== null) {
            const vals = Object.values(embedResponse);
            if (vals.length > 0 && Array.isArray(vals[0])) vector = vals[0] as number[];
        }

        if (!vector) {
            return { bugs: [], error: 'Failed to generate embedding for the search query.' };
        }

        const vectorStr = `[${vector.join(',')}]`;

        // Create an authenticated client if a token is provided
        let client = supabase;
        if (accessToken) {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
            client = createClient(supabaseUrl, supabaseAnonKey, {
                global: {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            });
        }

        // Query Supabase RPC
        const { data, error } = await client.rpc('match_visual_bugs', {
            query_embedding: vectorStr,
            match_threshold: matchThreshold,
            match_count: matchCount
        });

        if (error) {
            return { bugs: [], error: error.message };
        }

        return { bugs: data as VisualBugResult[] };

    } catch (e: any) {
        console.error("Vector Search Error:", e);
        return { bugs: [], error: e.message };
    }
}
