'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import AppSidebar from '@/components/layout/AppSidebar';
import AppNavbar from '@/components/layout/AppNavbar';
import React from 'react';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // We apply the new layout for QA tools routes
  const isQaToolPage = pathname.startsWith('/qa-test-assistant');
  const isHomePage = pathname === '/';

  if (isHomePage) {
    return <>{children}</>;
  }

  if (isQaToolPage) {
    return (
      <div className="flex h-screen overflow-hidden antialiased w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-background to-background">
          <AppNavbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 z-10 relative">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Fallback for other pages (like login/signup)
  return (
    <>
      <Header />
      <main className="flex-1 z-10">{children}</main>
      <Footer />
    </>
  );
}
