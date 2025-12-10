import { useState, useEffect } from "react";
import { Bot, Play, Square, RotateCcw, Check, Loader2, AlertCircle, Sparkles, ExternalLink, ChevronDown, ChevronUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { AiResponseRenderer } from "@/components/ai/AiResponseRenderer";
import { cn } from "@/lib/utils";

interface AgentStep {
  id: string;
  step_index: number;
  title: string;
  rationale?: string | null;
  status: string;
  tool_name?: string | null;
  tool_output?: any;
  error?: string | null;
}

interface AgentRun {
  id: string;
  goal: string;
  status: string;
  plan?: any;
  final_output?: string | null;
  sources?: any;
  created_at: string;
}

export default function Agent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [goal, setGoal] = useState("");
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Subscribe to step updates
  useEffect(() => {
    if (!currentRun?.id) return;

    const channel = supabase
      .channel(`agent-steps-${currentRun.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_steps",
          filter: `run_id=eq.${currentRun.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSteps((prev) => [...prev, payload.new as AgentStep].sort((a, b) => a.step_index - b.step_index));
          } else if (payload.eventType === "UPDATE") {
            setSteps((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as AgentStep) : s))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRun?.id]);

  // Load steps when run changes
  useEffect(() => {
    if (!currentRun?.id) return;

    const loadSteps = async () => {
      const { data } = await supabase
        .from("agent_steps")
        .select("*")
        .eq("run_id", currentRun.id)
        .order("step_index", { ascending: true });

      if (data) {
        setSteps(data as unknown as AgentStep[]);
      }
    };

    loadSteps();
  }, [currentRun?.id]);

  const handleRun = async () => {
    if (!goal.trim() || !user) return;

    setIsRunning(true);
    setCurrentRun(null);
    setSteps([]);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ goal: goal.trim() }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Agent run failed");
      }

      // Load the completed run
      const { data: run } = await supabase
        .from("agent_runs")
        .select("*")
        .eq("id", result.runId)
        .single();

      if (run) {
        setCurrentRun(run as unknown as AgentRun);
      }

      toast.success(t("agent.completed") || "Agent completed!");
    } catch (error: any) {
      console.error("Agent error:", error);
      toast.error(error.message || "Failed to run agent");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = async () => {
    if (!currentRun?.id) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ runId: currentRun.id, action: "cancel" }),
        }
      );

      setCurrentRun((prev) => prev ? { ...prev, status: "cancelled" } : null);
      setIsRunning(false);
      toast.info(t("agent.cancelled") || "Agent run cancelled");
    } catch (error) {
      console.error("Cancel error:", error);
    }
  };

  const handleRetryStep = async (stepIndex: number) => {
    // For now, show toast - full retry would require more complex logic
    toast.info("Step retry coming soon!");
  };

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

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{t("agent.title") || "Agent"}</h1>
            <p className="text-sm text-muted-foreground">
              {t("agent.subtitle") || "Let AI plan and execute multi-step tasks"}
            </p>
          </div>
        </div>

        {/* Goal Input */}
        <Card>
          <CardContent className="pt-4">
            <Textarea
              placeholder={t("agent.goalPlaceholder") || "Describe your goal... e.g., 'Research the latest AI trends and summarize key findings'"}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-[100px] resize-none text-base"
              disabled={isRunning}
            />
            <div className="flex gap-2 mt-4">
              {isRunning ? (
                <Button variant="destructive" onClick={handleCancel} className="gap-2">
                  <Square className="h-4 w-4" />
                  {t("agent.stop") || "Stop"}
                </Button>
              ) : (
                <Button onClick={handleRun} disabled={!goal.trim()} className="gap-2">
                  <Play className="h-4 w-4" />
                  {t("agent.run") || "Run Agent"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Planning Skeleton */}
        {isRunning && steps.length === 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                <span className="text-sm font-medium">
                  {t("agent.planning") || "Agent is planning..."}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-5/6" />
              <Skeleton className="h-8 w-4/6" />
            </CardContent>
          </Card>
        )}

        {/* Steps Progress */}
        {steps.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("agent.plan") || "Execution Plan"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {steps.map((step, index) => (
                <Collapsible
                  key={step.id}
                  open={expandedSteps.has(index)}
                  onOpenChange={() => toggleStepExpanded(index)}
                >
                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg transition-colors",
                      step.status === "running" && "bg-primary/5",
                      step.status === "done" && "bg-green-500/5",
                      step.status === "error" && "bg-destructive/5"
                    )}
                  >
                    <div className="mt-0.5">{getStepIcon(step.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{step.title}</span>
                        {step.tool_name && (
                          <Badge variant="secondary" className="text-xs">
                            {step.tool_name}
                          </Badge>
                        )}
                      </div>
                      {step.rationale && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {step.rationale}
                        </p>
                      )}
                      
                      {/* Expanded content */}
                      <CollapsibleContent>
                        {step.tool_output?.result && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                            <AiResponseRenderer content={step.tool_output.result} />
                          </div>
                        )}
                        {step.error && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive flex items-center justify-between">
                            <span>{step.error}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRetryStep(index)}
                              className="h-7 gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              {t("agent.retry") || "Retry"}
                            </Button>
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                    
                    {(step.tool_output?.result || step.error) && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          {expandedSteps.has(index) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Final Output */}
        {currentRun?.final_output && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  {t("agent.result") || "Result"}
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {t("agent.saveCard") || "Save as Card"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <AiResponseRenderer content={currentRun.final_output} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sources */}
        {currentRun?.sources && currentRun.sources.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("agent.sources") || "Sources"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentRun.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors"
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                      alt=""
                      className="h-4 w-4 rounded-sm"
                    />
                    <span className="truncate max-w-[200px]">{source.title}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
