
"use client";

import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PlaywrightSetupSchema, type PlaywrightSetup, type GenerateTestCasesOutput } from '@/lib/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectSelector } from '@/components/ProjectSelector';
import { IssueTable } from '@/components/IssueTable';
import { generateTestCasesAction, generatePlaywrightCodeAction, type JiraIssue, attachTestCasesToJiraAction, convertTestCasesToExcel } from '@/app/actions';
import { Bot, Info, Loader2, AlertCircle, Wand2, Clipboard, Check, Table as TableIcon, Code, Search, FileSpreadsheet, Download, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { supabase } from '@/lib/supabase';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { JiraTicketPreviewDialog } from '@/components/JiraTicketPreviewDialog';
import { ProjectContext } from '@/contexts/ProjectContext';

export default function PlaywrightGeneratorPage() {
  const { isAuthenticated, credentials, user, activeWorkspace } = useAuth();
  const { toast } = useToast();
  const { 
    selectedProject, 
    searchTerm, 
    setSearchTerm,
    activeSearch,
    setActiveSearch
   } = useContext(ProjectContext);
  
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedTestCases, setGeneratedTestCases] = useState<GenerateTestCasesOutput | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [isTicketPreviewOpen, setIsTicketPreviewOpen] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveScriptName, setSaveScriptName] = useState("");
  const artifactsRef = useRef<HTMLDivElement>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const resetGenerationState = () => {
    setSelectedIssue(null);
    setGeneratedCode(null);
    setGeneratedTestCases(null);
    setError(null);
  }

  const handleGenerateCodeClick = async (issue: JiraIssue, forceRegenerate = false) => {
    if (!activeWorkspace) {
      toast({
        title: "Workspace Required",
        description: "Please select a workspace before generating code.",
        variant: "destructive",
      });
      return;
    }

    let playwrightSetup: PlaywrightSetup | null = null;
    try {
      const { data, error } = await supabase
        .from('playwright_setups')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .eq('project_id', issue.project.id)
        .single();
        
      if (data && !error) {
        playwrightSetup = {
          baseUrl: data.base_url || '',
          authFlow: data.auth_flow || '',
          commonSelectors: data.common_selectors || '',
          boilerplate: data.boilerplate || ''
        };
      }
    } catch (e) {
      console.error("Failed to load Playwright setup from Supabase", e);
    }

    if (!playwrightSetup || !playwrightSetup.baseUrl) {
      toast({
        title: "Playwright Setup Required",
        description: "Please configure the Playwright settings for this project before generating code.",
        variant: "destructive",
      });
      return;
    }
    
    resetGenerationState();
    setSelectedIssue(issue);
    setIsGenerating(true);

    try {
      if (!forceRegenerate && user && activeWorkspace) {
        const { data, error } = await supabase
          .from('saved_scripts')
          .select('code, test_cases')
          .eq('workspace_id', activeWorkspace.id)
          .eq('jira_issue_key', issue.key)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          setGeneratedCode(data.code);
          setGeneratedTestCases(data.test_cases);
          toast({
            title: "Loaded from Library",
            description: "An existing script for this issue was found and loaded instantly.",
          });
          setTimeout(() => {
            artifactsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
          setIsGenerating(false);
          return;
        }
      }

      const testCases = await generateTestCasesAction({
        description: issue.description || '',
        acceptanceCriteria: issue.acceptanceCriteria || '',
        projectKey: issue.project.key,
        coverageLevel: 'Max',
      });

      setGeneratedTestCases(testCases);
      if (testCases.length === 0) {
        throw new Error("No test cases could be generated from the issue. Cannot proceed to code generation.");
      }

      const codeResult = await generatePlaywrightCodeAction({
        testCases,
        playwrightSetup: playwrightSetup,
        projectName: issue.project.name,
      });

      setGeneratedCode(codeResult.playwrightCode);
      setTimeout(() => {
        artifactsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during generation.");
      toast({
        title: 'Generation Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchTerm);
  };
  
  const clearSearch = () => {
    setSearchTerm('');
    setActiveSearch('');
  };
  
  const handlePreviewIssue = (issue: JiraIssue) => {
    setSelectedIssue(issue);
    setIsTicketPreviewOpen(true);
  };

  const handleGenerateFromPreview = (issue: JiraIssue) => {
    setIsTicketPreviewOpen(false);
    setTimeout(() => {
        handleGenerateCodeClick(issue);
    }, 150);
  };

  const handleAttachToJira = async () => {
    if (!credentials || !selectedIssue || !generatedTestCases || generatedTestCases.length === 0) return;

    setIsAttaching(true);
    try {
      const result = await attachTestCasesToJiraAction(credentials, {
        issueKey: selectedIssue.key,
        testCases: generatedTestCases,
        projectId: selectedIssue.project.id,
      });

      toast({
        title: result.success ? 'Success' : 'Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
        duration: 10000,
      });
    } catch (err: any) {
      toast({
        title: 'Error Attaching Test Cases',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsAttaching(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!selectedIssue || !generatedTestCases || generatedTestCases.length === 0) return;
    setIsDownloading(true);
    try {
        const buffer = await convertTestCasesToExcel(generatedTestCases);
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-cases-${selectedIssue.key}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({
            title: "Download Started",
            description: "Your test cases Excel file is downloading.",
        });
    } catch (err: any) {
        toast({
            title: "Download Failed",
            description: "Could not create the Excel file for download.",
            variant: "destructive",
        });
    } finally {
        setIsDownloading(false);
    }
  };

  const handleSaveToLibraryClick = () => {
    let defaultName = "Generated Playwright Script";
    if (selectedIssue?.key) {
      defaultName = `Test for ${selectedIssue.key}`;
    }
    setSaveScriptName(defaultName);
    setIsSaveDialogOpen(true);
  };

  const confirmSaveToLibrary = async () => {
    if (!generatedCode || !user || !saveScriptName.trim()) return;
    if (!activeWorkspace) {
      toast({ title: "Error", description: "No active workspace selected.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Not authenticated with Supabase");

      const { error } = await supabase.from('saved_scripts').insert([{
        user_id: authData.user.id,
        workspace_id: activeWorkspace.id,
        name: saveScriptName.trim(),
        jira_issue_key: selectedIssue?.key || null,
        code: generatedCode,
        test_cases: generatedTestCases
      }]);

      if (error) throw error;

      toast({
        title: "Saved to Library",
        description: "Your script has been saved to the Code Library.",
      });
      setIsSaveDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err.message || "An unexpected error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  if (!isClient) return null;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center">
          <Alert className="max-w-xl">
              <Info className="h-4 w-4" />
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>Please connect to Jira on the main page to use the Playwright Generator.</AlertDescription>
          </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <Card className="shadow-lg mb-8">
            <CardHeader>
                <CardTitle className="text-3xl font-bold flex items-center">
                    <Bot className="mr-3 h-8 w-8 text-primary" />
                    Playwright Code Generator
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                    Select a project, choose an issue, and let AI generate your Playwright test code.
                    <Button variant="link" asChild className="p-0 h-auto ml-1 text-lg">
                      <Link href="/qa-test-assistant/playwright-setup">Go to Setup</Link>
                    </Button>
                </CardDescription>
            </CardHeader>
             <CardContent className="space-y-6">
                <ProjectSelector disabled={isGenerating} />
                {selectedProject && (
                    <div className="pt-4">
                        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={`Search issues in ${selectedProject.name}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                    disabled={isGenerating}
                                />
                            </div>
                            <Button type="submit" disabled={isGenerating}>Search</Button>
                            {activeSearch && (
                                <Button variant="ghost" onClick={clearSearch} disabled={isGenerating}>Clear</Button>
                            )}
                        </form>
                        <IssueTable
                            projectId={selectedProject.id}
                            onActionClick={handleGenerateCodeClick}
                            onViewIssueClick={handlePreviewIssue}
                            actionType="generateCode"
                            isActionDisabled={isGenerating}
                            searchQuery={activeSearch}
                        />
                    </div>
                )}
            </CardContent>
        </Card>

        {isGenerating && (
            <div className="flex flex-col items-center justify-center text-center mt-10 p-8 border-2 border-dashed rounded-lg">
                <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                <p className="text-xl font-semibold text-foreground">Generating Code for {selectedIssue?.key}</p>
                <p className="text-muted-foreground">First, AI is creating test cases, then it will write the code... Please wait.</p>
            </div>
        )}
        
        {!isGenerating && error && (
            <Alert variant="destructive" className="mt-8">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Generation Error for {selectedIssue?.key}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {!isGenerating && (generatedTestCases || generatedCode) && (
            <Card className="mt-8" ref={artifactsRef}>
                <CardHeader>
                    <CardTitle className="text-2xl flex justify-between items-center">
                        <div>
                            Generated Artifacts for {selectedIssue?.key}: <span className="text-muted-foreground font-normal text-xl">{selectedIssue?.summary}</span>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => selectedIssue && handleGenerateCodeClick(selectedIssue, true)}
                            disabled={isGenerating}
                        >
                            <Wand2 className="mr-2 h-4 w-4" />
                            Regenerate with AI
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="test-cases" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="test-cases"><TableIcon className="mr-2 h-4 w-4" /> Generated Test Cases</TabsTrigger>
                            <TabsTrigger value="playwright-code"><Code className="mr-2 h-4 w-4" /> Generated Code</TabsTrigger>
                        </TabsList>
                        <TabsContent value="test-cases">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Test Cases</CardTitle>
                                    <CardDescription>
                                        Review the AI-generated test cases below. These were used as the basis for the Playwright code.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {generatedTestCases && generatedTestCases.length > 0 && (
                                    <div className="flex gap-2 mb-4">
                                        <Button onClick={handleDownloadExcel} variant="secondary" disabled={isDownloading}>
                                            {isDownloading ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Download className="mr-2 h-4 w-4" />)}
                                            {isDownloading ? 'Downloading...' : 'Download as Excel'}
                                        </Button>
                                        <Button onClick={handleAttachToJira} disabled={isAttaching}>
                                            {isAttaching ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<FileSpreadsheet className="mr-2 h-4 w-4" />)}
                                            {isAttaching ? 'Attaching...' : 'Attach as Excel File'}
                                        </Button>
                                    </div>
                                    )}
                                    <div className="h-[60vh] overflow-y-auto relative border rounded-lg">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card shadow-sm">
                                            <TableRow>
                                            <TableHead className="w-[120px]">ID</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Precondition</TableHead>
                                            <TableHead>Steps</TableHead>
                                            <TableHead>Expected Result</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {generatedTestCases?.map((tc, index) => (
                                            <TableRow key={tc.testCaseId || index}>
                                                <TableCell className="font-medium align-top text-xs">{tc.testCaseId}</TableCell>
                                                <TableCell className="align-top text-sm">{tc.testCaseName}</TableCell>
                                                <TableCell className="align-top text-sm">{tc.precondition}</TableCell>
                                                <TableCell className="align-top">
                                                    <ul className="list-decimal list-inside text-sm space-y-1">
                                                        {tc.testSteps.map((step, i) => <li key={i}>{step}</li>)}
                                                    </ul>
                                                </TableCell>
                                                <TableCell className="align-top text-sm">{tc.expectedResult}</TableCell>
                                            </TableRow>
                                            ))}
                                        </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="playwright-code">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Playwright Code</CardTitle>
                                    <CardDescription>
                                        This code was generated using the Page Object Model (POM) pattern.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="relative">
                                    <div className="h-[60vh] overflow-y-auto overflow-x-auto rounded-md bg-gray-900 border">
                                    <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
                                        {generatedCode ? generatedCode.replace(/\\n/g, '\n').replace(/^```(?:typescript)?\n?/i, '').replace(/```$/i, '').trim() : "// Code will appear here..."}
                                    </SyntaxHighlighter>
                                    </div>
                                    {generatedCode && (
                                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 text-gray-300 hover:text-white hover:bg-white/20" onClick={copyToClipboard}>
                                            {hasCopied ? <Check className="h-4 w-4 text-green-400" /> : <Clipboard className="h-4 w-4" />}
                                            <span className="sr-only">Copy code</span>
                                        </Button>
                                    )}
                                    {generatedCode && (
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            className="absolute bottom-4 right-4 shadow-md bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm border-white/20" 
                                            onClick={handleSaveToLibraryClick}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            {isSaving ? "Saving..." : "Save to Library"}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        )}

        <JiraTicketPreviewDialog
            isOpen={isTicketPreviewOpen}
            onClose={() => setIsTicketPreviewOpen(false)}
            onGenerateTests={handleGenerateFromPreview}
            issue={selectedIssue}
        />

        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="h-5 w-5 text-primary" />
                Save to Code Library
              </DialogTitle>
              <DialogDescription>
                Provide a descriptive name for this test script so you can easily identify it later in your library.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 py-4">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="scriptName" className="sr-only">
                  Script Name
                </Label>
                <Input
                  id="scriptName"
                  value={saveScriptName}
                  onChange={(e) => setSaveScriptName(e.target.value)}
                  placeholder="e.g. Login Flow E2E Test"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      confirmSaveToLibrary();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setIsSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmSaveToLibrary} disabled={!saveScriptName.trim() || isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSaving ? "Saving..." : "Save Script"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
