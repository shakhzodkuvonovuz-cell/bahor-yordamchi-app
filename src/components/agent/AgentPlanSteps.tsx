import { useState } from "react";
import { 
  Check, Loader2, AlertCircle, ChevronDown, ChevronUp, 
  Sparkles, ExternalLink, RefreshCw, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface AgentStep {
  id: string;
  step_index: number;
  title: string;
  rationale?: string | null;
  status: string;
  tool_name?: string | null;
  tool_output?: any;
  error?: string | null;
  created_at?: string;
}

interface AgentPlanStepsProps {
  steps: AgentStep[];
  isRunning: boolean;
  onRetryStep?: (stepId: string) => void;
  onSourceClick?: (source: any) => void;
}

export function AgentPlanSteps({ 
  steps, 
  isRunning, 
  onRetryStep,
  onSourceClick 
}: AgentPlanStepsProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const completedSteps = steps.filter((s) => s.status === "done").length;
  const runningSteps = steps.filter((s) => s.status === "running").length;
  const errorSteps = steps.filter((s) => s.status === "error").length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const toggleStepExpanded = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "done":
        return <Check className="h-4 w-4 text-green-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[9px]">Tayyor</Badge>;
      case "running":
        return <Badge variant="secondary" className="text-[9px]"><Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />Ishlayapti</Badge>;
      case "error":
        return <Badge variant="destructive" className="text-[9px]">Xato</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px]">Kutilmoqda</Badge>;
    }
  };

  const getToolBadge = (toolName?: string | null) => {
    if (!toolName) return null;
    const toolLabels: Record<string, string> = {
      web_search: "Web qidiruv",
      generate_image: "Rasm yaratish",
      analyze_image: "Rasm tahlili",
      reasoning: "Tahlil",
      write: "Yozish",
    };
    return (
      <Badge variant="outline" className="text-[9px]">
        {toolLabels[toolName] || toolName}
      </Badge>
    );
  };

  if (steps.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 px-3 py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Bajarish rejasi
          </CardTitle>
          <div className="flex items-center gap-2">
            {errorSteps > 0 && (
              <Badge variant="destructive" className="text-[9px]">
                {errorSteps} xato
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {completedSteps}/{totalSteps}
            </Badge>
          </div>
        </div>
        
        {/* Progress bar */}
        {isRunning && totalSteps > 0 && (
          <div className="mt-2 space-y-1">
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{Math.round(progress)}% bajarildi</span>
              {runningSteps > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {runningSteps} ta qadam ishlayapti
                </span>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-3 pb-3 space-y-1.5">
        {steps.map((step, index) => (
          <Collapsible
            key={step.id}
            open={expandedSteps.has(index)}
            onOpenChange={() => toggleStepExpanded(index)}
          >
            <div
              className={cn(
                "rounded-lg border transition-colors",
                step.status === "running" && "border-primary/50 bg-primary/5",
                step.status === "done" && "border-green-500/30 bg-green-500/5",
                step.status === "error" && "border-destructive/30 bg-destructive/5"
              )}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-start gap-2 p-2 text-left">
                  <div className="mt-0.5">{getStepIcon(step.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium">{step.title}</span>
                      {getStatusBadge(step.status)}
                      {getToolBadge(step.tool_name)}
                    </div>
                    {step.rationale && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        {step.rationale}
                      </p>
                    )}
                  </div>
                  {step.tool_output && (
                    expandedSteps.has(index) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )
                  )}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-2 pb-2 pt-0 border-t border-border/50 mx-2">
                  {/* Error display */}
                  {step.error && (
                    <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                      <p className="font-medium mb-1">Xato:</p>
                      <p className="text-[11px]">{step.error}</p>
                      {onRetryStep && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-6 text-[10px] gap-1"
                          onClick={() => onRetryStep(step.id)}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Qayta urinish
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Tool output display */}
                  {step.tool_output && (
                    <div className="mt-2 space-y-2">
                      {/* Web search sources */}
                      {step.tool_name === "web_search" && step.tool_output.sources && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Manbalar:</p>
                          <div className="flex flex-wrap gap-1">
                            {(step.tool_output.sources as any[]).slice(0, 5).map((source: any, i: number) => (
                              <button
                                key={i}
                                onClick={() => onSourceClick?.(source)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] rounded-full bg-muted hover:bg-muted/80 transition-colors truncate max-w-[180px]"
                              >
                                <span className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-medium shrink-0">
                                  {i + 1}
                                </span>
                                <span className="truncate">
                                  {source.title || new URL(source.url).hostname}
                                </span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Image generation result */}
                      {step.tool_name === "generate_image" && step.tool_output.imageUrl && (
                        <div className="mt-2">
                          <img
                            src={step.tool_output.imageUrl}
                            alt="Generated"
                            className="rounded-lg max-h-[150px] object-contain"
                          />
                        </div>
                      )}

                      {/* Summary text */}
                      {step.tool_output.summary && (
                        <div className="mt-2 p-2 rounded bg-muted/50">
                          <p className="text-[10px] text-muted-foreground">{step.tool_output.summary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
