
"use client";

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PlaywrightSetupSchema, type PlaywrightSetup, type GenerateTestCasesOutput } from '@/lib/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectSelector } from '@/components/ProjectSelector';
import { IssueTable } from '@/components/IssueTable';
import { generateTestCasesAction, generatePlaywrightCodeAction, type JiraIssue, attachTestCasesToJiraAction, convertTestCasesToExcel } from '@/app/actions';
import { Bot, Info, Loader2, AlertCircle, Wand2, Clipboard, Check, Table as TableIcon, Code, Search, FileSpreadsheet, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JiraTicketPreviewDialog } from '@/components/JiraTicketPreviewDialog';
import { ProjectContext } from '@/contexts/ProjectContext';

export default function PlaywrightGeneratorPage() {
  const { isAuthenticated, credentials } = useAuth();
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

  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const resetGenerationState = () => {
    setSelectedIssue(null);
    setGeneratedCode(null);
    setGeneratedTestCases(null);
    setError(null);
  }

  const handleGenerateCodeClick = (issue: JiraIssue) => {
    let playwrightSetup: PlaywrightSetup | null = null;
    try {
      const savedSetup = localStorage.getItem(`playwrightSetup_${issue.project.id}`);
      if (savedSetup) {
        playwrightSetup = PlaywrightSetupSchema.parse(JSON.parse(savedSetup));
      }
    } catch {
      playwrightSetup = null;
    }

    if (!playwrightSetup) {
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

    generateTestCasesAction({
      description: issue.description || '',
      acceptanceCriteria: issue.acceptanceCriteria || '',
      projectKey: issue.project.key,
      coverageLevel: 'Basic',
    })
    .then(testCases => {
      setGeneratedTestCases(testCases);
      if (testCases.length === 0) {
        throw new Error("No test cases could be generated from the issue. Cannot proceed to code generation.");
      }
      return generatePlaywrightCodeAction({
        testCases,
        playwrightSetup: playwrightSetup!,
        projectName: issue.project.name,
      });
    })
    .then(codeResult => {
      setGeneratedCode(codeResult.playwrightCode);
    })
    .catch(err => {
      setError(err.message || "An unexpected error occurred during generation.");
      toast({
        title: 'Generation Failed',
        description: err.message,
        variant: 'destructive',
      });
    })
    .finally(() => {
      setIsGenerating(false);
    });
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
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        Generated Artifacts for {selectedIssue?.key}: <span className="text-muted-foreground font-normal text-xl">{selectedIssue?.summary}</span>
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
                                    <div className="max-h-[60vh] overflow-y-auto relative border rounded-lg">
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
                                    <div className="max-h-[60vh] overflow-y-auto rounded-md bg-gray-900">
                                    <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }} wrapLongLines={true}>
                                        {generatedCode || "// Code will appear here..."}
                                    </SyntaxHighlighter>
                                    </div>
                                    {generatedCode && (
                                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 text-gray-300 hover:text-white hover:bg-white/20" onClick={copyToClipboard}>
                                            {hasCopied ? <Check className="h-4 w-4 text-green-400" /> : <Clipboard className="h-4 w-4" />}
                                            <span className="sr-only">Copy code</span>
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
    </div>
  );
}
