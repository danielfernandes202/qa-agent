'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Terminal, 
  TestTube, 
  MonitorSmartphone, 
  Code,
  FileUp,
  Sparkles,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { BrandLogo } from '@/components/icons/BrandLogo';

// Custom Reveal Hook
const useReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return [ref, isVisible] as const;
};

const RevealSection = ({ children, className = "", delay = 0 }: {children: React.ReactNode, className?: string, delay?: number}) => {
  const [ref, isVisible] = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`${className} transition-all duration-[1000ms] ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      {children}
    </div>
  );
};

const FeatureCard = ({ feature, i }: { feature: any, i: number }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <RevealSection delay={i * 100} className="h-full">
      <Link href={feature.href} passHref>
        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          className="group relative h-full p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all hover:shadow-lg overflow-hidden cursor-pointer flex flex-col"
        >
          {/* Spotlight Effect */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(34, 211, 238, 0.1), transparent 40%)`
            }}
          />
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed flex-1">
              {feature.description}
            </p>
            <div className="mt-8 flex items-center text-sm font-semibold text-primary">
              Try it out <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </RevealSection>
  );
};

const GlobalSpotlight = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="pointer-events-none fixed inset-0 z-[100] transition-opacity duration-300"
      style={{
        background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(34, 211, 238, 0.04), transparent 40%)`
      }}
    />
  );
};

export default function HomePage() {
  const { user } = useAuth();
  
  const features = [
    {
      title: 'Document Importer',
      description: 'Ingest PRDs, Epic documents, and user stories. We automatically draft Jira tickets and test plans from raw text.',
      icon: <FileUp className="w-5 h-5 text-blue-500" />,
      href: '/qa-test-assistant/document-importer'
    },
    {
      title: 'Visual Tester',
      description: 'Upload UI screenshots and get instantaneous visual analysis, identifying alignment, accessibility, and contrast bugs.',
      icon: <MonitorSmartphone className="w-5 h-5 text-purple-500" />,
      href: '/qa-test-assistant/visual-tester'
    },
    {
      title: 'Playwright Generator',
      description: 'Turn plain English test cases directly into executable Playwright E2E automation scripts in seconds.',
      icon: <Bot className="w-5 h-5 text-emerald-500" />,
      href: '/qa-test-assistant/playwright-generator'
    },
    {
      title: 'Standalone Generator',
      description: 'Generate comprehensive manual test cases covering edge-cases, happy paths, and negative scenarios from any Jira issue.',
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      href: '/qa-test-assistant/standalone-generator'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 relative">
      <GlobalSpotlight />
      
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Hero Section Removed */}

      {/* Features Grid */}
      <section id="features" className="py-24 relative z-10 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">A complete toolkit for modern QA</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop writing boilerplate tests. From document ingestion to E2E test generation, we cover the entire QA lifecycle.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={i} feature={feature} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <RevealSection>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Ready to automate your testing?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join teams shipping higher quality software in half the time. Connect Jira and start generating tests today.
            </p>
            <Link href={user ? "/qa-test-assistant" : "/signup"} passHref>
              <button className="px-8 py-4 bg-foreground text-background font-semibold rounded-lg hover:bg-foreground/90 transition-colors text-lg inline-flex items-center gap-2">
                 Launch Dashboard <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </RevealSection>
        </div>
      </section>

    </div>
  );
}

// Just a simple wrapper to make the Bot icon available without importing it from a huge bundle above.
function Bot(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
