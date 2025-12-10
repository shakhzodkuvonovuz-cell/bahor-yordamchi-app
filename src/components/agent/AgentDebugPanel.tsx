import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Bug, FileText, Check, AlertCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { FileReadinessResult } from "@/hooks/useAgentFileStatus";

interface AgentDebugPanelProps {
  fileReadiness: FileReadinessResult;
  contextSnapshot?: {
    goal: string;
    filesIncluded: number;
    totalChars: number;
    filesPayload?: Array<{ filename: string; textLength: number }>;
  };
  runStatus?: string;
  show?: boolean;
}

export function AgentDebugPanel({ 
  fileReadiness, 
  contextSnapshot, 
  runStatus,
  show = false 
}: AgentDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show if ?debug=1 in URL or explicitly passed show=true
  const shouldShow = show || new URLSearchParams(window.location.search).get("debug") === "1";

  if (!shouldShow) return null;

  const copyContextSnapshot = () => {
    if (!contextSnapshot) {
      toast.error("No context snapshot available");
      return;
    }

    const snapshot = {
      timestamp: new Date().toISOString(),
      route: window.location.pathname,
      buildVersion: import.meta.env.VITE_BUILD_VERSION || "dev",
      goal: contextSnapshot.goal?.slice(0, 200),
      filesIncluded: contextSnapshot.filesIncluded,
      totalExtractedChars: contextSnapshot.totalChars,
      files: contextSnapshot.filesPayload?.map(f => ({
        filename: f.filename,
        extractedChars: f.textLength,
      })),
      fileReadiness: {
        readyCount: fileReadiness.readyCount,
        processingCount: fileReadiness.processingCount,
        failedCount: fileReadiness.failedCount,
        allFilesReady: fileReadiness.allFilesReady,
      },
      runStatus,
    };

    navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    toast.success("Debug snapshot copied!");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <Check className="h-3 w-3 text-green-500" />;
      case "processing":
        return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />;
      case "failed":
      case "missing":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-dashed border-yellow-500/50 rounded-lg bg-yellow-500/5">
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between h-8 px-3 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/10"
        >
          <span className="flex items-center gap-2 text-xs font-mono">
            <Bug className="h-3.5 w-3.5" />
            Debug Panel
          </span>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-3 pb-3 space-y-3">
        {/* Summary Row */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <Badge variant="outline" className="text-[10px]">
            Total chars: {fileReadiness.totalExtractedChars.toLocaleString()}
          </Badge>
          <Badge 
            variant="outline" 
            className={`text-[10px] ${fileReadiness.allFilesReady ? "border-green-500 text-green-600" : "border-yellow-500 text-yellow-600"}`}
          >
            Ready: {fileReadiness.readyCount}
          </Badge>
          {fileReadiness.processingCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
              Processing: {fileReadiness.processingCount}
            </Badge>
          )}
          {fileReadiness.failedCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-destructive text-destructive">
              Failed: {fileReadiness.failedCount}
            </Badge>
          )}
          {runStatus && (
            <Badge variant="secondary" className="text-[10px]">
              Run: {runStatus}
            </Badge>
          )}
        </div>

        {/* File List */}
        {fileReadiness.fileStatuses.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Files</p>
            <div className="space-y-1 max-h-32 overflow-auto">
              {fileReadiness.fileStatuses.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center gap-2 text-xs font-mono bg-muted/50 rounded px-2 py-1"
                >
                  {getStatusIcon(file.status)}
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate flex-1" title={file.filename}>
                    {file.filename}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {file.extractedTextLength.toLocaleString()} chars
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] px-1 py-0 ${
                      file.status === "ready" ? "text-green-600" : 
                      file.status === "processing" ? "text-yellow-600" : 
                      "text-destructive"
                    }`}
                  >
                    {file.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Copy Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-7 text-xs gap-1.5"
          onClick={copyContextSnapshot}
        >
          <Copy className="h-3 w-3" />
          Copy context snapshot
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
