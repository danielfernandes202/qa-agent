import { NextRequest } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { chromium, Page, Browser } from 'playwright';
import { LiveTestingOutputSchema } from '@/lib/schemas';

// Maintain active Playwright pages for tool calls
const activePages = new Map<string, Page>();
const activeStreams = new Map<string, (type: string, data: any) => void>();

export const maxDuration = 300; // Allow max 5 minutes for this serverless function
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const url = body.url;
        const instructions = body.instructions;
        const testDepth = body.testDepth || 'basic';
        let maxActions = 4;
        if (testDepth === 'standard') maxActions = 10;
        else if (testDepth === 'deep') maxActions = 25;

        if (!url) {
            return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });
        }

        const encoder = new TextEncoder();
        const sessionId = Math.random().toString(36).substring(7);

        const stream = new ReadableStream({
            async start(controller) {
                const send = (type: string, data: any) => {
                    try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`));
                    } catch (e) {
                        console.error("Stream closed", e);
                    }
                };
                
                activeStreams.set(sessionId, send);

                let browser: Browser | null = null;
                let page: Page | null = null;

                try {
                    send('log', `Starting headless browser session...`);
                    browser = await chromium.launch({ headless: true });
                    page = await browser.newPage({
                        viewport: { width: 1920, height: 1080 }
                    });
                    activePages.set(sessionId, page);

                    send('log', `Navigating to ${url}...`);
                    // Use domcontentloaded instead of networkidle to prevent timeouts on modern SPAs
                    try {
                        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    } catch (e: any) {
                        send('log', `Navigation timeout or error, proceeding anyway: ${e.message}`);
                    }

                    // Helper to take screenshot and broadcast
                    const takeScreenshot = async () => {
                        try {
                            const buffer = await page!.screenshot({ type: 'jpeg', quality: 60 });
                            const uri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                            send('screenshot', uri);
                            return uri;
                        } catch (e) {
                            console.error("Screenshot failed", e);
                            return null;
                        }
                    };

                    const testsPerformed: string[] = [];
                    const agentLogs: string[] = [];
                    const logInternal = (msg: string) => {
                        agentLogs.push(msg);
                        send('log', msg);
                    };

                    // Define tools for the agent, injected with current sessionId
                    const navigateTool = ai.defineTool({
                        name: `navigateTool_${sessionId}`,
                        description: 'Navigates the browser to a specific URL.',
                        inputSchema: z.object({ url: z.string().url() }),
                        outputSchema: z.string(),
                    }, async ({ url }) => {
                        try {
                            logInternal(`Tool Action: Navigating to ${url}`);
                            await page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                            return `Successfully navigated to ${url}`;
                        } catch (e: any) {
                            return `Failed to navigate: ${e.message}`;
                        }
                    });

                    const clickTool = ai.defineTool({
                        name: `clickTool_${sessionId}`,
                        description: 'Clicks an element on the page using a CSS selector.',
                        inputSchema: z.object({ selector: z.string() }),
                        outputSchema: z.string(),
                    }, async ({ selector }) => {
                        try {
                            logInternal(`Tool Action: Clicking on element ${selector}`);
                            await page!.click(selector, { timeout: 8000 });
                            await page!.waitForTimeout(1500); // Wait for DOM changes
                            return `Successfully clicked element: ${selector}`;
                        } catch (e: any) {
                            return `Failed to click element: ${e.message}`;
                        }
                    });

                    const typeTool = ai.defineTool({
                        name: `typeTool_${sessionId}`,
                        description: 'Types text into an input field.',
                        inputSchema: z.object({ selector: z.string(), text: z.string() }),
                        outputSchema: z.string(),
                    }, async ({ selector, text }) => {
                        try {
                            logInternal(`Tool Action: Typing "${text}" into ${selector}`);
                            await page!.fill(selector, text, { timeout: 8000 });
                            return `Successfully typed text into: ${selector}`;
                        } catch (e: any) {
                            return `Failed to type text: ${e.message}`;
                        }
                    });

                    const getPageInfoTool = ai.defineTool({
                        name: `getPageInfoTool_${sessionId}`,
                        description: 'Gets the current URL, title, and a list of interactive elements.',
                        inputSchema: z.object({}),
                        outputSchema: z.string(),
                    }, async () => {
                        logInternal(`Tool Action: Extracting page info & DOM structure`);
                        const url = page!.url();
                        const title = await page!.title();
                        const simplifiedDOM = await page!.evaluate(() => {
                            const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
                            let info = '';
                            elements.forEach((el, index) => {
                                if (index > 100) return;
                                const tag = el.tagName.toLowerCase();
                                const id = el.id ? `#${el.id}` : '';
                                const className = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : '';
                                const text = (el as HTMLElement).innerText?.trim().substring(0, 30) || (el as HTMLInputElement).value || '';
                                info += `${tag}${id}${className} - Text: "${text}"\n`;
                            });
                            return info || 'No interactive elements found.';
                        });
                        return `URL: ${url}\nTitle: ${title}\nInteractive Elements:\n${simplifiedDOM}`;
                    });

                    let chatHistory: any[] = [{
                        role: 'system',
                        content: [{ text: `You are an autonomous QA Testing Agent. Your task is to perform an end-to-end test on a webpage.
Your objective: ${instructions || "Explore the page, check for broken interactive elements, ensure the layout looks correct, and identify any accessibility issues."}

Instructions:
1. Examine the screenshot provided in each turn.
2. If you need to interact, use a tool. Wait for the tool result. 
3. After max ${maxActions} actions, output a final JSON report containing testsPerformed, bugsIdentified, and agentLogs.
When you are ready to finish, stop calling tools and just return the final JSON report.`}]
                    }];

                    let actionCount = 0;
                    let finalOutput: any = null;

                    while (actionCount < maxActions) {
                        actionCount++;
                        logInternal(`Starting AI Turn ${actionCount}...`);
                        
                        const screenshotUri = await takeScreenshot();
                        
                        const userMessageContent: any[] = [{ text: `Turn ${actionCount}. Here is the current view of the page.` }];
                        if (screenshotUri) {
                             userMessageContent.push({ media: { url: screenshotUri, contentType: 'image/jpeg' } });
                        }
                        chatHistory.push({ role: 'user', content: userMessageContent });
                        
                        logInternal(`Consulting LLM...`);
                        const response = await ai.generate({
                            model: 'googleai/gemini-3.1-flash-lite',
                            messages: chatHistory as any,
                            tools: [navigateTool, clickTool, typeTool, getPageInfoTool],
                            returnToolRequests: true,
                        });

                        chatHistory.push(response.message);

                        if (response.toolRequests && response.toolRequests.length > 0) {
                            const toolResults: any[] = [];
                            for (const request of response.toolRequests) {
                                 let result;
                                 if (request.tool.name === navigateTool.name) result = await navigateTool(request.tool.input as any);
                                 else if (request.tool.name === clickTool.name) result = await clickTool(request.tool.input as any);
                                 else if (request.tool.name === typeTool.name) result = await typeTool(request.tool.input as any);
                                 else if (request.tool.name === getPageInfoTool.name) result = await getPageInfoTool(request.tool.input as any);
                                 
                                 if (result.includes("Successfully")) testsPerformed.push(`Performed: ${request.tool.name} - ${JSON.stringify(request.tool.input)}`);
                                 
                                 toolResults.push({ toolRequest: request, output: result });
                                 logInternal(`LLM observed result: ${result}`);
                            }
                            chatHistory.push({ role: 'tool', content: toolResults.map(tr => ({ toolResponse: { ref: tr.toolRequest.ref, name: tr.toolRequest.tool.name, output: tr.output } })) });
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
                                logInternal(`JSON output failed schema validation: ${e.message}. Forcing retry...`);
                                chatHistory.push({ role: 'user', content: [{ text: "The JSON you provided did not match the requested schema exactly. Please provide the final JSON report again, making sure to include 'testsPerformed', 'bugsIdentified' (which requires 'title', 'description', 'severity', 'type', and 'suggestions' array), and 'agentLogs'." }] });
                                continue;
                            }
                            break;
                        }
                    }
                    
                    if (!finalOutput) {
                         logInternal("Requesting final JSON summary from LLM...");
                         const finalResponse = await ai.generate({
                             model: 'googleai/gemini-3.1-flash-lite',
                             messages: [...chatHistory, { role: 'user', content: [{ text: "Please provide the final JSON report now." }] }] as any,
                             output: { schema: LiveTestingOutputSchema }
                         });
                         finalOutput = finalResponse.output;
                    }

                    if (!finalOutput) {
                        throw new Error("Agent failed to produce a valid report.");
                    }
                    
                    finalOutput.agentLogs = [...agentLogs, ...(finalOutput.agentLogs || [])];
                    if (testsPerformed.length > 0) finalOutput.testsPerformed = testsPerformed;
                    
                    send('result', finalOutput);

                } catch (e: any) {
                    send('error', e.message || 'An error occurred during testing');
                } finally {
                    activePages.delete(sessionId);
                    activeStreams.delete(sessionId);
                    if (browser) await browser.close();
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
