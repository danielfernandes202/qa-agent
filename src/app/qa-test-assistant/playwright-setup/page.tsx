
"use client";

import React, { useState, useEffect, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { PlaywrightSetupSchema, type PlaywrightSetup } from '@/lib/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ProjectSelector } from '@/components/ProjectSelector';
import { Code, Info, Save, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProjectContext } from '@/contexts/ProjectContext';

export default function PlaywrightSetupPage() {
  const { isAuthenticated, activeWorkspace } = useAuth();
  const { toast } = useToast();
  const { selectedProject } = useContext(ProjectContext);
  
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const form = useForm<PlaywrightSetup>({
    resolver: zodResolver(PlaywrightSetupSchema),
    defaultValues: {
      baseUrl: '',
      authFlow: '',
      commonSelectors: '',
      boilerplate: '',
    },
  });

  useEffect(() => {
    async function loadSetup() {
      if (!selectedProject || !activeWorkspace) {
        form.reset({
          baseUrl: '',
          authFlow: '',
          commonSelectors: '',
          boilerplate: '',
        });
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('playwright_setups')
          .select('*')
          .eq('workspace_id', activeWorkspace.id)
          .eq('project_id', selectedProject.id)
          .single();

        if (data && !error) {
          form.reset({
            baseUrl: data.base_url || '',
            authFlow: data.auth_flow || '',
            commonSelectors: data.common_selectors || '',
            boilerplate: data.boilerplate || '',
          });
        } else {
          form.reset({
            baseUrl: '',
            authFlow: '',
            commonSelectors: '',
            boilerplate: `import { test, expect } from '@playwright/test';`,
          });
        }
      } catch (e) {
        console.error("Failed to load Playwright setup from Supabase", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadSetup();
  }, [selectedProject, activeWorkspace, form]);

  const onSubmit = async (data: PlaywrightSetup) => {
    if (!selectedProject || !activeWorkspace) {
      toast({
        title: "Configuration Error",
        description: "Please select a project and ensure you are in an active workspace.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('playwright_setups').upsert({
        workspace_id: activeWorkspace.id,
        project_id: selectedProject.id,
        base_url: data.baseUrl,
        auth_flow: data.authFlow,
        common_selectors: data.commonSelectors,
        boilerplate: data.boilerplate,
        updated_at: new Date().toISOString()
      }, { onConflict: 'workspace_id, project_id' });

      if (error) throw error;

      toast({
        title: "Setup Saved",
        description: `Your Playwright setup for ${selectedProject.name} has been saved to the database.`,
        className: "bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200"
      });
    } catch (error) {
      console.error("Failed to save Playwright setup to Supabase", error);
      toast({
        title: "Error Saving",
        description: "Could not save the setup to the database.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isClient) {
      return null;
  }
  
  if (!isAuthenticated) {
     return (
        <div className="container mx-auto p-4 md:p-8 flex justify-center">
            <Alert className="max-w-xl">
                <Info className="h-4 w-4" />
                <AlertTitle>Not Connected</AlertTitle>
                <AlertDescription>Please connect to Jira on the main page to configure Playwright settings for a project.</AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <Code className="mr-3 h-8 w-8 text-primary" />
            Playwright Test Generation Setup
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Provide context about your project to help the AI generate accurate and robust Playwright test code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label className="font-semibold">Select Project to Configure *</Label>
                <div className="mt-2">
                 <ProjectSelector />
                </div>
            </div>

            {selectedProject && activeWorkspace ? (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="baseUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Application Base URL *</FormLabel>
                        <FormControl>
                        <Input placeholder="https://yourapp.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="authFlow"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Authentication Flow (Optional)</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Describe how a user logs in. e.g., Navigate to /login, fill in email and password, click submit."
                            rows={3}
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="commonSelectors"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Common Selectors (Optional)</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder={"One per line, e.g.:\nloginButton: [data-testid='login-button']\nusernameInput: #username"}
                            rows={5}
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="boilerplate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Test File Boilerplate (Optional)</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Code to include at the start of every test file, like custom imports or a beforeEach hook."
                            rows={8}
                            {...field}
                            className="font-mono text-xs"
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <Button type="submit" disabled={isLoading || isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Setup for Project
                </Button>
                </form>
            </Form>
             ) : selectedProject && !activeWorkspace ? (
                <Alert className="mt-4" variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Workspace Required</AlertTitle>
                    <AlertDescription>
                        You don't have an active workspace selected. Please refresh your browser or select a workspace from the Settings page.
                    </AlertDescription>
                </Alert>
             ) : (
                <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Select a Project</AlertTitle>
                    <AlertDescription>
                        Please choose a project from the dropdown above to view or edit its Playwright setup.
                    </AlertDescription>
                </Alert>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
