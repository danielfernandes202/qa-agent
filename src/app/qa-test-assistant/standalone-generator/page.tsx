
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, FileText, Download, AlertCircle } from 'lucide-react';
import { generateTestCasesAction, convertTestCasesToExcel } from '@/app/actions';
import type { GenerateTestCasesOutput } from '@/lib/schemas';
import { useRouter, usePathname } from 'next/navigation';

const formSchema = z.object({
  projectKey: z.string().min(1, "Project key is required.").max(10, "Project key seems too long."),
  description: z.string().min(20, "Please provide a more detailed description."),
  acceptanceCriteria: z.string().optional(),
  coverageLevel: z.enum(['Basic', 'Standard', 'End-to-End', 'Max', 'XMax']).default('Basic'),
});

type StandaloneGeneratorFormValues = z.infer<typeof formSchema>;

export default function StandaloneGeneratorPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  
  const [generatedTestCases, setGeneratedTestCases] = useState<GenerateTestCasesOutput>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<StandaloneGeneratorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectKey: "PROJ",
      description: "",
      acceptanceCriteria: "",
      coverageLevel: "Basic",
    },
  });

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Please log in to access this page.' });
      router.push(`/login?redirect_to=${pathname}`);
    }
  }, [user, isAuthLoading, router, toast, pathname]);
  
  const handleGenerate = async (values: StandaloneGeneratorFormValues) => {
    setIsLoading(true);
    setError(null);
    setGeneratedTestCases([]);
    try {
      const result = await generateTestCasesAction(values);
      setGeneratedTestCases(result);
      if (result.length === 0) {
        toast({ title: "No Test Cases Generated", description: "The AI couldn't find any test cases. Try adding more detail to the description." });
      } else {
        toast({ title: "Success!", description: `Generated ${result.length} test cases.` });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (generatedTestCases.length === 0) return;
    setIsDownloading(true);
    try {
      const buffer = await convertTestCasesToExcel(generatedTestCases);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-cases-${form.getValues('projectKey')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: "Download Failed", description: "Could not create the Excel file.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isAuthLoading || !user) {
    return <div className="flex min-h-[400px] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <FileText className="mr-3 h-8 w-8 text-primary" />
            Standalone Test Case Generator
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Generate test cases by pasting ticket details. No Jira connection required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-6">
              <FormField
                control={form.control}
                name="projectKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Key *</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., PROJ, TEST" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket Description *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Paste the full description of the story, task, or bug here..." {...field} rows={8} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="acceptanceCriteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acceptance Criteria (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Paste the acceptance criteria here, one per line..." {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverageLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coverage Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a coverage level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Basic">Basic (3-5 tests: Happy path & critical failures)</SelectItem>
                        <SelectItem value="Standard">Standard (6-10 tests: Includes edge cases)</SelectItem>
                        <SelectItem value="End-to-End">End-to-End (10-15 tests: Full user journeys)</SelectItem>
                        <SelectItem value="Max">Max (15-25 tests: Comprehensive & boundaries)</SelectItem>
                        <SelectItem value="XMax">XMax (25+ tests: Extreme edge cases & full coverage)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {isLoading ? 'Generating...' : 'Generate Test Cases'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generatedTestCases.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Generated Test Cases</CardTitle>
            <CardDescription>
              Review the generated test cases below. You can download them as an Excel file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] pr-4 border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background shadow-sm">
                  <TableRow>
                    <TableHead className="w-[120px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Precondition</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Expected Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedTestCases.map((tc, index) => (
                    <TableRow key={tc.testCaseId || index}>
                      <TableCell className="font-medium align-top">{tc.testCaseId}</TableCell>
                      <TableCell className="align-top">{tc.testCaseName}</TableCell>
                      <TableCell className="align-top">{tc.precondition}</TableCell>
                      <TableCell className="align-top">
                        <ul className="list-decimal list-inside text-xs space-y-1">
                          {tc.testSteps.map((step, i) => <li key={i}>{step}</li>)}
                        </ul>
                      </TableCell>
                      <TableCell className="align-top">{tc.expectedResult}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <Button onClick={handleDownload} disabled={isDownloading} className="mt-6">
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isDownloading ? 'Downloading...' : 'Download as Excel'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
