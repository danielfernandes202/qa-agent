'use client';

import Link from 'next/link';
import { Bot, Code, FileUp, Menu, Settings, TestTube, User, ChevronDown, Sparkles, MonitorSmartphone } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BrandLogo } from '../icons/BrandLogo';

const Header = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const qaToolsLinks = [
    { href: "/qa-test-assistant", label: "Dashboard", icon: TestTube },
    { href: "/qa-test-assistant/document-importer", label: "Document Importer", icon: FileUp },
    { href: "/qa-test-assistant/standalone-generator", label: "Standalone Generator", icon: Sparkles },
    { href: "/qa-test-assistant/playwright-generator", label: "Playwright Generator", icon: Bot },
    { href: "/qa-test-assistant/visual-tester", label: "Visual Tester", icon: MonitorSmartphone },
    { href: "/qa-test-assistant/playwright-setup", label: "Playwright Setup", icon: Code },
    { href: "/qa-test-assistant/setup", label: "Jira Setup", icon: Settings },
  ];

  const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <Link href={href} className="group relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        {children}
    </Link>
  );

  const NavDropdown = ({ label, links, activeCondition }: { label: string, links: {href: string, label: string, icon: React.ElementType}[], activeCondition: boolean }) => (
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
                "group relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",
                activeCondition && "text-foreground font-semibold"
            )}>
                {label}
                <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur-lg border-border">
            {links.map(link => (
                <DropdownMenuItem key={link.href} asChild className="cursor-pointer hover:bg-accent hover:text-accent-foreground">
                     <Link href={link.href} className={cn("flex items-center w-full", pathname === link.href && "text-primary font-medium")}>
                        <link.icon className="mr-2 h-4 w-4"/>
                        {link.label}
                    </Link>
                </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
      </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <BrandLogo className="w-8 h-8 text-primary" glow={false} />
            <span className="text-xl font-bold tracking-tight text-foreground">QAgent</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className='hidden md:flex items-center gap-8'>
            <NavDropdown label="Tools" links={qaToolsLinks} activeCondition={pathname.startsWith('/qa-test-assistant')} />
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden md:flex items-center justify-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-lg border-border">
                <DropdownMenuLabel>Hi, {user.name}!</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-3">
                <Link href="/login" className={cn(buttonVariants({variant: "ghost"}), "text-muted-foreground hover:text-foreground")}>
                    Log in
                </Link>
                 <Link href="/signup" className={cn(buttonVariants({variant: "default"}))}>
                    Sign up
                </Link>
            </div>
          )}

          {/* Mobile Navigation Trigger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                    <span className="sr-only">Open menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-background border-border w-[280px] sm:w-full">
                 <SheetHeader className="p-4 text-left border-b border-border">
                    <SheetTitle>
                        <Link href="/" className="flex items-center gap-2 text-xl font-bold" onClick={() => setIsMobileMenuOpen(false)}>
                            <BrandLogo className="h-6 w-6 text-primary" glow={false} />
                            <span>QAgent</span>
                        </Link>
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full py-4">
                    <nav className="flex flex-col gap-1 px-4">
                        {qaToolsLinks.map(link => (
                            <SheetClose asChild key={link.href}>
                                <Link href={link.href} className={cn("text-base font-medium py-3 rounded-md px-3 hover:bg-accent flex items-center gap-3", pathname.startsWith(link.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
                                    <link.icon className="h-5 w-5" />
                                    {link.label}
                                </Link>
                            </SheetClose>
                        ))}
                    </nav>
                    <div className="mt-auto px-4 border-t border-border pt-6">
                        {user ? (
                             <div className="space-y-4">
                                <p className="font-semibold px-2 text-sm text-muted-foreground">Signed in as {user.name}</p>
                                <Button onClick={() => { logout(); setIsMobileMenuOpen(false); }} variant="destructive" className="w-full">
                                  Logout
                                </Button>
                             </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <SheetClose asChild>
                                  <Button asChild variant="outline" className="w-full"><Link href="/login">Log in</Link></Button>
                                </SheetClose>
                                <SheetClose asChild>
                                  <Button asChild className="w-full"><Link href="/signup">Sign up</Link></Button>
                                </SheetClose>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
