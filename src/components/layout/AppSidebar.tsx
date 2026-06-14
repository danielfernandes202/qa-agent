'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Code, FileUp, Settings, TestTube, MonitorSmartphone, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '../icons/BrandLogo';

export const qaToolsLinks = [
  { href: "/qa-test-assistant", label: "Dashboard", icon: TestTube },
  { href: "/qa-test-assistant/document-importer", label: "Document Importer", icon: FileUp },
  { href: "/qa-test-assistant/standalone-generator", label: "Standalone Generator", icon: Bot },
  { href: "/qa-test-assistant/playwright-generator", label: "Playwright Generator", icon: Bot },
  { href: "/qa-test-assistant/visual-tester", label: "Visual Tester", icon: MonitorSmartphone },
  { href: "/qa-test-assistant/bug-library", label: "Bug Library", icon: Library },
  { href: "/qa-test-assistant/code-library", label: "Code Library", icon: Code },
  { href: "/qa-test-assistant/playwright-setup", label: "Playwright Setup", icon: Code },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-background/50 backdrop-blur-md flex-col justify-between hidden md:flex shrink-0">
      <div>
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <BrandLogo className="w-8 h-8 text-primary" glow={false} />
            <span className="text-xl font-bold tracking-tight text-foreground">QAgent</span>
          </Link>
        </div>
        
        <div className="p-4 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider px-2">Main</div>
          <nav className="space-y-1 mb-8">
            <Link 
              href="/qa-test-assistant" 
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === "/qa-test-assistant" 
                  ? "bg-primary/10 text-primary border-r-2 border-primary" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <TestTube className="w-4 h-4" />
              Dashboard
            </Link>
          </nav>

          <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider px-2">Tools</div>
          <nav className="space-y-1">
            {qaToolsLinks.slice(1).map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link 
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary border-r-2 border-primary" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <link.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Link 
          href="/qa-test-assistant/setup" 
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname.startsWith("/qa-test-assistant/setup") 
              ? "bg-primary/10 text-primary border-r-2 border-primary" 
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
