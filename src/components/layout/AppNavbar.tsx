'use client';

import Link from 'next/link';
import { Menu, Search, User, ChevronDown, ChevronRight, Bell } from 'lucide-react';
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
import { qaToolsLinks } from './AppSidebar';

export default function AppNavbar() {
  const { user, logout, workspaces, activeWorkspace, setActiveWorkspace } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-background/70 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Trigger */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-background border-border w-[280px] sm:w-full p-0">
            <SheetHeader className="p-4 text-left border-b border-border">
              <SheetTitle>
                <Link href="/" className="flex items-center gap-2 text-xl font-bold" onClick={() => setIsMobileMenuOpen(false)}>
                  <BrandLogo className="h-6 w-6 text-primary" glow={false} />
                  <span>QAgent</span>
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-[calc(100vh-73px)] py-4 overflow-y-auto">
              <nav className="flex flex-col gap-1 px-4">
                <div className="text-xs font-medium text-muted-foreground mb-2 mt-4 uppercase tracking-wider px-2">Tools</div>
                {qaToolsLinks.map(link => {
                  const isActive = pathname.startsWith(link.href) && (link.href !== "/qa-test-assistant" || pathname === "/qa-test-assistant");
                  return (
                    <SheetClose asChild key={link.href}>
                      <Link 
                        href={link.href} 
                        className={cn(
                          "text-sm font-medium py-2.5 rounded-md px-3 flex items-center gap-3 transition-colors", 
                          isActive 
                            ? "bg-primary/10 text-primary" 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
              <div className="mt-auto px-4 border-t border-border pt-6">
                {user ? (
                  <div className="space-y-4">
                    <p className="font-semibold px-2 text-sm text-muted-foreground truncate">Signed in as {user.name}</p>
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

        {/* Breadcrumbs (Desktop only) */}
        <div className="hidden sm:flex items-center text-sm text-muted-foreground">
          <Link href="/qa-test-assistant" className="hover:text-foreground transition-colors">Dashboard</Link>
          {pathname !== '/qa-test-assistant' && (
            <>
              <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {qaToolsLinks.find(t => pathname.startsWith(t.href) && t.href !== '/qa-test-assistant')?.label || 'Tool'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search tools..." 
            className="bg-muted/30 border border-border rounded-full pl-9 pr-4 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-48 xl:w-64" 
          />
        </div>

        {/* Workspace Switcher */}
        {user && activeWorkspace && workspaces.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden md:flex items-center justify-center gap-2 h-9 px-3 rounded-full border-border bg-background hover:bg-muted/50">
                <span className="text-sm font-medium truncate max-w-[120px]">{activeWorkspace.name}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-lg border-border">
              <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map(ws => (
                <DropdownMenuItem key={ws.id} onClick={() => setActiveWorkspace(ws)} className="cursor-pointer">
                  <span className={cn(ws.id === activeWorkspace.id ? "font-bold text-primary" : "")}>{ws.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/settings/workspace">Manage Workspace</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User Profile */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 border border-border bg-muted/30 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-sm font-bold">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
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
          <div className="flex items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({variant: "ghost", size: "sm"}), "text-muted-foreground hover:text-foreground hidden sm:flex")}>
              Log in
            </Link>
            <Link href="/signup" className={cn(buttonVariants({variant: "default", size: "sm"}), "rounded-full")}>
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
