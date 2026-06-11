
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect } from 'react';

export interface Project {
  id: string;
  key: string;
  name: string;
}

interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeSearch: string;
  setActiveSearch: (term: string) => void;
}

export const ProjectContext = createContext<ProjectContextType>({
  selectedProject: null,
  setSelectedProject: () => {},
  searchTerm: '',
  setSearchTerm: () => {},
  activeSearch: '',
  setActiveSearch: () => {},
});

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Load from sessionStorage on initial render
  useEffect(() => {
    try {
      const storedProject = sessionStorage.getItem('selectedProject');
      if (storedProject) {
        setSelectedProjectState(JSON.parse(storedProject));
      }
    } catch (error) {
        console.error("Could not parse selected project from session storage.", error);
        sessionStorage.removeItem('selectedProject');
    }
  }, []);

  const setSelectedProject = (project: Project | null) => {
    setSelectedProjectState(project);
    // Save to sessionStorage
    if (project) {
      sessionStorage.setItem('selectedProject', JSON.stringify(project));
    } else {
      sessionStorage.removeItem('selectedProject');
    }
  };

  const value = {
    selectedProject,
    setSelectedProject,
    searchTerm,
    setSearchTerm,
    activeSearch,
    setActiveSearch,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
