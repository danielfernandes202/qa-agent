import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const VisualIssueSchema = z.object({
    id: z.string(),
    type: z.enum(['layout', 'content', 'design', 'accessibility']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    title: z.string(),
    description: z.string(),
    element: z.string().optional(),
    suggestions: z.array(z.string()),
});
export type VisualIssue = z.infer<typeof VisualIssueSchema>;

export const LiveTestingOutputSchema = z.object({
  testsPerformed: z.array(z.string()).describe("A list of actions or tests the agent performed."),
  bugsIdentified: z.array(VisualIssueSchema).describe("A list of visual or functional bugs identified during the test."),
  agentLogs: z.array(z.string()).describe("Internal logs from the agent explaining its reasoning and actions."),
  screenshotUrl: z.string().optional().describe("The URL of the final screenshot taken at the end of the test."),
});
export type LiveTestingOutput = z.infer<typeof LiveTestingOutputSchema>;

export async function uploadVisualTestImage(base64Data: string, supabaseUrl: string, token: string | null): Promise<{ publicUrl: string, error: Error | null }> {
  try {
    // Convert base64 to Buffer
    const base64Parts = base64Data.split(',');
    const mimeMatch = base64Parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64String = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
    
    const buffer = Buffer.from(base64String, 'base64');
    const ext = mimeType.split('/')[1] || 'jpeg';
    const path = `${crypto.randomUUID()}.${ext}`;

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Authorization': token ? `Bearer ${token}` : `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    };

    const res = await fetch(`${supabaseUrl}/storage/v1/object/qa-visual-tests/${path}`, {
      method: 'POST',
      headers,
      body: buffer
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`StorageApiError: ${res.status} ${errText}`);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/qa-visual-tests/${path}`;
    return { publicUrl, error: null };
  } catch (error: any) {
    console.error('Error uploading visual test image to Supabase:', error);
    return { publicUrl: '', error };
  }
}
