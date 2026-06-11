
"use client";

import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '@/context/auth-context';
import { ProjectSelector } from '@/components/ProjectSelector';
import { DocumentTicketCreator } from '@/components/DocumentTicketCreator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProjectContext } from '@/contexts/ProjectContext';
import { useRouter } from 'next/navigation';

export default function DocumentImporterPage() {
  const { isAuthenticated } = useAuth();
  const { selectedProject } = useContext(ProjectContext);
  const router = useRouter();
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);


  if (!isClient) return null;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center">
        <Alert className="max-w-xl">
          <Info className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>Please connect to Jira on the main page to use the Document Importer.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="shadow-lg mb-8 max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            Document to Jira Tickets Importer
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Analyze a requirements document (PDF) with AI and generate a structured backlog of Epics, Stories, and Tasks directly into your Jira project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectSelector />
        </CardContent>
      </Card>
      
      {!selectedProject ? (
        <Card className="mt-8 shadow-lg border-primary/20 max-w-5xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Info className="mr-3 h-8 w-8 text-primary" />
              Select a Project to Continue
            </CardTitle>
            <CardDescription>
              Please choose the target project from the dropdown above to enable the document uploader.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
         <DocumentTicketCreator 
            projectId={selectedProject.id}
            projectKey={selectedProject.key}
            projectName={selectedProject.name}
        />
      )}
    </div>
  );
}
