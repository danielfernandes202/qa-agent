'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  MonitorSmartphone, 
  FileUp,
  Sparkles,
  TestTube,
  Bot
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Hero Section - Asymmetric, left aligned, high impact */}
      <section className="relative pt-32 pb-24 border-b border-border overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter leading-[1.05] mb-8">
              A complete toolkit
              <br />
              <span className="inline-flex items-center gap-4 align-middle">
                for modern
                <span className="inline-flex h-16 w-32 lg:h-20 lg:w-40 bg-primary/10 rounded-full border border-primary/20 items-center justify-center text-primary relative overflow-hidden">
                   <TestTube className="w-8 h-8 lg:w-10 lg:h-10 animate-pulse" />
                </span>
                QA.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-[50ch] mb-10">
              Stop writing boilerplate tests. From document ingestion to E2E test generation, we cover the entire QA lifecycle with precision and speed.
            </p>
            <Link href={user ? "/qa-test-assistant" : "/signup"} passHref>
              <button className="pressable px-8 py-4 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 inline-flex items-center gap-3">
                Launch Dashboard <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Section - Zig-Zag Asymmetric Layout */}
      <section className="py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
          
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-12 gap-12 items-start border-t border-border pt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
            <div className="lg:col-span-5 lg:sticky lg:top-32">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6">
                <FileUp className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold mb-4">Document Importer</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Ingest PRDs and user stories. We automatically draft Jira tickets and test plans from raw text, preserving all original acceptance criteria.
              </p>
            </div>
            <div className="lg:col-span-7 h-[400px] bg-muted/20 border border-border rounded-3xl flex items-center justify-center overflow-hidden relative">
               <img src="/images/document-importer.png" alt="Document Importer Preview" className="object-cover w-full h-full" />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-12 gap-12 items-start border-t border-border pt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
            <div className="lg:col-span-7 h-[400px] bg-muted/20 border border-border rounded-3xl flex items-center justify-center overflow-hidden relative order-2 lg:order-1">
               <img src="/images/visual-tester.png" alt="Visual Tester Preview" className="object-cover w-full h-full" />
            </div>
            <div className="lg:col-span-5 lg:sticky lg:top-32 order-1 lg:order-2">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6">
                <MonitorSmartphone className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold mb-4">Visual Tester</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Instantaneous visual analysis for alignment, accessibility, and contrast bugs. We catch UI regressions before your users do.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid lg:grid-cols-12 gap-12 items-start border-t border-border pt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
            <div className="lg:col-span-5 lg:sticky lg:top-32">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold mb-4">Playwright Generation</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Turn plain English into executable automation scripts. Define the flow, and our agent writes robust, selector-resilient code.
              </p>
            </div>
            <div className="lg:col-span-7 h-[400px] bg-muted/20 border border-border rounded-3xl flex items-center justify-center overflow-hidden relative">
               <img src="/images/playwright-generation.png" alt="Playwright Generation Preview" className="object-cover w-full h-full" />
            </div>
          </div>

        </div>
      </section>
      
      <section className="py-32 border-t border-border bg-foreground text-background">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold tracking-tight mb-8">Ready to automate your testing?</h2>
          <p className="text-xl text-muted-foreground opacity-80 mb-12 max-w-[50ch] mx-auto">
            Join teams shipping higher quality software in half the time. Connect your repository and start generating tests today.
          </p>
          <Link href={user ? "/qa-test-assistant" : "/signup"} passHref>
             <button className="pressable px-10 py-5 bg-background text-foreground font-medium rounded-full hover:opacity-90 inline-flex items-center gap-3 text-lg">
                Get Started <ArrowRight className="w-5 h-5" />
             </button>
          </Link>
        </div>
      </section>
    </div>
  );
}

