
"use client";

import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '@/context/auth-context';
import { ProjectSelector } from '@/components/ProjectSelector';
import { IssueTable } from '@/components/IssueTable';
import { TestCaseDialog } from '@/components/TestCaseDialog';
import { RaiseBugModal } from '@/components/RaiseBugModal';
import { JiraTicketPreviewDialog } from '@/components/JiraTicketPreviewDialog';
import type { JiraIssue } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Info, Bug, FileUp, Search, Eye, TestTube } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ProjectContext } from '@/contexts/ProjectContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuthForm } from '@/components/AuthForm';

export default function QATestAssistantPage() {
  const { isAuthenticated, credentials, logout } = useAuth();
  const { 
    selectedProject, 
    setSelectedProject, 
    searchTerm, 
    setSearchTerm,
    activeSearch,
    setActiveSearch
   } = useContext(ProjectContext);
  
  const [isRaiseBugModalOpen, setIsRaiseBugModalOpen] = useState(false);
  const [isTestCaseDialogOpen, setIsTestCaseDialogOpen] = useState(false);
  const [isTicketPreviewOpen, setIsTicketPreviewOpen] = useState(false);
  
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleGenerateTestCases = (issue: JiraIssue) => {
    setSelectedIssue(issue);
    setIsTestCaseDialogOpen(true);
  };
  
  const handlePreviewIssue = (issue: JiraIssue) => {
    setSelectedIssue(issue);
    setIsTicketPreviewOpen(true);
  };

  const handleGenerateTestsFromPreview = (issue: JiraIssue) => {
    setIsTicketPreviewOpen(false);
    // Use a short timeout to allow the preview dialog to close before opening the new one
    setTimeout(() => {
        handleGenerateTestCases(issue);
    }, 150);
  };

  const openRaiseBugModal = () => {
    if (selectedProject) {
      setIsRaiseBugModalOpen(true);
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

  if (!isClient) {
    return null; 
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <TestTube className="mr-3 h-8 w-8 text-primary" />
            QA Test Assistant Dashboard
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Connect to Jira to view issues, raise bugs, generate test cases, and create Playwright tests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border rounded-lg bg-background/50">
                <div className="flex-grow">
                    {credentials && <ProjectSelector />}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    {selectedProject && (
                        <>
                        <Button variant="outline" asChild>
                            <Link href="/qa-test-assistant/document-importer">
                                <FileUp className="mr-2 h-4 w-4" /> Import from Doc
                            </Link>
                        </Button>
                        <Button onClick={openRaiseBugModal}>
                            <Bug className="mr-2 h-4 w-4" /> Raise Bug
                        </Button>
                        </>
                    )}
                    <Button variant="outline" onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" /> Disconnect Jira
                    </Button>
                </div>
            </div>

             {!selectedProject ? (
                <Alert className="border-primary/20">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Select a Project to Continue</AlertTitle>
                    <AlertDescription>
                        Please choose a project from the dropdown above to view issues, raise bugs, or import from a document.
                         <Button variant="link" asChild className="p-0 h-auto ml-1 font-normal">
                           <Link href="/qa-test-assistant/setup">Need help with setup?</Link>
                         </Button>
                    </AlertDescription>
                </Alert>
            ) : (
                <div>
                    <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={`Search issues in ${selectedProject.name}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button type="submit">Search</Button>
                        {activeSearch && (
                            <Button variant="ghost" onClick={clearSearch}>Clear</Button>
                        )}
                    </form>
                    <IssueTable
                        projectId={selectedProject.id}
                        onActionClick={handleGenerateTestCases}
                        actionType="generateTests"
                        onViewIssueClick={handlePreviewIssue}
                        searchQuery={activeSearch}
                    />
                </div>
            )}
        </CardContent>
      </Card>
      
      {isRaiseBugModalOpen && selectedProject && credentials && (
        <RaiseBugModal
          isOpen={isRaiseBugModalOpen}
          onClose={() => setIsRaiseBugModalOpen(false)}
          projectId={selectedProject.id}
          projectKey={selectedProject.key}
          projectName={selectedProject.name}
        />
      )}

      <TestCaseDialog
        isOpen={isTestCaseDialogOpen}
        onClose={() => setIsTestCaseDialogOpen(false)}
        issue={selectedIssue}
      />

      <JiraTicketPreviewDialog
        isOpen={isTicketPreviewOpen}
        onClose={() => setIsTicketPreviewOpen(false)}
        onGenerateTests={handleGenerateTestsFromPreview}
        issue={selectedIssue}
      />
    </div>
  );
}
