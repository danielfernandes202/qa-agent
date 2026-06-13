"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveTestingOutputSchema = exports.VisualIssueSchema = void 0;
exports.uploadVisualTestImage = uploadVisualTestImage;
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
exports.VisualIssueSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['layout', 'content', 'design', 'accessibility']),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    element: zod_1.z.string().optional(),
    suggestions: zod_1.z.array(zod_1.z.string()),
});
exports.LiveTestingOutputSchema = zod_1.z.object({
    testsPerformed: zod_1.z.array(zod_1.z.string()).describe("A list of actions or tests the agent performed."),
    bugsIdentified: zod_1.z.array(exports.VisualIssueSchema).describe("A list of visual or functional bugs identified during the test."),
    agentLogs: zod_1.z.array(zod_1.z.string()).describe("Internal logs from the agent explaining its reasoning and actions."),
    screenshotUrl: zod_1.z.string().optional().describe("The URL of the final screenshot taken at the end of the test."),
});
async function uploadVisualTestImage(base64Data, supabaseUrl, token) {
    try {
        // Convert base64 to Buffer
        const base64Parts = base64Data.split(',');
        const mimeMatch = base64Parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64String = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
        const buffer = Buffer.from(base64String, 'base64');
        const ext = mimeType.split('/')[1] || 'jpeg';
        const path = `${crypto_1.default.randomUUID()}.${ext}`;
        const headers = {
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
    }
    catch (error) {
        console.error('Error uploading visual test image to Supabase:', error);
        return { publicUrl: '', error };
    }
}
