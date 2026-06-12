import React from 'react';
import BugSearchClient from './BugSearchClient';

export const metadata = {
    title: 'Visual Bug Library | QAgent',
    description: 'Search through historical visual bugs and test failures using semantic search powered by pgvector.',
};

export default function LibraryPage() {
    return (
        <div className="flex-1 w-full min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -skew-y-3 transform origin-top-left -z-10" />
            <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute top-80 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -z-10" />
            
            <main className="container mx-auto px-4 py-8 relative z-0">
                <BugSearchClient />
            </main>
        </div>
    );
}
