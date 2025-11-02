"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChangelogVersion } from "@/lib/changelog-parser";
import { cn } from "@/lib/utils";
import { Book, Bug, ExternalLink, Package, Rocket, Wrench, Zap } from "lucide-react";
import { useLocale } from "next-intl";

const CATEGORY_CONFIG = {
  features: {
    label: "Features",
    icon: Rocket,
    variant: "default" as const,
    bgColor: "bg-blue-500",
  },
  bugFixes: {
    label: "Bug Fixes",
    icon: Bug,
    variant: "destructive" as const,
    bgColor: "bg-red-500",
  },
  chores: {
    label: "Chores",
    icon: Wrench,
    variant: "secondary" as const,
    bgColor: "bg-gray-500",
  },
  documentation: {
    label: "Documentation",
    icon: Book,
    variant: "outline" as const,
    bgColor: "bg-purple-500",
  },
  refactoring: {
    label: "Refactoring",
    icon: Package,
    variant: "secondary" as const,
    bgColor: "bg-orange-500",
  },
  performance: {
    label: "Performance",
    icon: Zap,
    variant: "outline" as const,
    bgColor: "bg-yellow-500",
  },
};

export function ChangelogTimeline({ versions }: { versions: ChangelogVersion[] }) {
  const locale = useLocale();

  return (
    <div className="relative space-y-0">
      {/* Timeline vertical line */}
      <div className="bg-border absolute bottom-0 left-6 top-6 w-0.5" />

      <Accordion type="single" collapsible defaultValue={versions[0]?.version}>
        {versions.map((version, index) => {
          const isLatest = index === 0;

          return (
            <AccordionItem
              key={version.version}
              value={version.version}
              className="relative border-none pb-4 last:pb-0"
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  "border-background absolute left-3 top-3 z-10 h-6 w-6 rounded-full border-4",
                  isLatest ? "bg-primary" : "bg-muted-foreground",
                )}
              />

              {/* Version card */}
              <div className="ml-16">
                <Card className={cn(isLatest && "border-primary shadow-md")}>
                  <AccordionTrigger className="p-4 hover:no-underline">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">v{version.version}</h2>
                        {isLatest && <Badge variant="default">Latest</Badge>}
                      </div>
                      <p className="text-muted-foreground mt-1 text-left text-xs">
                        {new Date(version.date).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    {version.compareUrl && (
                      <a
                        href={version.compareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary mr-4 flex items-center gap-1 text-sm hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Compare
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </AccordionTrigger>

                  <AccordionContent>
                    <CardContent className="space-y-4 pb-2 pt-0">
                      {Object.entries(version.categories).map(([categoryKey, entries]) => {
                        if (!entries || entries.length === 0) return null;

                        const category = CATEGORY_CONFIG[categoryKey as keyof typeof CATEGORY_CONFIG];
                        if (!category) return null;

                        const Icon = category.icon;

                        return (
                          <div key={categoryKey} className="space-y-2">
                            {/* Category header */}
                            <div className="flex items-center gap-2">
                              <div
                                className={cn("flex h-6 w-6 items-center justify-center rounded-md", category.bgColor)}
                              >
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <h3 className="font-semibold">{category.label}</h3>
                              <Badge variant={`secondary`}>{entries.length}</Badge>
                            </div>

                            {/* Category entries */}
                            <ul className="ml-8 list-inside list-disc space-y-2">
                              {entries.map((entry, idx) => (
                                <li key={idx} className="group text-sm">
                                  {entry.message}
                                  {entry.commitUrl && entry.commitHash && (
                                    <a
                                      href={entry.commitUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-primary ml-2 inline-flex items-center gap-1 font-mono text-xs opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                      {entry.commitHash.slice(0, 7)}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </CardContent>
                  </AccordionContent>
                </Card>
              </div>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
