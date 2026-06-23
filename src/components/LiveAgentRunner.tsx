"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Play, MonitorSmartphone, CheckCircle, FileWarning, Palette, ScanText, Accessibility, LayoutTemplate, Lightbulb, Activity, Bug, ArrowRight, ShieldCheck, Zap, Terminal, Sparkles, Square
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { cn } from "@/lib/utils";
import type { VisualIssue } from "@/lib/schemas";

const crawlSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
  instructions: z.string().optional(),
  testDepth: z.enum(['basic', 'standard', 'deep']).default('basic'),
});

type CrawlFormValues = z.infer<typeof crawlSchema>;

const getIssueTypeIcon = (type: string) => {
  switch (type) {
    case "layout": return <LayoutTemplate className="h-4 w-4 text-blue-500" />;
    case "content": return <ScanText className="h-4 w-4 text-emerald-500" />;
    case "design": return <Palette className="h-4 w-4 text-purple-500" />;
    case "accessibility": return <Accessibility className="h-4 w-4 text-amber-500" />;
    default: return <Bug className="h-4 w-4 text-rose-500" />;
  }
};

const getSeverityBadgeStyles = (severity: string) => {
  switch (severity) {
    case "critical": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    case "high": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "medium": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "low": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
};

interface LiveAgentRunnerProps {
  initialUrl?: string;
  initialInstructions?: string;
  autoStart?: boolean;
}

export function LiveAgentRunner({ initialUrl = '', initialInstructions = '', autoStart = false }: LiveAgentRunnerProps) {
  const [visualIssues, setVisualIssues] = useState<VisualIssue[]>([]);
  const [testsPerformed, setTestsPerformed] = useState<string[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<{ message: string } | null>(null);
  const [promptInput, setPromptInput] = useState('');
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const form = useForm<CrawlFormValues>({
    resolver: zodResolver(crawlSchema),
    defaultValues: {
      url: initialUrl,
      instructions: initialInstructions,
      testDepth: 'basic',
    },
  });

  // Update form if props change
  useEffect(() => {
    if (initialUrl) form.setValue('url', initialUrl);
    if (initialInstructions) form.setValue('instructions', initialInstructions);
  }, [initialUrl, initialInstructions, form]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [agentLogs]);

  const cleanupRealtime = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupRealtime();
    };
  }, []);

  const processEvent = (type: string, data: any) => {
    if (type === 'log') {
      setAgentLogs(prev => [...prev, data]);
    } else if (type === 'screenshot') {
      setScreenshotData(data);
    } else if (type === 'result') {
      setVisualIssues(data.bugsIdentified || []);
      setTestsPerformed(data.testsPerformed || []);
      if (data.screenshotUrl) setScreenshotData(data.screenshotUrl);
      setIsLoading(false);
      cleanupRealtime();
    } else if (type === 'error') {
      setError(data);
      setIsLoading(false);
      cleanupRealtime();
    } else if (type === 'prompt') {
      setPendingPrompt(data);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId || !pendingPrompt) return;
    
    const workerUrl = process.env.NODE_ENV === 'production' 
      ? 'https://qa-agent-production-a992.up.railway.app' 
      : `${window.location.protocol}//${window.location.hostname}:3001`;
      
    try {
      setAgentLogs(prev => [...prev, `User responded to prompt...`]);
      await fetch(`${workerUrl}/api/live-tester/${activeSessionId}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: promptInput })
      });
      setPendingPrompt(null);
      setPromptInput('');
    } catch (err) {
      console.error("Failed to submit prompt response", err);
    }
  };

  const handleAnalysis = async (data: CrawlFormValues) => {
    setIsLoading(true);
    setHasStarted(true);
    setError(null);
    setVisualIssues([]);
    setTestsPerformed([]);
    setAgentLogs([]);
    setAnalyzedUrl(data.url);
    setScreenshotData(null);
    setActiveSessionId(null);
    setPendingPrompt(null);
    setPromptInput('');
    
    cleanupRealtime();

    try {
      console.log("[LiveAgentRunner] handleAnalysis started for URL:", data.url);
      setAgentLogs(prev => [...prev, "Contacting QA Agent worker at " + (process.env.NODE_ENV === 'production' ? 'Production URL' : 'http://localhost:3001') + "..."]);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      console.log("[LiveAgentRunner] Obtained Supabase session token:", token ? "Present" : "Absent");

      const workerUrl = process.env.NODE_ENV === 'production' 
        ? 'https://qa-agent-production-a992.up.railway.app' 
        : `${window.location.protocol}//${window.location.hostname}:3001`;
      
      console.log("[LiveAgentRunner] Sending POST request to:", `${workerUrl}/api/live-tester`);
      const response = await fetch(`${workerUrl}/api/live-tester`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ url: data.url, instructions: data.instructions, testDepth: data.testDepth }),
      });

      console.log("[LiveAgentRunner] Worker response status:", response.status);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("[LiveAgentRunner] Worker returned error status:", errData);
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const { sessionId } = await response.json();
      console.log("[LiveAgentRunner] Worker response session ID:", sessionId);
      setActiveSessionId(sessionId);
      setAgentLogs(prev => [...prev, `Session established: ${sessionId}. Querying historical events...`]);

      console.log("[LiveAgentRunner] Fetching past events from test_run_events where test_run_id =", sessionId);
      const { data: pastEvents, error: pastEventsError } = await supabase
        .from('test_run_events')
        .select('*')
        .eq('test_run_id', sessionId)
        .order('created_at', { ascending: true });

      if (pastEventsError) {
        console.error("[LiveAgentRunner] Failed to fetch past events:", pastEventsError);
        setAgentLogs(prev => [...prev, `Warning: Failed to fetch historical logs: ${pastEventsError.message}`]);
      } else {
        console.log("[LiveAgentRunner] Historical events fetched count:", pastEvents?.length || 0);
      }

      const mapEvent = (evt: any) => {
        console.log("[LiveAgentRunner] Mapping event:", evt.event_type, evt.payload);
        if (evt.event_type === 'stream_log' && evt.payload) {
          return {
            type: evt.payload.stream_type,
            data: evt.payload.data
          };
        }
        
        // Map other state transitions to human-friendly logs
        if (evt.event_type === 'start_browser') {
          return { type: 'log', data: `Starting browser for URL: ${evt.payload?.url || ''}` };
        }
        if (evt.event_type === 'ask_user') {
          return { type: 'log', data: `Awaiting user input: ${evt.payload?.question || ''}` };
        }
        if (evt.event_type === 'input_received') {
          return { type: 'log', data: `User input received.` };
        }
        if (evt.event_type === 'start_turn') {
          return { type: 'log', data: `Starting AI Turn ${evt.payload?.turn || ''}...` };
        }
        if (evt.event_type === 'evaluate_report') {
          return { type: 'log', data: `Evaluating final report...` };
        }
        if (evt.event_type === 'generate_report') {
          return { type: 'log', data: `Generating visual bug embeddings and report...` };
        }
        if (evt.event_type === 'finish_test' || evt.event_type === 'finish_test_early') {
          return { type: 'log', data: `Test execution finished.` };
        }
        if (evt.event_type === 'error') {
          return { type: 'log', data: `Error: ${evt.payload?.error || ''}` };
        }
        
        return null;
      };

      if (pastEvents) {
        for (const evt of pastEvents) {
          const mapped = mapEvent(evt);
          if (mapped) {
            console.log("[LiveAgentRunner] Processing past event:", mapped);
            processEvent(mapped.type, mapped.data);
          }
        }
      }

      setAgentLogs(prev => [...prev, `Connecting to real-time subscription channel...`]);
      console.log("[LiveAgentRunner] Connecting to Supabase Realtime channel:", `test-run-${sessionId}`);
      
      const channel = supabase.channel(`test-run-${sessionId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'test_run_events', filter: `test_run_id=eq.${sessionId}` },
          (payload) => {
            console.log("[LiveAgentRunner] Realtime event INSERT payload.new:", payload.new);
            const mapped = mapEvent(payload.new);
            if (mapped) {
              console.log("[LiveAgentRunner] Processing realtime event:", mapped);
              processEvent(mapped.type, mapped.data);
            }
          }
        )
        .subscribe((status) => {
          console.log(`[LiveAgentRunner] Realtime channel status changed to: ${status}`);
          setAgentLogs(prev => [...prev, `Database stream status: ${status}`]);
        });

      channelRef.current = channel;

    } catch (err: any) {
      console.error("[LiveAgentRunner] Live testing failed with error:", err);
      setError(err.message || "An unknown error occurred during the analysis.");
      setIsLoading(false);
      cleanupRealtime();
    }
  };

  const handleStop = async () => {
    if (activeSessionId) {
      const workerUrl = process.env.NODE_ENV === 'production' 
        ? 'https://qa-agent-production-a992.up.railway.app' 
        : `${window.location.protocol}//${window.location.hostname}:3001`;
      
      try {
        await fetch(`${workerUrl}/api/live-tester/${activeSessionId}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error("Failed to stop session cleanly", err);
      }
      
      setActiveSessionId(null);
      setIsLoading(false);
      setAgentLogs(prev => [...prev, "Execution stopped by user."]);
      cleanupRealtime();
    }
  };

  // Auto start
  useEffect(() => {
    if (autoStart && initialUrl && !hasStarted && !isLoading) {
      form.handleSubmit(handleAnalysis)();
    }
  }, [autoStart, initialUrl, hasStarted, isLoading, form]);

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-background rounded-md overflow-hidden">
      
      {/* LEFT SIDEBAR: Controls & Logs */}
      <aside 
        className={cn(
          "flex flex-col border-r border-border/40 bg-muted/10 shrink-0 transition-all duration-500 ease-out",
          hasStarted ? "w-full md:w-[320px]" : "w-full md:w-[380px]"
        )}
      >
        <div className="p-5 flex flex-col h-full overflow-hidden">
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-foreground" />
              <h1 className="text-base font-medium tracking-tight">QA Agent</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Autonomous visual & functional testing stream.
            </p>
          </div>

          <div className="shrink-0 mb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAnalysis)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-foreground">Target URL</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            className="pl-8 bg-transparent border-border/50 rounded-none border-b-2 border-t-0 border-x-0 focus-visible:ring-0 focus-visible:border-foreground transition-colors h-10 shadow-none px-0" 
                            placeholder="https://example.com" 
                            disabled={isLoading}
                            {...field} 
                          />
                          <MonitorSmartphone className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className={cn(
                  "grid transition-all duration-500 ease-out",
                  hasStarted ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100 mt-4"
                )}>
                  <div className="overflow-hidden space-y-4">
                    <FormField
                      control={form.control}
                      name="instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-foreground">Context (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              className="resize-none bg-background border-border/50 rounded-sm focus-visible:ring-1 focus-visible:ring-foreground transition-all min-h-[80px] text-sm custom-scrollbar"
                              placeholder="e.g. Test the login flow..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="testDepth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-foreground">Test Depth</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-border/50 rounded-sm focus:ring-1 focus:ring-foreground h-10 text-sm">
                                <SelectValue placeholder="Select depth" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="border-border/50 rounded-sm shadow-xl bg-background">
                              <SelectItem value="basic">Basic (4 Actions)</SelectItem>
                              <SelectItem value="standard">Standard (10 Actions)</SelectItem>
                              <SelectItem value="deep">Deep (25 Actions)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className={cn(
                      "flex-1 h-10 rounded-sm font-medium tracking-tight",
                      isLoading ? "bg-muted text-muted-foreground" : "bg-foreground text-background hover:bg-foreground/90"
                    )}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Play className="w-4 h-4 fill-current" />
                        {hasStarted ? "Re-run" : "Start"}
                      </span>
                    )}
                  </Button>

                  {isLoading && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleStop}
                      className="h-10 px-4 rounded-sm shrink-0 animate-in fade-in flex items-center gap-2 font-medium tracking-tight"
                      title="Stop execution"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Stop
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>

          {hasStarted && (
            <div className="flex-1 flex flex-col min-h-0 border-t border-border/40 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  Terminal
                </h3>
                {isLoading && (
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Live</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto bg-black/5 dark:bg-white/5 border border-border/40 rounded-sm p-3 custom-scrollbar font-mono text-[11px] leading-relaxed relative">
                {agentLogs.length === 0 && !error ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-2">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span>Booting...</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {agentLogs.map((log, i) => (
                      <div 
                        key={i}
                        className="flex gap-2 text-muted-foreground break-words animate-in fade-in slide-in-from-left-1"
                      >
                        <span className="text-foreground/30 shrink-0">›</span>
                        <span className="text-foreground/80">{log}</span>
                      </div>
                    ))}
                    {error && (
                      <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-sm flex items-start gap-2">
                        <FileWarning className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                    <div ref={logsEndRef} className="h-1" />
                  </div>
                )}
              </div>

              {pendingPrompt && (
                <div className="mt-3 p-3 border border-emerald-500/30 bg-emerald-500/10 rounded-sm animate-in fade-in slide-in-from-bottom-2">
                  <h4 className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Agent needs your input
                  </h4>
                  <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">{pendingPrompt.message}</p>
                  <form onSubmit={handlePromptSubmit} className="flex gap-2">
                    <Input 
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Type your response (or leave empty to skip)..."
                      className="h-8 text-xs bg-background border-emerald-500/20 focus-visible:ring-emerald-500/50"
                      autoFocus
                    />
                    <Button type="submit" size="sm" className="h-8 text-xs shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                      Submit
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT AREA: Browser Preview & Results */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar h-full">
        {!hasStarted ? (
          <div className="flex-1 flex items-center justify-center text-center max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-700">
            <div>
              <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4 border border-border/50">
                <MonitorSmartphone className="w-6 h-6 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-medium tracking-tight mb-2">Awaiting Target</h2>
              <p className="text-sm text-muted-foreground">
                Enter a URL and optional instructions on the left to begin the autonomous visual testing process. The agent will navigate and analyze the page live.
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full min-h-min">
            <div className="w-full shrink-0 flex flex-col rounded-sm border border-border bg-background overflow-hidden mb-8 shadow-sm">
              <div className="h-9 border-b border-border bg-muted/20 flex items-center px-3 gap-3">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-background px-2 py-1 rounded text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 border border-border shadow-sm max-w-sm w-full truncate justify-center">
                    <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">{analyzedUrl}</span>
                  </div>
                </div>
                <div className="w-[30px] shrink-0" />
              </div>
              
              <div className="relative aspect-video bg-muted/10 w-full overflow-hidden flex items-center justify-center min-h-[300px]">
                {screenshotData ? (
                  <img
                    key={screenshotData.substring(0, 50)} 
                    src={screenshotData}
                    alt="Live Agent View"
                    className="w-full h-full object-contain object-top animate-in fade-in"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50 gap-3">
                    {isLoading ? (
                      <>
                        <div className="h-32 w-64 bg-border/20 rounded-sm animate-pulse" />
                        <div className="h-4 w-32 bg-border/20 rounded-sm animate-pulse" />
                      </>
                    ) : error ? (
                      <>
                        <FileWarning className="w-8 h-8 text-rose-500/50" />
                        <p className="text-xs">Stream unavailable</p>
                      </>
                    ) : (
                      <p className="text-xs">Awaiting stream...</p>
                    )}
                  </div>
                )}
                
                {screenshotData && agentLogs.length > 0 && isLoading && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-foreground text-background px-3 py-1.5 rounded-sm text-[10px] font-mono shadow-md max-w-[80%] truncate animate-in fade-in slide-in-from-bottom-2">
                    {agentLogs[agentLogs.length - 1]}
                  </div>
                )}
              </div>
            </div>

            {(!isLoading || testsPerformed.length > 0 || visualIssues.length > 0) && (
              <div className="flex-1 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-end justify-between mb-6 pb-2 border-b border-border">
                  <div>
                    <h2 className="text-lg font-medium tracking-tight">Report</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isLoading ? "Analyzing..." : `Found ${visualIssues.length} issues.`}
                    </p>
                  </div>
                  {!isLoading && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-sm text-[10px] font-medium uppercase tracking-wider">
                      <CheckCircle className="w-3 h-3" />
                      Complete
                    </div>
                  )}
                </div>

                {testsPerformed.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Coverage</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {testsPerformed.map((test, i) => (
                        <div 
                          key={i} 
                          className="text-[11px] px-2 py-1 bg-muted/30 border border-border/40 rounded-sm text-foreground/70 flex items-center gap-1.5 animate-in fade-in zoom-in-95"
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/50" />
                          {test}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Findings</h3>
                  
                  {visualIssues.length === 0 && !isLoading ? (
                    <div className="border border-border/40 rounded-sm p-8 flex flex-col items-center justify-center text-center bg-muted/5">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                      <h4 className="text-sm font-medium mb-1">Clean Build</h4>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        No layout, content, design, or accessibility anomalies detected.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col border border-border/40 rounded-sm overflow-hidden bg-background">
                      {visualIssues.map((issue, i) => (
                        <div
                          key={issue.id || i}
                          className={cn(
                            "group border-b border-border/40 last:border-b-0 p-4 transition-colors hover:bg-muted/10 animate-in fade-in slide-in-from-bottom-2",
                          )}
                          style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1 bg-muted/50 rounded-sm shrink-0">
                                {getIssueTypeIcon(issue.type)}
                              </div>
                              <h4 className="font-medium text-sm text-foreground">{issue.title}</h4>
                            </div>
                            <span className={cn(
                              "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm border shrink-0",
                              getSeverityBadgeStyles(issue.severity)
                            )}>
                              {issue.severity}
                            </span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                            {issue.description}
                          </p>
                          
                          {(issue.element || (issue.suggestions && issue.suggestions.length > 0)) && (
                            <div className="mt-3 pl-8 grid gap-3 sm:grid-cols-[auto_1fr] items-start">
                              {issue.element && (
                                <div className="sm:max-w-[200px]">
                                  <span className="text-[9px] uppercase font-medium text-muted-foreground/60 block mb-1">Selector</span>
                                  <code className="text-[10px] bg-muted/30 text-foreground px-1.5 py-0.5 rounded-sm border border-border/40 block truncate" title={issue.element}>
                                    {issue.element}
                                  </code>
                                </div>
                              )}
                              
                              {issue.suggestions && issue.suggestions.length > 0 && (
                                <div>
                                  <span className="text-[9px] uppercase font-medium text-muted-foreground/60 block mb-1">Recommendation</span>
                                  <ul className="space-y-1">
                                    {issue.suggestions.map((sug, idx) => (
                                      <li key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                        <span className="text-foreground/30 mt-px shrink-0">›</span>
                                        <span className="leading-snug">{sug}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
