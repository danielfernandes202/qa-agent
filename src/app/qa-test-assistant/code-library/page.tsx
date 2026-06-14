"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Code, Trash2, Check, Clipboard, Library, ExternalLink, CalendarDays } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SavedScript {
  id: string;
  name: string;
  jira_issue_key: string | null;
  code: string;
  test_cases: any;
  created_at: string;
}

export default function CodeLibraryPage() {
  const { isAuthenticated, user, activeWorkspace } = useAuth();
  const { toast } = useToast();
  
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const fetchScripts = async () => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || !activeWorkspace) return;

      const { data, error } = await supabase
        .from('saved_scripts')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScripts(data || []);
    } catch (err: any) {
      console.error("Failed to fetch scripts:", err);
      toast({
        title: "Error fetching library",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeWorkspace) {
      fetchScripts();
    }
  }, [isAuthenticated, activeWorkspace]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this saved script? This action cannot be undone.")) return;
    
    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from('saved_scripts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setScripts(prev => prev.filter(s => s.id !== id));
      toast({
        title: "Script deleted",
        description: "The script has been removed from your library.",
      });
    } catch (err: any) {
      toast({
        title: "Deletion failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isClient) return null;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center h-[50vh]">
          <div className="text-center space-y-4">
            <Library className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold">Please log in</h2>
            <p className="text-muted-foreground">You must be logged in to view your Code Library.</p>
          </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Library className="h-8 w-8 text-primary" />
          Code Library
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Your saved Playwright test scripts and AI-generated test cases.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : scripts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-muted/5">
            <Code className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Your library is empty</h3>
            <p className="text-muted-foreground max-w-md mb-6">
                You haven't saved any test scripts yet. Go to the Playwright Generator to create and save some scripts!
            </p>
            <Button asChild>
                <a href="/qa-test-assistant/playwright-generator">Go to Playwright Generator</a>
            </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scripts.map((script) => (
            <Card key={script.id} className="flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg line-clamp-1" title={script.name}>
                            {script.name}
                        </CardTitle>
                        {script.jira_issue_key && (
                            <CardDescription className="flex items-center mt-1 text-xs">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {script.jira_issue_key}
                            </CardDescription>
                        )}
                    </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-xs text-muted-foreground flex items-center mb-4">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  Saved {formatDistanceToNow(new Date(script.created_at), { addSuffix: true })}
                </div>
                
                <div className="bg-gray-900 rounded-md p-3 h-32 overflow-hidden relative border border-gray-800">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900 z-10 pointer-events-none" />
                    <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '0.7rem' }}>
                        {script.code.substring(0, 500) + "..."}
                    </SyntaxHighlighter>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4 bg-muted/20">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">View Details</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>{script.name}</DialogTitle>
                            <DialogDescription>
                                {script.jira_issue_key ? `Generated for issue ${script.jira_issue_key}` : 'Generated via Playwright Generator'}
                            </DialogDescription>
                        </DialogHeader>
                        
                        <Tabs defaultValue="code" className="flex-grow flex flex-col min-h-0">
                            <TabsList className="w-full justify-start border-b rounded-none px-0 bg-transparent h-12">
                                <TabsTrigger value="code" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Playwright Code</TabsTrigger>
                                {script.test_cases && (
                                    <TabsTrigger value="cases" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Test Cases</TabsTrigger>
                                )}
                            </TabsList>
                            <TabsContent value="code" className="flex-grow flex flex-col min-h-0 mt-4 relative">
                                <div className="flex-grow overflow-auto rounded-md bg-gray-900 border">
                                    <SyntaxHighlighter language="typescript" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
                                        {script.code.replace(/\\n/g, '\n')}
                                    </SyntaxHighlighter>
                                </div>
                                <Button 
                                    className="absolute top-4 right-4 shadow-md" 
                                    size="sm"
                                    onClick={() => handleCopyCode(script.code, script.id)}
                                >
                                    {copiedId === script.id ? <Check className="h-4 w-4 mr-2" /> : <Clipboard className="h-4 w-4 mr-2" />}
                                    {copiedId === script.id ? "Copied!" : "Copy Code"}
                                </Button>
                            </TabsContent>
                            
                            {script.test_cases && (
                                <TabsContent value="cases" className="flex-grow overflow-auto mt-4 border rounded-lg">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card shadow-sm">
                                            <TableRow>
                                            <TableHead className="w-[120px]">ID</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Steps</TableHead>
                                            <TableHead>Expected</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {script.test_cases.map((tc: any, index: number) => (
                                            <TableRow key={tc.testCaseId || index}>
                                                <TableCell className="font-medium align-top text-xs">{tc.testCaseId}</TableCell>
                                                <TableCell className="align-top text-sm">{tc.testCaseName}</TableCell>
                                                <TableCell className="align-top">
                                                    <ul className="list-decimal list-inside text-sm space-y-1">
                                                        {tc.testSteps?.map((step: string, i: number) => <li key={i}>{step}</li>)}
                                                    </ul>
                                                </TableCell>
                                                <TableCell className="align-top text-sm">{tc.expectedResult}</TableCell>
                                            </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            )}
                        </Tabs>
                    </DialogContent>
                </Dialog>

                <div className="flex gap-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleCopyCode(script.code, script.id)}
                        title="Copy code"
                    >
                        {copiedId === script.id ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(script.id)}
                        disabled={isDeleting === script.id}
                        title="Delete script"
                    >
                        {isDeleting === script.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
