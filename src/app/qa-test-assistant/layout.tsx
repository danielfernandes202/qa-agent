
'use client';
import { ProjectProvider } from '@/contexts/ProjectContext';
import React from 'react';

export default function QATestAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider>
      <div className="h-full">{children}</div>
    </ProjectProvider>
  );
}
