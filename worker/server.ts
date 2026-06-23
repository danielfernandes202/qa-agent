import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { chromium, Page, Browser } from 'playwright';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { LiveTestingOutputSchema, uploadVisualTestImage } from './utils';
import * as dotenv from 'dotenv';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { transitionRunState } from './state-machine';
import { checkGuardrails, SessionState } from './guardrails';
import { ai, generateWithFallback } from './ai-core';

// Only load dotenv if we're not in production (e.g. local dev)
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

function getSupabase(req: express.Request): SupabaseClient {
    const authHeader = req.headers['authorization'];
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );
}

const app = express();

const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3002'] 
    : ['http://localhost:3000', 'http://localhost:3002'];

app.use(cors({ 
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : (origin, callback) => callback(null, true)
}));
app.use(express.json());

const activePages = new Map<string, Page>();

app.delete('/api/live-tester/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const scopedSupabase = getSupabase(req);
        const { data } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
        if (data && data.current_state !== 'done' && data.current_state !== 'failed') {
            await transitionRunState(scopedSupabase, sessionId, data.current_state, 'failed', 'user_aborted');
            res.status(200).json({ message: "Session aborted." });
        } else {
            res.status(404).json({ error: "Session not found or already finished." });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/live-tester/:sessionId/input', async (req, res) => {
    const { sessionId } = req.params;
    const { input } = req.body;
    try {
        const scopedSupabase = getSupabase(req);
        const { data } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
        
        if (data && data.current_state === 'awaiting_input') {
            await transitionRunState(scopedSupabase, sessionId, 'awaiting_input', 'exploring', 'input_received', { input });
            res.status(200).json({ success: true });
        } else {
            res.status(404).json({ error: "No pending input prompt for this session." });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/live-tester/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const scopedSupabase = getSupabase(req);
        const { data, error } = await scopedSupabase
            .from('test_runs')
            .select('*')
            .eq('id', sessionId)
            .single();
            
        if (error || !data) {
            return res.status(404).json({ error: "Session not found." });
        }
        
        // If run is theoretically active but we have no browser for it, it's an orphaned run (worker restarted).
        if (!activePages.has(sessionId) && ['planned', 'exploring', 'awaiting_input', 'judging'].includes(data.current_state)) {
            await transitionRunState(scopedSupabase, sessionId, data.current_state, 'failed', 'worker_restarted');
            data.current_state = 'failed';
        }
        
        res.status(200).json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/live-tester/:sessionId/resume', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const scopedSupabase = getSupabase(req);
        const { data, error } = await scopedSupabase
            .from('test_runs')
            .select('*')
            .eq('id', sessionId)
            .single();
            
        if (error || !data) return res.status(404).json({ error: "Session not found." });
        
        if (['done', 'failed'].includes(data.current_state)) {
            return res.status(400).json({ error: `Run is already in terminal state: ${data.current_state}` });
        }
        
        if (activePages.has(sessionId)) {
            return res.status(400).json({ error: "Run is currently active and processing." });
        }
        
        // Cannot continue without browser context safely, so mark it failed cleanly
        await transitionRunState(scopedSupabase, sessionId, data.current_state, 'failed', 'resume_failed_worker_restarted');
        
        res.status(200).json({ 
            success: false,
            message: "Cannot resume run because browser context was lost during worker restart. Run marked as failed cleanly.",
            state: "failed" 
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
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

        const scopedSupabase = getSupabase(req);

        // Instantly reply with the sessionId, which is now the test_run DB UUID
        const { data: runData, error: runError } = await scopedSupabase
            .from('test_runs')
            .insert([{ tests_performed: 0 }])
            .select('id')
            .single();

        if (runError || !runData) {
            return res.status(500).json({ error: runError?.message || "Failed to create test run" });
        }

        const sessionId = runData.id;
        console.log(`Starting session ${sessionId}. URL: ${url}, Intent: ${intent || 'None'}, TestDepth: ${testDepth}, MaxActions: ${maxActions}`);
        
        res.status(200).json({ sessionId });

        // helper for tokens
        const authHeader = req.headers['authorization'];

        const send = async (type: string, data: any) => {
            try {
                const { data: st } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
                if (st && (st.current_state === 'failed' || st.current_state === 'done')) return;
                
                await scopedSupabase.from('test_run_events').insert([{
                    test_run_id: sessionId,
                    event_type: 'stream_log',
                    from_state: st ? st.current_state : 'exploring',
                    to_state: st ? st.current_state : 'exploring',
                    payload: { stream_type: type, data }
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
                console.log(`[Worker] Async agent IIFE started for sessionId: ${sessionId}`);
                console.log(`[Worker] Attempting state transition planned -> exploring...`);
                await transitionRunState(scopedSupabase, sessionId, 'planned', 'exploring', 'start_browser', { url, testDepth, maxActions });
                console.log(`[Worker] State transitioned successfully. Starting browser...`);
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
                console.log(`[Worker] Chromium browser launched successfully. Creating new tab...`);
                
                page = await browser.newPage({
                    viewport: { width: 1920, height: 1080 }
                });
                console.log(`[Worker] New browser tab created. Registering tab...`);
                activePages.set(sessionId, page);
 
                console.log(`[Worker] Navigating browser to URL: ${url}...`);
                await send('log', `Navigating to ${url}...`);
                try {
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    console.log(`[Worker] Navigation completed.`);
                } catch (e: any) {
                    console.error(`[Worker] Navigation error:`, e.message || e);
                    await send('log', `Navigation timeout or error, proceeding anyway: ${e.message}`);
                }
                console.log(`[Worker] Setting up tools and objectives for session...`);

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
                }, async ({ url }: { url: string }) => {
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
                }, async ({ selector }: { selector: string }) => {
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
                }, async ({ selector, text }: { selector: string; text: string }) => {
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
                }, async (args: { question?: string }) => {
                    const question = args?.question || "Please provide the requested input (e.g. credentials) to proceed.";
                    await logInternal(`Tool Action: Asking user for input: "${question}"`);
                    await send('prompt', { message: question });
                    
                    await transitionRunState(scopedSupabase, sessionId, 'exploring', 'awaiting_input', 'ask_user', { question });
                    
                    return new Promise<string>((resolve) => {
                        let timeElapsed = 0;
                        const interval = setInterval(async () => {
                            const { data } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
                            if (data?.current_state === 'exploring') {
                                clearInterval(interval);
                                const { data: events } = await scopedSupabase.from('test_run_events')
                                    .select('payload')
                                    .eq('test_run_id', sessionId)
                                    .eq('event_type', 'input_received')
                                    .order('created_at', { ascending: false })
                                    .limit(1);
                                const input = events?.[0]?.payload?.input;
                                if (input) {
                                    resolve(`User provided input: ${input}\n\nCRITICAL INSTRUCTION: You must now explicitly use the typeTool to enter this information into the correct fields. Do not assume any fields are already filled correctly, even if they appear to have text in them.`);
                                } else {
                                    resolve("User skipped providing input.");
                                }
                            } else if (data?.current_state === 'failed') {
                                clearInterval(interval);
                                resolve("Timeout: The user aborted or test failed.");
                            }
                            
                            timeElapsed += 2000;
                            if (timeElapsed >= 120000) {
                                clearInterval(interval);
                                if (data?.current_state === 'awaiting_input') {
                                    await transitionRunState(scopedSupabase, sessionId, 'awaiting_input', 'exploring', 'timeout');
                                }
                                await logInternal(`User input timed out after 2 minutes.`);
                                resolve("Timeout: The user did not provide input in time. Proceed with whatever you can access or skip this step.");
                            }
                        }, 2000);
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
                const sessionState: SessionState = { targetUrl: url, actionHistory: [] };

                console.log(`[Worker] Entering main action loop. maxActions: ${maxActions}`);
                while (actionCount < maxActions) {
                    console.log(`[Worker] Turn ${actionCount + 1}: Querying current run state from DB...`);
                    const { data: runData } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
                    console.log(`[Worker] Turn ${actionCount + 1}: DB run state is: ${runData?.current_state}`);
                    if (!runData || runData.current_state === 'failed' || runData.current_state === 'done') {
                        console.log(`[Worker] Run state indicates aborted/done. Breaking loop.`);
                        await logInternal("Session aborted by user. Stopping test.");
                        break;
                    }
                    
                    actionCount++;
                    console.log(`[Worker] Turn ${actionCount}: Transitioning state to exploring/start_turn...`);
                    await transitionRunState(scopedSupabase, sessionId, 'exploring', 'exploring', 'start_turn', { turn: actionCount }, actionCount, maxActions - actionCount);
                    console.log(`[Worker] Turn ${actionCount}: State transitioned successfully. Logging turn start...`);
                    await logInternal(`Starting AI Turn ${actionCount}...`);
                    
                    console.log(`[Worker] Turn ${actionCount}: Taking screenshot...`);
                    const screenshotUri = await takeScreenshot();
                    console.log(`[Worker] Turn ${actionCount}: Screenshot task done (obtained: ${screenshotUri ? 'yes' : 'no'}).`);
                    
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
                    
                    console.log(`[Worker] Turn ${actionCount}: Consulting LLM via generateWithFallback...`);
                    const response = await generateWithFallback({
                        messages: chatHistory as any,
                        tools: [navigateTool, clickTool, typeTool, getPageInfoTool, askUserForInputTool],
                        returnToolRequests: true,
                    }, logInternal);
                    console.log(`[Worker] Turn ${actionCount}: LLM response received.`);

                    chatHistory.push(response.message);

                    if (response.toolRequests && response.toolRequests.length > 0) {
                        const toolResults: any[] = [];
                        for (const request of response.toolRequests) {
                             let result;
                             const tReq = (request as any).toolRequest || request;
                             const tRef = (request as any).toolRequest?.ref || (request as any).ref;
                             
                             try {
                                 await checkGuardrails(tReq.name, tReq.input, sessionState);
                                 sessionState.actionHistory.push({ toolName: tReq.name, args: tReq.input });
                                 
                                 if (tReq.name === `navigateTool_${sessionId}`) result = await navigateTool(tReq.input as any);
                                 else if (tReq.name === `clickTool_${sessionId}`) result = await clickTool(tReq.input as any);
                                 else if (tReq.name === `typeTool_${sessionId}`) result = await typeTool(tReq.input as any);
                                 else if (tReq.name === `getPageInfoTool_${sessionId}`) result = await getPageInfoTool(tReq.input as any);
                                 else if (tReq.name === `askUserForInputTool_${sessionId}`) result = await askUserForInputTool(tReq.input as any);
                                 else result = `Error: Tool ${tReq.name} is not recognized.`;
                                 
                                 if (result && typeof result === 'string' && result.includes("Successfully")) testsPerformed.push(`Performed: ${tReq.name} - ${JSON.stringify(tReq.input)}`);
                             } catch (err: any) {
                                 result = err.message;
                                 await logInternal(`Guardrail rejected tool ${tReq.name}: ${err.message}`);
                             }
                             
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
                
                const { data: loopEndState } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
                if (loopEndState && loopEndState.current_state === 'exploring') {
                    await transitionRunState(scopedSupabase, sessionId, 'exploring', 'judging', 'evaluate_report');
                }
                
                if (!finalOutput && loopEndState && loopEndState.current_state !== 'failed') {
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

                const { data: finalStateCheck } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
                if (!finalOutput && finalStateCheck && finalStateCheck.current_state !== 'failed') {
                    await send('error', "Agent failed to produce a valid report.");
                    return; // Early return to avoid saving incomplete run
                }

                if (finalStateCheck && finalStateCheck.current_state === 'judging') {
                    await transitionRunState(scopedSupabase, sessionId, 'judging', 'reporting', 'generate_report');
                }

                if (finalOutput && Array.isArray(finalOutput.bugsIdentified)) {
                    finalOutput.bugsIdentified = finalOutput.bugsIdentified.filter((b: any) => b && typeof b === 'object' && b.title);
                }

                if (finalStateCheck && finalStateCheck.current_state === 'failed') return; // Aborted
                
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
                    const { error: runError } = await scopedSupabase
                        .from('test_runs')
                        .update({ tests_performed: testsPerformed.length || 1 })
                        .eq('id', sessionId);
                        
                    if (runError) {
                        await logInternal(`Failed to save test run: ${runError.message}`);
                    } else if (finalOutput.bugsIdentified && finalOutput.bugsIdentified.length > 0) {
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
                                        test_run_id: sessionId,
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
                
                const { data: postReportState } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
                if (postReportState && postReportState.current_state === 'reporting') {
                    await transitionRunState(scopedSupabase, sessionId, 'reporting', 'done', 'finish_test');
                }
                
                await send('result', finalOutput);

            } catch (e: any) {
                console.error('LIVE TESTER ERROR:', e);
                await send('error', e.message || 'An error occurred during testing');
                const { data: errState } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
                if (errState && errState.current_state !== 'failed' && errState.current_state !== 'done') {
                    await transitionRunState(scopedSupabase, sessionId, errState.current_state, 'failed', 'error', { error: e.message });
                }
            } finally {
                activePages.delete(sessionId);
                
                const { data: finState } = await scopedSupabase.from('test_runs').select('current_state').eq('id', sessionId).single();
                if (finState && finState.current_state !== 'done' && finState.current_state !== 'failed') {
                    if (finState.current_state === 'reporting') {
                        await transitionRunState(scopedSupabase, sessionId, 'reporting', 'done', 'finish_test');
                    } else {
                        await transitionRunState(scopedSupabase, sessionId, finState.current_state, 'failed', 'error', { error: 'Test execution ended abruptly' });
                    }
                }
                
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
