
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';

const crawlSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
});

export type CrawlFormValues = z.infer<typeof crawlSchema>;

interface VisualTesterFormProps {
    onFormSubmit: (data: CrawlFormValues) => void;
    isSubmitting: boolean;
}

export function VisualTesterForm({ onFormSubmit, isSubmitting }: VisualTesterFormProps) {
  const form = useForm<CrawlFormValues>({
    resolver: zodResolver(crawlSchema),
    defaultValues: {
      url: 'https://stytch.com/',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Website URL</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input placeholder="https://example.com" {...field} />
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    {isSubmitting ? 'Analyzing...' : 'Run Full Analysis'}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
