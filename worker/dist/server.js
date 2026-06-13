"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const playwright_1 = require("playwright");
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
const utils_1 = require("./utils");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Only load dotenv if we're not in production (e.g. local dev)
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path_1.default.join(__dirname, '../.env') });
}
const ai = (0, genkit_1.genkit)({
    plugins: [(0, google_genai_1.googleAI)()],
    model: 'googleai/gemini-3.1-flash-lite',
});
const app = (0, express_1.default)();
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3002']
    : ['http://localhost:3000', 'http://localhost:3002'];
app.use((0, cors_1.default)({ origin: allowedOrigins }));
app.use(express_1.default.json());
const activePages = new Map();
const activeStreams = new Map();
async function generateWithFallback(options, logInternal) {
    try {
        const res1 = await ai.generate({ ...options, model: 'googleai/gemini-3.1-flash-lite' });
        logInternal("Using primary model: gemini-3.1-flash-lite");
        return res1;
    }
    catch (e) {
        const errDetails = e.detail ? JSON.stringify(e.detail) : e.message;
        logInternal(`Primary model failed (${e.status || 'UNKNOWN'} - ${errDetails}), falling back to secondary: gemma-4-31b-it`);
        try {
            const res2 = await ai.generate({ ...options, model: 'googleai/gemma-4-31b-it' });
            logInternal("Using secondary model: gemma-4-31b-it");
            return res2;
        }
        catch (e2) {
            const errDetails2 = e2.detail ? JSON.stringify(e2.detail) : e2.message;
            logInternal(`Secondary model failed (${e2.status || 'UNKNOWN'} - ${errDetails2}), falling back to tertiary: gemma-4-26b-a4b-it`);
            try {
                const res3 = await ai.generate({ ...options, model: 'googleai/gemma-4-26b-a4b-it' });
                logInternal("Using tertiary model: gemma-4-26b-a4b-it");
                return res3;
            }
            catch (e3) {
                const errDetails3 = e3.detail ? JSON.stringify(e3.detail) : e3.message;
                logInternal(`Tertiary model failed (${e3.status || 'UNKNOWN'} - ${errDetails3}). All models failed.`);
                throw new Error("All AI models failed during generation.");
            }
        }
    }
}
app.post('/api/live-tester', async (req, res) => {
    try {
        const body = req.body;
        const url = body.url;
        const instructions = body.instructions;
        const testDepth = body.testDepth || 'basic';
        let maxActions = 4;
        if (testDepth === 'standard')
            maxActions = 10;
        else if (testDepth === 'deep')
            maxActions = 25;
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }
        const sessionId = Math.random().toString(36).substring(7);
        // Setup SSE response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        // Flush headers immediately
        res.flushHeaders();
        const send = (type, data) => {
            try {
                res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
            }
            catch (e) {
                console.error("Stream closed", e);
            }
        };
        activeStreams.set(sessionId, send);
        let browser = null;
        let page = null;
        // Run the agent process asynchronously while holding the response open
        (async () => {
            try {
                send('log', `Starting headless browser session...`);
                browser = await playwright_1.chromium.launch({ headless: true });
                page = await browser.newPage({
                    viewport: { width: 1920, height: 1080 }
                });
                activePages.set(sessionId, page);
                send('log', `Navigating to ${url}...`);
                try {
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                }
                catch (e) {
                    send('log', `Navigation timeout or error, proceeding anyway: ${e.message}`);
                }
                const takeScreenshot = async () => {
                    try {
                        const buffer = await page.screenshot({ type: 'jpeg', quality: 60 });
                        const uri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                        send('screenshot', uri);
                        return uri;
                    }
                    catch (e) {
                        console.error("Screenshot failed", e);
                        return null;
                    }
                };
                const testsPerformed = [];
                const agentLogs = [];
                const logInternal = (msg) => {
                    agentLogs.push(msg);
                    send('log', msg);
                };
                const navigateTool = ai.defineTool({
                    name: `navigateTool_${sessionId}`,
                    description: 'Navigates the browser to a specific URL.',
                    inputSchema: zod_1.z.object({ url: zod_1.z.string().url() }),
                    outputSchema: zod_1.z.string(),
                }, async ({ url }) => {
                    try {
                        logInternal(`Tool Action: Navigating to ${url}`);
                        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        return `Successfully navigated to ${url}`;
                    }
                    catch (e) {
                        return `Failed to navigate: ${e.message}`;
                    }
                });
                const clickTool = ai.defineTool({
                    name: `clickTool_${sessionId}`,
                    description: 'Clicks an element on the page using a CSS selector.',
                    inputSchema: zod_1.z.object({ selector: zod_1.z.string() }),
                    outputSchema: zod_1.z.string(),
                }, async ({ selector }) => {
                    try {
                        logInternal(`Tool Action: Clicking on element ${selector}`);
                        await page.click(selector, { timeout: 8000 });
                        await page.waitForTimeout(1500);
                        return `Successfully clicked element: ${selector}`;
                    }
                    catch (e) {
                        return `Failed to click element: ${e.message}`;
                    }
                });
                const typeTool = ai.defineTool({
                    name: `typeTool_${sessionId}`,
                    description: 'Types text into an input field.',
                    inputSchema: zod_1.z.object({ selector: zod_1.z.string(), text: zod_1.z.string() }),
                    outputSchema: zod_1.z.string(),
                }, async ({ selector, text }) => {
                    try {
                        logInternal(`Tool Action: Typing "${text}" into ${selector}`);
                        await page.fill(selector, text, { timeout: 8000 });
                        return `Successfully typed text into: ${selector}`;
                    }
                    catch (e) {
                        return `Failed to type text: ${e.message}`;
                    }
                });
                const getPageInfoTool = ai.defineTool({
                    name: `getPageInfoTool_${sessionId}`,
                    description: 'Gets the current URL, title, and a list of interactive elements.',
                    inputSchema: zod_1.z.object({}),
                    outputSchema: zod_1.z.string(),
                }, async () => {
                    logInternal(`Tool Action: Extracting page info & DOM structure`);
                    const currentUrl = page.url();
                    const title = await page.title();
                    const simplifiedDOM = await page.evaluate(() => {
                        const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
                        let info = '';
                        elements.forEach((el, index) => {
                            if (index > 100)
                                return;
                            const tag = el.tagName.toLowerCase();
                            const id = el.id ? `#${el.id}` : '';
                            const className = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : '';
                            const type = el.getAttribute('type') ? `[type="${el.getAttribute('type')}"]` : '';
                            const name = el.getAttribute('name') ? `[name="${el.getAttribute('name')}"]` : '';
                            const placeholder = el.getAttribute('placeholder') ? `[placeholder="${el.getAttribute('placeholder')}"]` : '';
                            const ariaLabel = el.getAttribute('aria-label') ? `[aria-label="${el.getAttribute('aria-label')}"]` : '';
                            const text = el.innerText?.trim().substring(0, 30) || el.value || '';
                            info += `${tag}${id}${className}${type}${name}${placeholder}${ariaLabel} - Text: "${text}"\n`;
                        });
                        return info || 'No interactive elements found.';
                    });
                    return `URL: ${currentUrl}\nTitle: ${title}\nInteractive Elements:\n${simplifiedDOM}`;
                });
                let chatHistory = [{
                        role: 'system',
                        content: [{ text: `You are an autonomous QA Testing Agent. Your task is to perform an end-to-end test on a webpage.
You are currently navigated to the target application: ${url}
You must ONLY test the provided target application URL. Never navigate to external websites or search engines.

Your objective: ${instructions || "Explore the page, check for broken interactive elements, ensure the layout looks correct, and identify any accessibility issues."}

Instructions:
1. Examine the screenshot provided in each turn.
2. If you need to interact, use a tool. Wait for the tool result. 
3. After max ${maxActions} actions, output a final JSON report containing testsPerformed, bugsIdentified, and agentLogs.
When you are ready to finish, stop calling tools and just return the final JSON report.` }]
                    }];
                let actionCount = 0;
                let finalOutput = null;
                let isClientDisconnected = false;
                req.on('close', () => {
                    isClientDisconnected = true;
                    logInternal("Client disconnected, aborting test...");
                });
                while (actionCount < maxActions) {
                    if (isClientDisconnected)
                        break;
                    actionCount++;
                    logInternal(`Starting AI Turn ${actionCount}...`);
                    const screenshotUri = await takeScreenshot();
                    const userMessageContent = [{ text: `Turn ${actionCount}. Here is the current view of the page.` }];
                    if (screenshotUri) {
                        userMessageContent.push({ media: { url: screenshotUri, contentType: 'image/jpeg' } });
                    }
                    let lastGetPageInfoIndex = -1;
                    for (let i = chatHistory.length - 1; i >= 0; i--) {
                        const msg = chatHistory[i];
                        if (msg.role === 'tool' && Array.isArray(msg.content)) {
                            if (msg.content.some((c) => c.toolResponse && typeof c.toolResponse.name === 'string' && c.toolResponse.name.startsWith('getPageInfoTool'))) {
                                lastGetPageInfoIndex = i;
                                break;
                            }
                        }
                    }
                    for (let i = 0; i < chatHistory.length; i++) {
                        const msg = chatHistory[i];
                        if (msg.role === 'user' && Array.isArray(msg.content)) {
                            if (i < chatHistory.length - 4) {
                                msg.content = msg.content.filter((c) => !c.media);
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
                    logInternal(`Consulting LLM...`);
                    const response = await generateWithFallback({
                        messages: chatHistory,
                        tools: [navigateTool, clickTool, typeTool, getPageInfoTool],
                        returnToolRequests: true,
                    }, logInternal);
                    chatHistory.push(response.message);
                    if (response.toolRequests && response.toolRequests.length > 0) {
                        const toolResults = [];
                        for (const request of response.toolRequests) {
                            let result;
                            const tReq = request.toolRequest || request;
                            const tRef = request.toolRequest?.ref || request.ref;
                            if (tReq.name === `navigateTool_${sessionId}`)
                                result = await navigateTool(tReq.input);
                            else if (tReq.name === `clickTool_${sessionId}`)
                                result = await clickTool(tReq.input);
                            else if (tReq.name === `typeTool_${sessionId}`)
                                result = await typeTool(tReq.input);
                            else if (tReq.name === `getPageInfoTool_${sessionId}`)
                                result = await getPageInfoTool(tReq.input);
                            else
                                result = `Error: Tool ${tReq.name} is not recognized.`;
                            if (result && typeof result === 'string' && result.includes("Successfully"))
                                testsPerformed.push(`Performed: ${tReq.name} - ${JSON.stringify(tReq.input)}`);
                            toolResults.push({ toolRequest: tReq, ref: tRef, output: result });
                            logInternal(`LLM observed result: ${result}`);
                        }
                        chatHistory.push({ role: 'tool', content: toolResults.map(tr => ({ toolResponse: { ref: tr.ref, name: tr.toolRequest.name, output: tr.output || "No output provided" } })) });
                    }
                    else {
                        try {
                            if (response.output) {
                                finalOutput = utils_1.LiveTestingOutputSchema.parse(response.output);
                                break;
                            }
                            else if (response.text) {
                                const jsonMatch = response.text.match(/```json\n([\s\S]*)\n```/) || response.text.match(/\{[\s\S]*\}/);
                                if (jsonMatch) {
                                    const rawJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                                    finalOutput = utils_1.LiveTestingOutputSchema.parse(rawJson);
                                    break;
                                }
                            }
                        }
                        catch (e) {
                            logInternal(`JSON output failed schema validation: ${e.message}. Forcing retry...`);
                            chatHistory.push({ role: 'user', content: [{ text: "The JSON you provided did not match the requested schema exactly. Please provide the final JSON report again." }] });
                            continue;
                        }
                        chatHistory.push({ role: 'user', content: [{ text: "Please continue your analysis or output the final JSON report." }] });
                    }
                }
                if (!finalOutput && !isClientDisconnected) {
                    logInternal("Requesting final JSON summary from LLM...");
                    const finalResponse = await generateWithFallback({
                        messages: [...chatHistory, { role: 'user', content: [{ text: "Please provide the final JSON report now." }] }],
                        output: { schema: utils_1.LiveTestingOutputSchema }
                    }, logInternal);
                    finalOutput = finalResponse.output;
                }
                if (!finalOutput && !isClientDisconnected) {
                    throw new Error("Agent failed to produce a valid report.");
                }
                if (isClientDisconnected)
                    return;
                const authHeader = req.headers['authorization'];
                const { createClient } = await import('@supabase/supabase-js');
                const scopedSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { global: { headers: authHeader ? { Authorization: authHeader } : {} } });
                const finalScreenshotUri = await takeScreenshot();
                if (finalScreenshotUri) {
                    logInternal("Uploading final screenshot to Supabase Storage...");
                    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
                    const { publicUrl, error: uploadError } = await (0, utils_1.uploadVisualTestImage)(finalScreenshotUri, process.env.NEXT_PUBLIC_SUPABASE_URL, token);
                    if (publicUrl) {
                        finalOutput.screenshotUrl = publicUrl;
                        logInternal("Final screenshot uploaded successfully.");
                    }
                    else if (uploadError) {
                        logInternal(`Failed to upload final screenshot: ${uploadError.message}`);
                    }
                }
                finalOutput.agentLogs = [...agentLogs, ...(finalOutput.agentLogs || [])];
                if (testsPerformed.length > 0)
                    finalOutput.testsPerformed = testsPerformed;
                try {
                    logInternal("Saving test run to Supabase...");
                    const { data: runData, error: runError } = await scopedSupabase
                        .from('test_runs')
                        .insert([{ tests_performed: testsPerformed.length || 1 }])
                        .select('id')
                        .single();
                    if (runError) {
                        logInternal(`Failed to save test run: ${runError.message}`);
                    }
                    else if (runData && finalOutput.bugsIdentified && finalOutput.bugsIdentified.length > 0) {
                        logInternal(`Generating embeddings for ${finalOutput.bugsIdentified.length} bugs...`);
                        for (const bug of finalOutput.bugsIdentified) {
                            try {
                                const embedResponse = await ai.embed({
                                    embedder: 'googleai/gemini-embedding-2',
                                    content: `${bug.title}: ${bug.description}`
                                });
                                let vector = null;
                                if (Array.isArray(embedResponse)) {
                                    if (typeof embedResponse[0] === 'number')
                                        vector = embedResponse;
                                    else if (embedResponse[0] && Array.isArray(embedResponse[0].embedding))
                                        vector = embedResponse[0].embedding;
                                }
                                else if (embedResponse && Array.isArray(embedResponse.embedding))
                                    vector = embedResponse.embedding;
                                else if (embedResponse && Array.isArray(embedResponse.values))
                                    vector = embedResponse.values;
                                if (!vector && Array.isArray(embedResponse))
                                    vector = embedResponse;
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
                            }
                            catch (embErr) {
                                logInternal(`Failed to embed bug "${bug.title}": ${embErr.message}`);
                            }
                        }
                        logInternal("Saved bugs to Supabase successfully.");
                    }
                }
                catch (e) {
                    logInternal(`Error logging to Supabase: ${e.message}`);
                }
                send('result', finalOutput);
            }
            catch (e) {
                console.error('LIVE TESTER ERROR:', e);
                send('error', e.message || 'An error occurred during testing');
            }
            finally {
                activePages.delete(sessionId);
                activeStreams.delete(sessionId);
                if (browser)
                    await browser.close();
                res.end();
            }
        })();
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`Live Tester Worker running on port ${PORT}`);
});
// Keep process alive if express/node somehow unrefs the server
setInterval(() => { }, 1000 * 60 * 60);
