
"use client";
import type { JiraProject } from '@/app/actions';
import { fetchProjectsAction } from '@/app/actions';
import { useAuth } from '@/context/auth-context';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ListFilter, Check, ChevronsUpDown } from 'lucide-react';
import React, { useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import { ProjectContext } from '@/contexts/ProjectContext';

interface ProjectSelectorProps {
  disabled?: boolean;
}

export function ProjectSelector({ disabled }: ProjectSelectorProps) {
  const { credentials } = useAuth();
  const { selectedProject, setSelectedProject } = useContext(ProjectContext);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValue, setSelectedValue] = useState('');

  const { data: projects, isLoading, error } = useQuery<JiraProject[], Error>({
    queryKey: ['jiraProjects', credentials?.jiraUrl],
    queryFn: () => {
      if (!credentials) throw new Error('Not authenticated');
      return fetchProjectsAction(credentials);
    },
    enabled: !!credentials,
  });

  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];
    if (!searchQuery) return projects;
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return projects;
    
    const scored = projects.map(project => {
      const name = project.name.toLowerCase();
      const key = project.key.toLowerCase();
      const searchStr = `${name} ${key}`;
      
      let score = 0;
      if (name === query || key === query) score = 100;
      else if (name.startsWith(query) || key.startsWith(query)) score = 50;
      else if (name.includes(query) || key.includes(query)) score = 10;
      else {
        // fuzzy matching
        let i = 0;
        for (const char of searchStr) {
          if (char === query[i]) i++;
          if (i === query.length) break;
        }
        if (i === query.length) score = 1;
      }
      return { project, score };
    }).filter(p => p.score > 0);
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored.map(p => p.project);
  }, [projects, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <ListFilter className="h-5 w-5 text-muted-foreground" />
        <Skeleton className="h-10 w-[250px]" />
      </div>
    );
  }

  if (error) {
    return (
       <Alert variant="destructive" className="w-full max-w-md">
        <AlertTitle>Error Fetching Projects</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  
  if (!projects || projects.length === 0) {
    return (
      <Alert className="w-full max-w-md">
        <AlertTitle>No Projects Found</AlertTitle>
        <AlertDescription>
          No projects were found for your Jira instance. This could be due to permissions, 
          an incorrect Jira URL, network issues, or no projects existing for the connected account. 
          Please verify your Jira connection details and permissions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <ListFilter className="h-5 w-5 text-muted-foreground shrink-0" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[250px] justify-between shadow-sm"
            disabled={disabled || projects.length === 0}
          >
            {selectedProject
              ? `${selectedProject.name} (${selectedProject.key})`
              : "Select a project..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command 
            shouldFilter={false}
            value={selectedValue}
            onValueChange={setSelectedValue}
          >
            <CommandInput 
              placeholder="Search project..." 
              value={searchQuery} 
              onValueChange={(val) => {
                setSearchQuery(val);
                setSelectedValue('');
              }} 
            />
            <CommandList>
              <CommandEmpty>No project found.</CommandEmpty>
              <CommandGroup>
                {filteredProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`${project.name} ${project.key} ${project.id}`} 
                    onSelect={() => {
                      setSelectedProject(project);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedProject?.id === project.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {project.name} ({project.key})
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
