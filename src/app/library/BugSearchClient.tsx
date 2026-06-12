'use client';

import React, { useState } from 'react';
import { searchSimilarBugs, VisualBugResult } from '../actions/vector-search';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Bug, Clock, AlertTriangle, ChevronRight, ImageIcon } from 'lucide-react';

export default function BugSearchClient() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<VisualBugResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);
        setHasSearched(true);

        try {
            const res = await searchSimilarBugs(query);
            if (res.error) {
                setError(res.error);
            } else {
                setResults(res.bugs || []);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-20">
            
            {/* Header section */}
            <div className="flex flex-col gap-2 items-center text-center mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4 ring-1 ring-primary/20 backdrop-blur-md">
                    <Bug className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-purple-500 bg-clip-text text-transparent">
                    Semantic Bug Library
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mt-4">
                    Search your entire history of visual regressions and UI bugs using natural language. Powered by Gemini Embeddings & pgvector.
                </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative group w-full max-w-3xl mx-auto z-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition duration-500"></div>
                <div className="relative flex items-center bg-card border border-border/50 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl">
                    <Search className="absolute left-6 text-muted-foreground w-6 h-6" />
                    <Input 
                        className="w-full h-16 pl-16 pr-32 text-lg bg-transparent border-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
                        placeholder="e.g. Navigation overlaps with hero image on mobile..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="absolute right-2 flex items-center">
                        <Button 
                            type="submit" 
                            size="lg" 
                            disabled={isSearching || !query.trim()}
                            className="rounded-xl font-semibold shadow-lg hover:shadow-primary/25 transition-all"
                        >
                            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                        </Button>
                    </div>
                </div>
            </form>

            {/* Results Section */}
            <div className="mt-8 relative">
                {isSearching && (
                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-muted-foreground font-medium animate-pulse">Computing semantic similarity...</p>
                    </div>
                )}

                {!isSearching && error && (
                    <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-center text-destructive animate-in fade-in zoom-in-95 duration-300">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-80" />
                        <h3 className="text-lg font-semibold mb-1">Search Failed</h3>
                        <p className="opacity-80">{error}</p>
                    </div>
                )}

                {!isSearching && hasSearched && !error && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/50 rounded-3xl bg-card/30 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
                        <div className="p-4 bg-muted/50 rounded-full mb-4">
                            <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold">No similar bugs found</h3>
                        <p className="text-muted-foreground max-w-md mt-2">Try adjusting your query or describing the bug differently.</p>
                    </div>
                )}

                {!isSearching && results.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-semibold tracking-tight">Top matches for <span className="text-primary">"{query}"</span></h2>
                            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">{results.length} results</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {results.map((bug, index) => (
                                <Card 
                                    key={bug.id} 
                                    className="group overflow-hidden border-border/40 bg-card/40 backdrop-blur-xl hover:bg-card hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: `${index * 50}ms` }}>
                                        {/* Image Header Placeholder */}
                                        <div className="h-40 bg-muted relative overflow-hidden flex items-center justify-center">
                                            {bug.screenshot_url ? (
                                                <img 
                                                    src={bug.screenshot_url} 
                                                    alt="Bug Screenshot" 
                                                    className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" 
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-muted-foreground/5 to-muted-foreground/10 flex items-center justify-center">
                                                    <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            
                                            {/* Similarity Badge */}
                                            <div className="absolute top-3 right-3">
                                                <Badge variant="secondary" className="bg-background/80 backdrop-blur-md shadow-sm border-primary/20 text-primary font-mono">
                                                    {(bug.similarity * 100).toFixed(1)}% Match
                                                </Badge>
                                            </div>
                                        </div>

                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between mb-2">
                                                <Badge variant={bug.severity === 'high' || bug.severity === 'critical' ? 'destructive' : 'outline'} className="capitalize tracking-wide">
                                                    {bug.severity}
                                                </Badge>
                                                <div className="flex items-center text-xs text-muted-foreground font-mono">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {new Date(bug.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                                                {bug.description.length > 60 ? bug.description.substring(0, 60) + '...' : bug.description}
                                            </CardTitle>
                                        </CardHeader>

                                        <CardContent>
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                                {bug.description}
                                            </p>
                                            
                                            <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground font-mono opacity-60 truncate max-w-[150px]">
                                                    ID: {bug.id.split('-')[0]}
                                                </span>
                                                <Button variant="ghost" size="sm" className="h-8 gap-1 hover:text-primary hover:bg-primary/10 transition-colors">
                                                    View Details <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
        </div>
    );
}
