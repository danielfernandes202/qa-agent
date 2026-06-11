
"use client";

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { VisualIssue, LiveTestingOutput } from "@/lib/schemas";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Play,
  MonitorSmartphone,
  Link2,
  CheckCircle,
  FileWarning,
  Palette,
  ScanText,
  Accessibility,
  LayoutTemplate,
  Lightbulb,
  HardDrive,
  GanttChartSquare,
  X
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const crawlSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
  instructions: z.string().optional(),
  testDepth: z.enum(['basic', 'standard', 'deep']).default('basic'),
});

type CrawlFormValues = z.infer<typeof crawlSchema>;

function VisualTesterForm({ onFormSubmit, isSubmitting }: { onFormSubmit: (data: CrawlFormValues) => void; isSubmitting: boolean; }) {
  const form = useForm<CrawlFormValues>({
    resolver: zodResolver(crawlSchema),
    defaultValues: {
      url: 'https://stytch.com/',
      instructions: '',
      testDepth: 'basic',
    },
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center">
            <MonitorSmartphone className="mr-3 h-6 w-6 text-primary" />
            Visual &amp; Link Tester
        </CardTitle>
        <CardDescription className="text-md text-muted-foreground">
            Enter a URL to get a comprehensive report. We'll show a live preview if possible, or a screenshot if not.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Website URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions / Credentials (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Please test the login flow using test@example.com / Password123!" {...field} />
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
                  <FormLabel>Test Depth</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select test depth" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basic">Basic (4 Actions) - Quick Check</SelectItem>
                      <SelectItem value="standard">Standard (10 Actions) - Normal Run</SelectItem>
                      <SelectItem value="deep">Deep (25 Actions) - Comprehensive E2E</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ResultsDisplay({ visualIssues, testsPerformed, agentLogs }: { visualIssues: VisualIssue[], testsPerformed: string[], agentLogs: string[] }) {
    const getSeverityVariant = (
        severity: VisualIssue["severity"]
      ): "destructive" | "default" | "secondary" | "outline" => {
        switch (severity) {
          case "critical":
          case "high":
            return "destructive";
          case "medium":
            return "default";
          case "low":
            return "secondary";
          default:
            return "outline";
        }
      };
    
      const getIssueTypeIcon = (type: VisualIssue["type"]) => {
        switch (type) {
          case "layout":
            return <LayoutTemplate className="h-4 w-4 text-blue-500" />;
          case "content":
            return <ScanText className="h-4 w-4 text-green-500" />;
          case "design":
            return <Palette className="h-4 w-4 text-purple-500" />;
          case "accessibility":
            return <Accessibility className="h-4 w-4 text-orange-500" />;
          default:
            return <FileWarning className="h-4 w-4 text-gray-500" />;
        }
      };

      return (
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Analysis Report</CardTitle>
            <CardDescription>
              Found {visualIssues.length} potential visual issue(s) and performed{" "}
              {testsPerformed.length} action(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="visual-issues" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visual-issues">
                  <MonitorSmartphone className="mr-2 h-4 w-4" /> Visual Issues ({visualIssues.length})
                </TabsTrigger>
                <TabsTrigger value="agent-logs">
                  <ScanText className="mr-2 h-4 w-4" /> Agent Actions
                </TabsTrigger>
              </TabsList>
    
              <TabsContent value="visual-issues">
                <ScrollArea className="h-[calc(100vh-22rem)]">
                    {visualIssues.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <h3 className="mt-4 text-lg font-medium">
                        No Visual Issues Found
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                        The AI agent did not detect any significant UI/UX or accessibility issues.
                        </p>
                    </div>
                    ) : (
                    <Accordion
                        type="single"
                        collapsible
                        className="w-full mt-4"
                        defaultValue="item-0"
                    >
                        {(visualIssues || []).map((issue, index) => (
                        <AccordionItem value={`item-${index}`} key={issue.id || index}>
                            <AccordionTrigger>
                            <div className="flex items-center gap-4 flex-grow text-left">
                                {getIssueTypeIcon(issue.type)}
                                <span className="flex-grow font-semibold">
                                {issue.title}
                                </span>
                                <Badge
                                variant={getSeverityVariant(issue.severity)}
                                className="capitalize ml-auto"
                                >
                                {issue.severity}
                                </Badge>
                            </div>
                            </AccordionTrigger>
                            <AccordionContent>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                                <p className="text-sm text-muted-foreground">
                                {issue.description}
                                </p>
                                {issue.element && (
                                <div>
                                    <h4 className="font-semibold text-xs mb-1">
                                    Selector
                                    </h4>
                                    <code className="text-xs bg-gray-700 text-white p-1 rounded-sm">
                                    {issue.element}
                                    </code>
                                </div>
                                )}
                                <div>
                                <h4 className="font-semibold text-xs mb-2 flex items-center">
                                    <Lightbulb className="h-4 w-4 mr-1 text-yellow-400" />{" "}
                                    Suggestions
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {(issue.suggestions || []).map((suggestion, i) => (
                                    <li key={i}>{suggestion}</li>
                                    ))}
                                </ul>
                                </div>
                            </div>
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                    )}
                </ScrollArea>
              </TabsContent>
    
              <TabsContent value="agent-logs">
                <ScrollArea className="h-[calc(100vh-22rem)] mt-4 rounded-md border p-4 bg-muted/30">
                  <h4 className="font-semibold text-sm mb-2">Tests Performed</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-6">
                      {(testsPerformed || []).map((test, idx) => (
                          <li key={idx}>{test}</li>
                      ))}
                      {(!testsPerformed || testsPerformed.length === 0) && <li>No specific tests recorded.</li>}
                  </ul>

                  <h4 className="font-semibold text-sm mb-2">Internal Agent Logs</h4>
                  <div className="space-y-2 font-mono text-xs text-muted-foreground">
                      {(agentLogs || []).map((log, idx) => (
                          <div key={idx} className="border-b border-muted-foreground/10 pb-1">
                             &gt; {log}
                          </div>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      );
}

export default function VisualTesterPage() {
  const [visualIssues, setVisualIssues] = useState<VisualIssue[]>([]);
  const [testsPerformed, setTestsPerformed] = useState<string[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'none' | 'iframe' | 'image'>('none');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalysis = async (data: CrawlFormValues) => {
    setIsLoading(true);
    setError(null);
    setVisualIssues([]);
    setTestsPerformed([]);
    setAgentLogs([]);
    setAnalyzedUrl(data.url);
    setPreviewType('image');
    setScreenshotData(null);

    try {
        const response = await fetch('/api/live-tester', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: data.url, instructions: data.instructions, testDepth: data.testDepth })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server returned ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let done = false;

        let lastResult: any = null;

        let serverError: string | null = null;
        while (reader && !done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const parsed = JSON.parse(line.substring(6));
                            if (parsed.type === 'log') {
                                setAgentLogs(prev => [...prev, parsed.data]);
                            } else if (parsed.type === 'screenshot') {
                                setScreenshotData(parsed.data);
                            } else if (parsed.type === 'result') {
                                lastResult = parsed.data;
                                setVisualIssues(parsed.data.bugsIdentified || []);
                                setTestsPerformed(parsed.data.testsPerformed || []);
                                toast({
                                    title: "Analysis Complete",
                                    description: `Agent performed ${parsed.data.testsPerformed?.length || 0} actions and found ${parsed.data.bugsIdentified?.length || 0} issues.`,
                                });
                            } else if (parsed.type === 'error') {
                                serverError = parsed.data;
                            }
                        } catch (e) {
                            // Ignored parse error for partial chunks
                        }
                    }
                }
            }
            if (serverError) throw new Error(serverError);
        }
    } catch (err: any) {
        console.error("Live testing failed:", err);
        setError(err.message || "An unknown error occurred during the analysis.");
        toast({
            title: "Analysis Failed",
            description: err.message,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const renderPreview = () => {
    if (previewType === 'image') {
        return (
            <div className="w-full h-[calc(100vh-16rem)] border rounded-md relative bg-muted flex items-center justify-center overflow-hidden">
                {screenshotData ? (
                    <>
                        <img
                            src={screenshotData}
                            alt="Agent Live View"
                            className="w-full h-full object-contain object-top shadow-lg"
                        />
                        {agentLogs.length > 0 && (
                            <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white p-2 text-xs rounded">
                                {agentLogs[agentLogs.length - 1]}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-slate-500" />
                        <p>Waiting for agent to capture view...</p>
                        {agentLogs.length > 0 && (
                            <p className="text-xs mt-2 text-slate-500 max-w-sm text-center">
                                {agentLogs[agentLogs.length - 1]}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }
    return null;
  }
  
  const PreviewTitle = () => {
      return <><MonitorSmartphone className="mr-2 h-5 w-5"/> Agent Live View</>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <VisualTesterForm 
        onFormSubmit={handleAnalysis}
        isSubmitting={isLoading}
      />
      
      {error && !isLoading && (
            <Alert variant="destructive" className="mt-8">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
      )}

      {analyzedUrl ? (
         <div className="mt-8 grid md:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center">{PreviewTitle()}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setAnalyzedUrl(null)}>
                        <X className="h-4 w-4"/>
                    </Button>
                </CardHeader>
                <CardContent>
                    {renderPreview()}
                     <p className="text-xs text-muted-foreground mt-2">
                        You are watching a live stream of the headless browser as the agent interacts with it.
                    </p>
                </CardContent>
            </Card>
            <div className="sticky top-24">
                {isLoading && previewType === 'none' ? (
                    <Card className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                            <p className="mt-4 text-muted-foreground">Analyzing... please wait.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="lg:col-span-1 h-full min-h-[500px]">
                        {isLoading || visualIssues.length > 0 || error || testsPerformed.length > 0 ? (
                            <ResultsDisplay visualIssues={visualIssues} testsPerformed={testsPerformed} agentLogs={agentLogs} />
                        ) : null}
                    </div>
                )}
            </div>
         </div>
      ) : (
        <div className="mt-8 grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <HardDrive className="mr-2 h-5 w-5 text-primary"/>
                        How it Works
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2">
                    <p>1. **URL Check:** The system first checks if the site allows live previews.</p>
                    <p>2. **Preview &amp; Analyze:** A live preview is shown if possible; otherwise, a screenshot is taken. In parallel, links are crawled and the view is sent to an AI for analysis.</p>
                    <p>3. **Review:** See the preview/screenshot while the AI identifies potential layout bugs &amp; WCAG violations and checks link statuses.</p>
                    <p>4. **Report:** A comprehensive report is generated in the panel next to the preview.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <GanttChartSquare className="mr-2 h-5 w-5 text-primary"/>
                        What We Check For
                    </CardTitle>
                </CardHeader>
                  <CardContent className="text-muted-foreground space-y-3">
                    <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-1 text-primary/80 shrink-0"/>
                            <span><span className="font-medium text-foreground/90">Visual/Layout Issues:</span> Overlapping elements, broken grids, inconsistent spacing.</span>
                        </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-1 text-primary/80 shrink-0"/>
                            <span><span className="font-medium text-foreground/90">Accessibility (WCAG):</span> Poor color contrast, small text, tiny buttons, and more.</span>
                        </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-1 text-primary/80 shrink-0"/>
                            <span><span className="font-medium text-foreground/90">Broken Links:</span> All links on the page are checked for 4xx or 5xx status codes.</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
