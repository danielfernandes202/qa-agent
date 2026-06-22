import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { chromium, Page, Browser } from 'playwright';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { LiveTestingOutputSchema, uploadVisualTestImage } from './utils';
import * as dotenv from 'dotenv';
import path from 'path';

// Only load dotenv if we're not in production (e.g. local dev)
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-3.1-flash-lite',
});

const app = express();

const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3002'] 
    : ['http://localhost:3000', 'http://localhost:3002'];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const activePages = new Map<string, Page>();
const activeSessions = new Map<string, boolean>();
const pendingInputs = new Map<string, (input: string | null) => void>();

async function generateWithFallback(options: any, logInternal: (msg: string) => void) {
    try {
        const res1 = await ai.generate({ ...options, model: 'googleai/gemini-3.1-flash-lite' });
        logInternal("Using primary model: gemini-3.1-flash-lite");
        return res1;
    } catch (e: any) {
        const errDetails = e.detail ? JSON.stringify(e.detail) : e.message;
        logInternal(`Primary model failed (${e.status || 'UNKNOWN'} - ${errDetails}), falling back to secondary: gemma-4-31b-it`);
        try {
            const res2 = await ai.generate({ ...options, model: 'googleai/gemma-4-31b-it' });
            logInternal("Using secondary model: gemma-4-31b-it");
            return res2;
        } catch (e2: any) {
            const errDetails2 = e2.detail ? JSON.stringify(e2.detail) : e2.message;
            logInternal(`Secondary model failed (${e2.status || 'UNKNOWN'} - ${errDetails2}), falling back to tertiary: gemma-4-26b-a4b-it`);
            try {
                const res3 = await ai.generate({ ...options, model: 'googleai/gemma-4-26b-a4b-it' });
                logInternal("Using tertiary model: gemma-4-26b-a4b-it");
                return res3;
            } catch (e3: any) {
                const errDetails3 = e3.detail ? JSON.stringify(e3.detail) : e3.message;
                logInternal(`Tertiary model failed (${e3.status || 'UNKNOWN'} - ${errDetails3}). All models failed.`);
                throw new Error("All AI models failed during generation.");
            }
        }
    }
}

app.delete('/api/live-tester/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    if (activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, false);
        res.status(200).json({ message: "Session aborted." });
    } else {
        res.status(404).json({ error: "Session not found." });
    }
});

app.post('/api/live-tester/:sessionId/input', (req, res) => {
    const { sessionId } = req.params;
    const { input } = req.body;
    
    if (pendingInputs.has(sessionId)) {
        const resolve = pendingInputs.get(sessionId)!;
        resolve(input);
        pendingInputs.delete(sessionId);
        res.status(200).json({ success: true });
    } else {
        res.status(404).json({ error: "No pending input prompt for this session." });
    }
});

app.post('/api/live-tester', async (req, res) => {
    try {
        const body = req.body;
        const url = body.url;
        const instructions = body.instructions;
        const intent = body.intent;
        const testDepth = body.testDepth || 'basic';
        let maxActions = 4;
        if (testDepth === 'standard') maxActions = 10;
        else if (testDepth === 'deep') maxActions = 25;

        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        const sessionId = Math.random().toString(36).substring(7);
        console.log(`Starting session ${sessionId}. URL: ${url}, Intent: ${intent || 'None'}, TestDepth: ${testDepth}, MaxActions: ${maxActions}`);
        
        activeSessions.set(sessionId, true);

        // Instantly reply with the sessionId
        res.status(200).json({ sessionId });

        // Instantiate Supabase client to use Realtime Database insertions
        const authHeader = req.headers['authorization'];
        const { createClient } = await import('@supabase/supabase-js');
        const scopedSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
        );

        const send = async (type: string, data: any) => {
            try {
                if (!activeSessions.get(sessionId)) return;
                await scopedSupabase.from('test_run_events').insert([{
                    session_id: sessionId,
                    type,
                    data
                }]);
            } catch (e) {
                console.error("Failed to insert stream event into Supabase", e);
            }
        };

        let browser: Browser | null = null;
        let page: Page | null = null;

        // Run the agent process asynchronously
        (async () => {
            try {
                await send('log', `Starting headless browser session (Depth: ${testDepth}, Max Actions: ${maxActions})...`);
                browser = await chromium.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu'
                    ]
                });
                page = await browser.newPage({
                    viewport: { width: 1920, height: 1080 }
                });
                activePages.set(sessionId, page);

                await send('log', `Navigating to ${url}...`);
                try {
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                } catch (e: any) {
                    await send('log', `Navigation timeout or error, proceeding anyway: ${e.message}`);
                }

                const takeScreenshot = async () => {
                    try {
                        const buffer = await page!.screenshot({ type: 'jpeg', quality: 60, timeout: 10000 });
                        const uri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                        await send('screenshot', uri);
                        return uri;
                    } catch (e: any) {
                        console.error("Screenshot failed", e.message || e);
                        return null;
                    }
                };

                const testsPerformed: string[] = [];
                const agentLogs: string[] = [];
                const logInternal = async (msg: string) => {
                    agentLogs.push(msg);
                    await send('log', msg);
                };

                const navigateTool = ai.defineTool({
                    name: `navigateTool_${sessionId}`,
                    description: 'Navigates the browser to a specific URL.',
                    inputSchema: z.object({ url: z.string().url() }) as any,
                    outputSchema: z.string() as any,
                }, async ({ url }) => {
                    try {
                        await logInternal(`Tool Action: Navigating to ${url}`);
                        await page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        return `Successfully navigated to ${url}`;
                    } catch (e: any) {
                        return `Failed to navigate: ${e.message}`;
                    }
                });

                const clickTool = ai.defineTool({
                    name: `clickTool_${sessionId}`,
                    description: 'Clicks an element on the page using a CSS selector.',
                    inputSchema: z.object({ selector: z.string() }) as any,
                    outputSchema: z.string() as any,
                }, async ({ selector }) => {
                    try {
                        await logInternal(`Tool Action: Clicking on element ${selector}`);
                        await page!.click(selector, { timeout: 8000 });
                        await page!.waitForTimeout(1500);
                        return `Successfully clicked element: ${selector}`;
                    } catch (e: any) {
                        return `Failed to click element: ${e.message}`;
                    }
                });

                const typeTool = ai.defineTool({
                    name: `typeTool_${sessionId}`,
                    description: 'Types text into an input field.',
                    inputSchema: z.object({ selector: z.string(), text: z.string() }) as any,
                    outputSchema: z.string() as any,
                }, async ({ selector, text }) => {
                    try {
                        await logInternal(`Tool Action: Typing "${text}" into ${selector}`);
                        await page!.fill(selector, text, { timeout: 8000 });
                        return `Successfully typed text into: ${selector}`;
                    } catch (e: any) {
                        return `Failed to type text: ${e.message}`;
                    }
                });

                const getPageInfoTool = ai.defineTool({
                    name: `getPageInfoTool_${sessionId}`,
                    description: 'Gets the current URL, title, and a list of interactive elements.',
                    inputSchema: z.object({}) as any,
                    outputSchema: z.string() as any,
                }, async () => {
                    await logInternal(`Tool Action: Extracting page info & DOM structure`);
                    try {
                        const currentUrl = page!.url();
                        const title = await page!.title();
                        const simplifiedDOM = await page!.evaluate(() => {
                            const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
                            let info = '';
                            elements.forEach((el, index) => {
                                if (index > 100) return;
                                const tag = el.tagName.toLowerCase();
                                const id = el.id ? `#${el.id}` : '';
                                const className = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : '';
                                const type = el.getAttribute('type') ? `[type="${el.getAttribute('type')}"]` : '';
                                const name = el.getAttribute('name') ? `[name="${el.getAttribute('name')}"]` : '';
                                const placeholder = el.getAttribute('placeholder') ? `[placeholder="${el.getAttribute('placeholder')}"]` : '';
                                const ariaLabel = el.getAttribute('aria-label') ? `[aria-label="${el.getAttribute('aria-label')}"]` : '';
                                const text = (el as HTMLElement).innerText?.trim().substring(0, 30) || (el as HTMLInputElement).value || '';
                                info += `${tag}${id}${className}${type}${name}${placeholder}${ariaLabel} - Text: "${text}"\n`;
                            });
                            return info || 'No interactive elements found.';
                        });
                        return `URL: ${currentUrl}\nTitle: ${title}\nInteractive Elements:\n${simplifiedDOM}`;
                    } catch (e: any) {
                        await logInternal(`DOM extraction failed: ${e.message}`);
                        return `Failed to extract DOM. The page may have crashed. Error: ${e.message}`;
                    }
                });

                const askUserForInputTool = ai.defineTool({
                    name: `askUserForInputTool_${sessionId}`,
                    description: 'Pauses the agent and asks the human user for input, such as credentials, OTP codes, or guidance. Use this if you are stuck at a login page or CAPTCHA.',
                    inputSchema: z.object({ question: z.string().describe("The question or instruction for the user") }) as any,
                    outputSchema: z.string() as any,
                }, async (args) => {
                    const question = args?.question || "Please provide the requested input (e.g. credentials) to proceed.";
                    await logInternal(`Tool Action: Asking user for input: "${question}"`);
                    await send('prompt', { message: question });
                    
                    return new Promise<string>((resolve) => {
                        let isResolved = false;
                        const timeoutId = setTimeout(async () => {
                            if (!isResolved) {
                                isResolved = true;
                                pendingInputs.delete(sessionId);
                                await logInternal(`User input timed out after 2 minutes.`);
                                resolve("Timeout: The user did not provide input in time. Proceed with whatever you can access or skip this step.");
                            }
                        }, 120000); // 2 minutes

                        pendingInputs.set(sessionId, (input: string | null) => {
                            if (!isResolved) {
                                isResolved = true;
                                clearTimeout(timeoutId);
                                if (input) {
                                    resolve(`User provided input: ${input}\n\nCRITICAL INSTRUCTION: You must now explicitly use the typeTool to enter this information into the correct fields. Do not assume any fields are already filled correctly, even if they appear to have text in them.`);
                                } else {
                                    resolve("User skipped providing input.");
                                }
                            }
                        });
                    });
                });

                const baseObjective = instructions || "Explore the page, check for broken interactive elements, ensure the layout looks correct, and identify any accessibility issues.";
                const objectiveText = intent 
                    ? `Your objective: Verify whether the app fulfills this intent: "${intent}". You must flag every place reality diverges from this intent.`
                    : `Your objective: ${baseObjective}`;

                let chatHistory: any[] = [{
                    role: 'system',
                    content: [{ text: `You are an autonomous QA Testing Agent. Your task is to perform an end-to-end test on a webpage.
You are currently navigated to the target application: ${url}
You must ONLY test the provided target application URL. Never navigate to external websites or search engines.

${objectiveText}

Instructions:
1. Examine the screenshot provided in each turn.
2. If you need to interact, use a tool. Wait for the tool result. 
3. You are permitted to perform up to ${maxActions} actions. DO NOT stop early unless you have thoroughly explored the application and clicked around to test dynamic states. Use as many of the ${maxActions} actions as necessary to deeply test the site.
4. Output a final JSON report containing testsPerformed, bugsIdentified, and agentLogs ONLY when you are completely finished with testing. Do not output the JSON report to exit early.
The JSON must strictly follow this structure:
\`\`\`json
{
  "testsPerformed": ["action 1", "action 2"],
  "bugsIdentified": [
    {
      "id": "bug-1",
      "type": "layout", // must be one of: layout, content, design, accessibility
      "severity": "medium", // must be one of: low, medium, high, critical
      "title": "Short descriptive title",
      "description": "Detailed explanation of the issue",
      "element": "#optional-css-selector",
      "suggestions": ["Suggestion 1"],
      "intentViolated": true, // Optional: true if this bug violates the provided intent
      "expectedByIntent": "What the intent expected (optional)",
      "actualBehavior": "What the app actually does (optional)"
    }
  ],
  "agentLogs": ["log 1"]
}
\`\`\`
When you are ready to finish, stop calling tools and just return the final JSON report.`}]
                }];

                let actionCount = 0;
                let finalOutput: any = null;

                while (actionCount < maxActions) {
                    if (!activeSessions.get(sessionId)) {
                        await logInternal("Session aborted by user. Stopping test.");
                        break;
                    }
                    
                    actionCount++;
                    await logInternal(`Starting AI Turn ${actionCount}...`);
                    
                    const screenshotUri = await takeScreenshot();
                    
                    const userMessageContent: any[] = [{ text: `Turn ${actionCount}. Here is the current view of the page.` }];
                    if (screenshotUri) {
                         userMessageContent.push({ media: { url: screenshotUri, contentType: 'image/jpeg' } });
                    }
                    
                    let lastGetPageInfoIndex = -1;
                    for (let i = chatHistory.length - 1; i >= 0; i--) {
                         const msg = chatHistory[i];
                         if (msg.role === 'tool' && Array.isArray(msg.content)) {
                             if (msg.content.some((c: any) => c.toolResponse && typeof c.toolResponse.name === 'string' && c.toolResponse.name.startsWith('getPageInfoTool'))) {
                                 lastGetPageInfoIndex = i;
                                 break;
                             }
                         }
                    }

                    for (let i = 0; i < chatHistory.length; i++) {
                        const msg = chatHistory[i];
                        if (msg.role === 'user' && Array.isArray(msg.content)) {
                            if (i < chatHistory.length - 4) {
                                msg.content = msg.content.filter((c: any) => !c.media);
                            }
                        }
                        if (msg.role === 'tool' && Array.isArray(msg.content) && i !== lastGetPageInfoIndex) {
                            for (const c of msg.content) {
                                if (c.toolResponse && typeof c.toolResponse.name === 'string' && c.toolResponse.name.startsWith('getPageInfoTool') && typeof c.toolResponse.output === 'string') {
                                    if (c.toolResponse.output.length > 300) {
                                         c.toolResponse.output = c.toolResponse.output.substring(0, 250) + '\n... [Older DOM info truncated to save tokens]';
                                    }
                                }
                            }
                        }
                    }

                    chatHistory.push({ role: 'user', content: userMessageContent });
                    
                    await logInternal(`Consulting LLM...`);
                    const response = await generateWithFallback({
                        messages: chatHistory as any,
                        tools: [navigateTool, clickTool, typeTool, getPageInfoTool, askUserForInputTool],
                        returnToolRequests: true,
                    }, logInternal);

                    chatHistory.push(response.message);

                    if (response.toolRequests && response.toolRequests.length > 0) {
                        const toolResults: any[] = [];
                        for (const request of response.toolRequests) {
                             let result;
                             const tReq = (request as any).toolRequest || request;
                             const tRef = (request as any).toolRequest?.ref || (request as any).ref;
                             if (tReq.name === `navigateTool_${sessionId}`) result = await navigateTool(tReq.input as any);
                             else if (tReq.name === `clickTool_${sessionId}`) result = await clickTool(tReq.input as any);
                             else if (tReq.name === `typeTool_${sessionId}`) result = await typeTool(tReq.input as any);
                             else if (tReq.name === `getPageInfoTool_${sessionId}`) result = await getPageInfoTool(tReq.input as any);
                             else if (tReq.name === `askUserForInputTool_${sessionId}`) result = await askUserForInputTool(tReq.input as any);
                             else result = `Error: Tool ${tReq.name} is not recognized.`;
                             
                             if (result && typeof result === 'string' && result.includes("Successfully")) testsPerformed.push(`Performed: ${tReq.name} - ${JSON.stringify(tReq.input)}`);
                             
                             toolResults.push({ toolRequest: tReq, ref: tRef, output: result });
                             await logInternal(`LLM observed result: ${result}`);
                        }
                        chatHistory.push({ role: 'tool', content: toolResults.map(tr => ({ toolResponse: { ref: tr.ref, name: tr.toolRequest.name, output: tr.output || "No output provided" } })) });
                    } else {
                        try {
                            if (response.output) {
                                 finalOutput = LiveTestingOutputSchema.parse(response.output);
                                 break;
                            } else if (response.text) {
                                const jsonMatch = response.text.match(/```json\n([\s\S]*)\n```/) || response.text.match(/\{[\s\S]*\}/);
                                if (jsonMatch) {
                                     const rawJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                                     finalOutput = LiveTestingOutputSchema.parse(rawJson);
                                     break;
                                }
                            }
                        } catch (e: any) {
                            await logInternal(`JSON output failed schema validation: ${e.message}. Forcing retry...`);
                            chatHistory.push({ role: 'user', content: [{ text: "The JSON you provided did not match the requested schema exactly. Please provide the final JSON report again." }] });
                            continue;
                        }
                        chatHistory.push({ role: 'user', content: [{ text: "Please continue your analysis or output the final JSON report." }] });
                    }
                }
                
                if (!finalOutput && activeSessions.get(sessionId)) {
                      await logInternal("Requesting final JSON summary from LLM...");
                      try {
                          const finalResponse = await generateWithFallback({
                              messages: [...chatHistory, { role: 'user', content: [{ text: "Please provide the final JSON report now. Ensure it matches the requested schema exactly." }] }] as any,
                              output: { schema: LiveTestingOutputSchema }
                          }, logInternal);
                          finalOutput = finalResponse.output;
                      } catch (e: any) {
                          await logInternal(`Final fallback generation failed: ${e.message}`);
                      }
                 }

                if (!finalOutput && activeSessions.get(sessionId)) {
                    await send('error', "Agent failed to produce a valid report.");
                    return; // Early return to avoid saving incomplete run
                }

                if (finalOutput && Array.isArray(finalOutput.bugsIdentified)) {
                    finalOutput.bugsIdentified = finalOutput.bugsIdentified.filter((b: any) => b && typeof b === 'object' && b.title);
                }

                if (!activeSessions.get(sessionId)) return; // Aborted
                
                const finalScreenshotUri = await takeScreenshot();
                if (finalScreenshotUri) {
                    await logInternal("Uploading final screenshot to Supabase Storage...");
                    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
                    const { publicUrl, error: uploadError } = await uploadVisualTestImage(
                        finalScreenshotUri, 
                        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
                        token
                    );
                    if (publicUrl) {
                         finalOutput.screenshotUrl = publicUrl;
                         await logInternal("Final screenshot uploaded successfully.");
                    } else if (uploadError) {
                         await logInternal(`Failed to upload final screenshot: ${uploadError.message}`);
                    }
                }
                
                finalOutput.agentLogs = [...agentLogs, ...(finalOutput.agentLogs || [])];
                if (testsPerformed.length > 0) finalOutput.testsPerformed = testsPerformed;
                
                try {
                    await logInternal("Saving test run to Supabase...");
                    const { data: runData, error: runError } = await scopedSupabase
                        .from('test_runs')
                        .insert([{ tests_performed: testsPerformed.length || 1 }])
                        .select('id')
                        .single();
                        
                    if (runError) {
                        await logInternal(`Failed to save test run: ${runError.message}`);
                    } else if (runData && finalOutput.bugsIdentified && finalOutput.bugsIdentified.length > 0) {
                        await logInternal(`Generating embeddings for ${finalOutput.bugsIdentified.length} bugs...`);
                        for (const bug of finalOutput.bugsIdentified) {
                            try {
                                const embedResponse = await ai.embed({
                                    embedder: 'googleai/gemini-embedding-2',
                                    content: `${bug.title}: ${bug.description}`
                                });
                                let vector: number[] | null = null;
                                if (Array.isArray(embedResponse)) {
                                    if (typeof embedResponse[0] === 'number') vector = embedResponse as unknown as number[];
                                    else if (embedResponse[0] && Array.isArray((embedResponse[0] as any).embedding)) vector = (embedResponse[0] as any).embedding;
                                } else if (embedResponse && Array.isArray((embedResponse as any).embedding)) vector = (embedResponse as any).embedding;
                                else if (embedResponse && Array.isArray((embedResponse as any).values)) vector = (embedResponse as any).values;

                                if (!vector && Array.isArray(embedResponse)) vector = embedResponse as unknown as number[];

                                if (vector && Array.isArray(vector)) {
                                    await scopedSupabase
                                    .from('visual_bugs')
                                    .insert([{
                                        test_run_id: runData.id,
                                        description: `${bug.title}: ${bug.description}`,
                                        severity: bug.severity,
                                        screenshot_url: bug.screenshotUrl || finalOutput.screenshotUrl,
                                        embedding: `[${vector.join(',')}]`
                                    }]);
                                }
                            } catch (embErr: any) {
                                await logInternal(`Failed to embed bug "${bug.title}": ${embErr.message}`);
                            }
                        }
                        await logInternal("Saved bugs to Supabase successfully.");
                    }
                } catch (e: any) {
                    await logInternal(`Error logging to Supabase: ${e.message}`);
                }
                
                await send('result', finalOutput);

            } catch (e: any) {
                console.error('LIVE TESTER ERROR:', e);
                await send('error', e.message || 'An error occurred during testing');
            } finally {
                activePages.delete(sessionId);
                activeSessions.delete(sessionId);
                if (browser) await browser.close();
            }
        })();

    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`Live Tester Worker running on port ${PORT}`);
});

// Increase timeouts
server.setTimeout(300000);
server.keepAliveTimeout = 300000;

setInterval(() => {}, 1000 * 60 * 60);
