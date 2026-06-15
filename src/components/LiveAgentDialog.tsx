"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LiveAgentRunner } from '@/components/LiveAgentRunner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import type { JiraIssue } from '@/app/actions';

interface LiveAgentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  issue: JiraIssue | null;
  projectId: string;
}

export function LiveAgentDialog({ isOpen, onOpenChange, issue, projectId }: LiveAgentDialogProps) {
  const { user, activeWorkspace } = useAuth();
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  useEffect(() => {
    if (isOpen && issue && activeWorkspace && projectId && user) {
      loadContext();
    }
  }, [isOpen, issue, activeWorkspace, projectId, user]);

  const loadContext = async () => {
    setIsLoadingContext(true);
    setTargetUrl('');
    setInstructions('');

    try {
      // 1. Fetch Target URL
      const { data: setupData } = await supabase
        .from('playwright_setups')
        .select('base_url')
        .eq('workspace_id', activeWorkspace!.id)
        .eq('project_id', projectId)
        .single();
        
      if (setupData?.base_url) {
        setTargetUrl(setupData.base_url);
      }

      // 2. Fetch Test Cases
      const { data: scriptsData } = await supabase
        .from('saved_scripts')
        .select('test_cases')
        .eq('user_id', user!.uid)
        .eq('jira_issue_key', issue!.key)
        .not('test_cases', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let testCasesText = '';
      if (scriptsData?.test_cases && scriptsData.test_cases.length > 0) {
        testCasesText = scriptsData.test_cases.map((tc: any, index: number) => 
          `Test Case ${index + 1}: ${tc.title}\nDescription: ${tc.description}\nSteps:\n${tc.steps?.map((s: string) => `- ${s}`).join('\n')}\nExpected Result: ${tc.expectedResult}`
        ).join('\n\n');
      }

      // 3. Construct Instructions
      const prompt = `Context from Jira Issue (${issue!.key}):
Summary: ${issue!.summary}
Description: ${issue!.description || 'N/A'}
Acceptance Criteria: ${issue!.acceptanceCriteria || 'N/A'}

${testCasesText ? `Test Cases to Execute:\n${testCasesText}` : 'Please explore and test the main functionality related to this issue.'}`;

      setInstructions(prompt);
    } catch (err) {
      console.error("Failed to load context for Live Agent", err);
    } finally {
      setIsLoadingContext(false);
    }
  };

  if (!issue) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden bg-background">
        <DialogHeader className="p-4 border-b shrink-0 bg-muted/20">
          <DialogTitle className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-mono">{issue.key}</span>
            Live Agent
          </DialogTitle>
          <DialogDescription className="mt-1 line-clamp-1">
            {issue.summary}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden relative">
          {isLoadingContext ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground font-medium">Gathering Issue Context & Test Cases...</p>
            </div>
          ) : null}
          <LiveAgentRunner 
            initialUrl={targetUrl} 
            initialInstructions={instructions}
            autoStart={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
