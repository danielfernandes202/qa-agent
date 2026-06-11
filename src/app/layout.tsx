
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/providers/AppProviders';
import SiteLoader from '@/components/layout/site-loader';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import ConditionalLayout from '@/components/layout/ConditionalLayout';
import GlobalEffects from '@/components/layout/GlobalEffects';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'QAgent | AI-Powered QA Automation',
  description: 'Automate your testing workflows, generate Playwright code, and analyze visual UI bugs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          geistSans.variable
        )}
      >
        <AppProviders>
            <GlobalEffects />
            <SiteLoader />
            <div className="relative flex min-h-screen flex-col">
                <ConditionalLayout>{children}</ConditionalLayout>
            </div>
            <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
