'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MonitorSmartphone, AlertCircle, Calendar } from 'lucide-react';
import { searchSimilarBugs, VisualBugResult } from '@/app/actions/vector-search';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function BugLibraryPage() {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<VisualBugResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const { toast } = useToast();

    // Debounced search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.trim().length > 2) {
                performSearch(query);
            } else if (query.trim().length === 0) {
                setResults([]);
                setHasSearched(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const performSearch = async (searchQuery: string) => {
        setIsSearching(true);
        setHasSearched(true);
        try {
            const { bugs, error } = await searchSimilarBugs(searchQuery, 0.4, 12);
            if (error) {
                toast({
                    variant: "destructive",
                    title: "Search Failed",
                    description: error,
                });
            } else {
                setResults(bugs);
            }
        } catch (e: any) {
             toast({
                variant: "destructive",
                title: "Unexpected Error",
                description: e.message,
            });
        } finally {
            setIsSearching(false);
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'critical':
            case 'high':
                return <Badge variant="destructive">{severity}</Badge>;
            case 'medium':
                return <Badge variant="default">{severity}</Badge>;
            case 'low':
                return <Badge variant="secondary">{severity}</Badge>;
            default:
                return <Badge variant="outline">{severity}</Badge>;
        }
    };

    return (
        <div className="container mx-auto max-w-6xl py-12 px-4 space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600 pb-2">
                    Visual Bug Library
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Search historical visual bugs using natural language. Our AI will find semantically similar bugs based on layout, content, and design issues.
                </p>
                
                <div className="relative max-w-2xl mx-auto mt-8 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className={`h-5 w-5 ${isSearching ? 'text-blue-500 animate-pulse' : 'text-gray-400 group-focus-within:text-blue-500 transition-colors'}`} />
                    </div>
                    <Input 
                        type="text" 
                        placeholder="e.g., 'Navigation header is misaligned on mobile' or 'Button color is too light'" 
                        className="pl-12 py-6 text-lg rounded-full shadow-sm hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500/50 transition-all border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="pt-8">
                {isSearching && results.length === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-t-lg"></div>
                                <CardHeader>
                                    <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}

                {hasSearched && !isSearching && results.length === 0 && (
                    <div className="text-center py-24 space-y-4">
                        <AlertCircle className="mx-auto h-16 w-16 text-gray-400" />
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">No bugs found</h3>
                        <p className="text-muted-foreground">Try adjusting your search terms to be broader.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((bug) => (
                        <Card key={bug.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-1">
                            <div className="relative h-56 w-full bg-muted overflow-hidden border-b border-border/50">
                                {bug.screenshot_url ? (
                                    <Image 
                                        src={bug.screenshot_url} 
                                        alt="Bug screenshot"
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        unoptimized // Supabase signed URLs usually work best unoptimized depending on Next.js config
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                        <MonitorSmartphone className="h-12 w-12 opacity-20" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    {getSeverityBadge(bug.severity)}
                                    <Badge variant="secondary" className="bg-white/90 text-black dark:bg-black/90 dark:text-white backdrop-blur-md">
                                        {(bug.similarity * 100).toFixed(0)}% Match
                                    </Badge>
                                </div>
                            </div>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg line-clamp-2 leading-snug">
                                    {bug.description.split(':')[0] || 'Visual Bug'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {bug.description.split(':').slice(1).join(':') || bug.description}
                                </p>
                            </CardContent>
                            <CardFooter className="pt-2 border-t border-border/10 text-xs text-muted-foreground flex items-center">
                                <Calendar className="mr-1 h-3 w-3" />
                                {new Date(bug.created_at).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
