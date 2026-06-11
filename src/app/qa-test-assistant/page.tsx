
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
import { LogOut, Info, Bug, FileUp, Search, TestTube } from 'lucide-react';
import Link from 'next/link';
import { ProjectContext } from '@/contexts/ProjectContext';
import { AuthForm } from '@/components/AuthForm';
import { motion } from 'motion/react';

export default function QATestAssistantPage() {
  const { isAuthenticated, credentials, logout } = useAuth();
  const { 
    selectedProject, 
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

  if (!isClient) return null; 

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <AuthForm />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl min-h-screen font-sans">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TestTube className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            QA Dashboard
          </h1>
        </div>
        <p className="text-muted-foreground md:ml-13 max-w-2xl text-base">
          Connect to Jira to view issues, raise bugs, generate test cases, and create Playwright tests.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 mb-8 bg-card border rounded-xl shadow-sm"
      >
        <div className="w-full md:w-auto md:min-w-[300px]">
          {credentials && <ProjectSelector />}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {selectedProject && (
            <>
              <Button 
                variant="outline" 
                asChild
                className="transition-transform active:scale-[0.98] font-medium"
              >
                <Link href="/qa-test-assistant/document-importer">
                  <FileUp className="mr-2 h-4 w-4" /> Import Docs
                </Link>
              </Button>
              <Button 
                onClick={openRaiseBugModal}
                className="transition-transform active:scale-[0.98] font-medium shadow-sm"
              >
                <Bug className="mr-2 h-4 w-4" /> Raise Bug
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            onClick={logout}
            className="transition-transform active:scale-[0.98] text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" /> Disconnect
          </Button>
        </div>
      </motion.div>

      {!selectedProject ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-20 px-4 text-center border rounded-2xl bg-muted/30 border-dashed"
        >
          <div className="h-16 w-16 rounded-full bg-background border shadow-sm flex items-center justify-center mb-6">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight mb-2 text-foreground">Select a Project</h3>
          <p className="text-base text-muted-foreground max-w-md mb-6">
            Choose a Jira project from the dropdown above to view issues, raise bugs, or import test cases from a document.
          </p>
          <Button variant="outline" asChild className="transition-transform active:scale-[0.98]">
            <Link href="/qa-test-assistant/setup">Need help with setup?</Link>
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search issues in ${selectedProject.name}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 transition-colors focus-visible:ring-1 focus-visible:border-primary"
              />
            </div>
            <Button 
              type="submit" 
              variant="secondary"
              className="h-10 transition-transform active:scale-[0.98]"
            >
              Search
            </Button>
            {activeSearch && (
              <Button 
                variant="ghost" 
                onClick={clearSearch}
                className="h-10 text-muted-foreground hover:text-foreground transition-transform active:scale-[0.98]"
              >
                Clear
              </Button>
            )}
          </form>
          
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <IssueTable
              projectId={selectedProject.id}
              onActionClick={handleGenerateTestCases}
              actionType="generateTests"
              onViewIssueClick={handlePreviewIssue}
              searchQuery={activeSearch}
            />
          </div>
        </motion.div>
      )}
      
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
