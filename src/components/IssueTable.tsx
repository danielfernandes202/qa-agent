
"use client";
import type { JiraIssue, PaginatedIssuesResponse } from '@/app/actions';
import { fetchIssuesAction } from '@/app/actions';
import { useAuth } from '@/context/auth-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Bug, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, FileText, Wand2, Eye, Bot, Play } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import React, { useState, useEffect } from 'react';

interface IssueTableProps {
  projectId: string;
  onGenerateTestsClick?: (issue: JiraIssue) => void; // Made optional
  onViewIssueClick?: (issue: JiraIssue) => void;    // Made optional
  onActionClick?: (issue: JiraIssue) => void;       // Generic action
  onRunLiveAgentClick?: (issue: JiraIssue) => void; // Add Live Agent handler
  isActionDisabled?: boolean;
  searchQuery?: string;
  actionType?: 'generateTests' | 'generateCode';    // Optional to define button
}

const PAGE_SIZE = 10;

export function IssueTable({ 
    projectId, 
    onGenerateTestsClick, 
    onViewIssueClick,
    onActionClick,
    onRunLiveAgentClick,
    isActionDisabled = false, 
    searchQuery, 
    actionType 
}: IssueTableProps) {
  const { credentials } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: paginatedIssues, isLoading, error, isFetching } = useQuery<PaginatedIssuesResponse, Error>({
    queryKey: ['jiraIssues', projectId, currentPage, searchQuery, credentials?.jiraUrl],
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated');
      if (!projectId) throw new Error('Project ID is required');
      return fetchIssuesAction(credentials, { projectId, page: currentPage, pageSize: PAGE_SIZE, searchQuery });
    },
    enabled: !!credentials && !!projectId,
    keepPreviousData: true,
  });
  
  useEffect(() => {
    if (credentials && projectId && paginatedIssues && currentPage < paginatedIssues.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['jiraIssues', projectId, currentPage + 1, searchQuery, credentials?.jiraUrl],
        queryFn: () => fetchIssuesAction(credentials, { projectId, page: currentPage + 1, pageSize: PAGE_SIZE, searchQuery }),
      });
    }
  }, [paginatedIssues, currentPage, projectId, searchQuery, credentials, queryClient]);

  useEffect(() => {
    setCurrentPage(1);
  }, [projectId, searchQuery]);


  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('done') || lowerStatus.includes('resolved') || lowerStatus.includes('closed')) return 'default';
    if (lowerStatus.includes('in progress')) return 'secondary';
    if (lowerStatus.includes('to do') || lowerStatus.includes('open') || lowerStatus.includes('backlog')) return 'outline';
    return 'outline';
  };
  
  const getIssueTypeIcon = (issueType: string) => {
    const lowerType = issueType.toLowerCase();
    if (lowerType.includes('bug')) {
        return <Bug className="h-4 w-4 mr-2 text-destructive" />;
    }
    if (lowerType.includes('story')) {
        return <FileText className="h-4 w-4 mr-2 text-green-500" />;
    }
    if (lowerType.includes('task')) {
        return <FileText className="h-4 w-4 mr-2 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 mr-2 text-muted-foreground" />;
  };

  if (isLoading && !paginatedIssues) {
    return (
      <div className="space-y-4 mt-6">
        {[...Array(PAGE_SIZE)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg shadow-sm">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Fetching Issues</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  
  if (!paginatedIssues || paginatedIssues.issues.length === 0) {
    return (
      <Alert className="mt-6">
         <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Issues Found</AlertTitle>
        <AlertDescription>
            {searchQuery 
                ? `No issues found matching your search for "${searchQuery}". Try a different keyword.`
                : 'No issues found for the selected project. You can still raise a new bug.'
            }
        </AlertDescription>
      </Alert>
    );
  }

  const { issues, total, page, totalPages } = paginatedIssues;

    const getActionContent = () => {
    if (actionType === 'generateCode') {
      return { icon: <Bot className="mr-2 h-4 w-4" />, text: 'Generate Code' };
    }
    // Default to generate tests or if no type is specified
    return { icon: <Wand2 className="mr-2 h-4 w-4" />, text: 'Generate Tests' };
  };
  const { icon, text } = getActionContent();


  return (
    <div className="mt-6">
      <div className={`transition-opacity duration-300 ${isFetching || isActionDisabled ? 'opacity-50' : 'opacity-100'}`}>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] hidden sm:table-cell">Key</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="text-right w-auto">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell className="font-medium hidden sm:table-cell">
                    <button onClick={() => onViewIssueClick && onViewIssueClick(issue)} className="hover:underline text-primary">
                      {issue.key}
                    </button>
                  </TableCell>
                  <TableCell>
                     <button onClick={() => onViewIssueClick && onViewIssueClick(issue)} className="text-left hover:underline">
                        <span className="font-medium sm:hidden">{issue.key}: </span>{issue.summary}
                    </button>
                    <div className="md:hidden mt-2 flex items-center gap-4">
                        <span className="flex items-center text-xs text-muted-foreground">{getIssueTypeIcon(issue.issueType)} {issue.issueType}</span>
                        <Badge variant={getStatusBadgeVariant(issue.status)} className="lg:hidden">{issue.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="flex items-center">{getIssueTypeIcon(issue.issueType)} {issue.issueType}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant={getStatusBadgeVariant(issue.status)}>{issue.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                     <div className="flex flex-col sm:flex-row gap-2 justify-end">
                        {onViewIssueClick && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewIssueClick(issue)}
                                className="shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                                disabled={isActionDisabled}
                            >
                                <Eye className="mr-0 sm:mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">View</span>
                            </Button>
                        )}
                        <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onActionClick && onActionClick(issue)}
                        className="shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                        disabled={isActionDisabled || !actionType}
                        >
                        {React.cloneElement(icon, { className: "mr-0 sm:mr-2 h-4 w-4" })}
                        <span className="hidden sm:inline">{text}</span>
                        </Button>
                        {onRunLiveAgentClick && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => onRunLiveAgentClick(issue)}
                                className="shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                                disabled={isActionDisabled}
                                title="Run Live Agent"
                            >
                                <Play className="mr-0 sm:mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Live Agent</span>
                            </Button>
                        )}
                     </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}. Total issues: {total}.
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || isFetching || isActionDisabled}
              className="h-8 w-8 transition-transform active:scale-[0.98]"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isFetching || isActionDisabled}
              className="h-8 w-8 transition-transform active:scale-[0.98]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || isFetching || isActionDisabled}
              className="h-8 w-8 transition-transform active:scale-[0.98]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
             <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || isFetching || isActionDisabled}
              className="h-8 w-8 transition-transform active:scale-[0.98]"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
