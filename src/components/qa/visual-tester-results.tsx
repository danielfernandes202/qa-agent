
"use client";

import React from "react";
import type { VisualIssue, LinkCheckResult } from "@/lib/schemas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MonitorSmartphone,
  Link2,
  CheckCircle,
  FileWarning,
  Palette,
  ScanText,
  Accessibility,
  LayoutTemplate,
  Lightbulb,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ResultsDisplayProps {
  visualIssues: VisualIssue[];
  linkResults: LinkCheckResult[];
  analyzedUrl: string;
}

export function ResultsDisplay({ visualIssues, linkResults, analyzedUrl }: ResultsDisplayProps) {
  const getSeverityVariant = (
    severity: VisualIssue["severity"]
  ): "destructive" | "default" | "secondary" | "outline" => {
    switch (severity) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getIssueTypeIcon = (type: VisualIssue["type"]) => {
    switch (type) {
      case "layout":
        return <LayoutTemplate className="h-4 w-4 text-blue-500" />;
      case "content":
        return <ScanText className="h-4 w-4 text-green-500" />;
      case "design":
        return <Palette className="h-4 w-4 text-purple-500" />;
      case "accessibility":
        return <Accessibility className="h-4 w-4 text-orange-500" />;
      default:
        return <FileWarning className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLinkStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-500";
    if (status >= 400) return "text-red-500";
    if (status >= 300) return "text-yellow-500";
    return "text-gray-500";
  };
  
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Analysis Report for {analyzedUrl}</CardTitle>
        <CardDescription>
          Found {visualIssues.length} potential visual issue(s) and validated{" "}
          {linkResults.length} link(s).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual-issues" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual-issues">
              <MonitorSmartphone className="mr-2 h-4 w-4" /> Visual Issues (
              {visualIssues.length})
            </TabsTrigger>
            <TabsTrigger value="link-statuses">
              <Link2 className="mr-2 h-4 w-4" /> Link Statuses (
              {linkResults.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual-issues">
            {visualIssues.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-4 text-lg font-medium">
                  No Visual Issues Found
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The AI analysis did not detect any significant UI/UX issues.
                </p>
              </div>
            ) : (
              <Accordion
                type="single"
                collapsible
                className="w-full mt-4"
                defaultValue="item-0"
              >
                {visualIssues.map((issue, index) => (
                  <AccordionItem value={`item-${index}`} key={issue.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-4 flex-grow text-left">
                        {getIssueTypeIcon(issue.type)}
                        <span className="flex-grow font-semibold">
                          {issue.title}
                        </span>
                        <Badge
                          variant={getSeverityVariant(issue.severity)}
                          className="capitalize ml-auto"
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {issue.description}
                        </p>
                        {issue.element && (
                          <div>
                            <h4 className="font-semibold text-xs mb-1">
                              Selector
                            </h4>
                            <code className="text-xs bg-gray-700 text-white p-1 rounded-sm">
                              {issue.element}
                            </code>
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-xs mb-2 flex items-center">
                            <Lightbulb className="h-4 w-4 mr-1 text-yellow-400" />{" "}
                            Suggestions
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {issue.suggestions.map((suggestion, i) => (
                              <li key={i}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          <TabsContent value="link-statuses">
            <ScrollArea className="h-[50vh] mt-4 rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background shadow-sm">
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Status Text</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkResults.map((link) => (
                    <TableRow key={link.url}>
                      <TableCell className="max-w-xs truncate">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {link.url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono",
                            getLinkStatusColor(link.status)
                          )}
                        >
                          {link.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(getLinkStatusColor(link.status))}>
                        {link.statusText}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
