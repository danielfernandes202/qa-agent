
"use client";
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/auth-context';
import { LoaderProvider } from '@/context/loader-context';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <LoaderProvider>
                {children}
            </LoaderProvider>
        </AuthProvider>
    </QueryClientProvider>
  );
}
