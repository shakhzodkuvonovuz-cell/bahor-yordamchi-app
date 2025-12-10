import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgentFileStatus {
  id: string;
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
  extractedTextLength: number;
  status: "ready" | "processing" | "failed" | "missing";
  lastUpdated?: string;
  error?: string;
}

export interface FileReadinessResult {
  allFilesReady: boolean;
  hasProcessingFiles: boolean;
  hasFailedFiles: boolean;
  totalExtractedChars: number;
  fileStatuses: AgentFileStatus[];
  readyCount: number;
  processingCount: number;
  failedCount: number;
}

const MIN_CHARS_FOR_READY = 200;

export function useAgentFileStatus(fileIds: string[]) {
  const [result, setResult] = useState<FileReadinessResult>({
    allFilesReady: false,
    hasProcessingFiles: false,
    hasFailedFiles: false,
    totalExtractedChars: 0,
    fileStatuses: [],
    readyCount: 0,
    processingCount: 0,
    failedCount: 0,
  });
  const [loading, setLoading] = useState(false);

  const checkFileStatuses = useCallback(async () => {
    if (fileIds.length === 0) {
      setResult({
        allFilesReady: true, // No files = can run without files
        hasProcessingFiles: false,
        hasFailedFiles: false,
        totalExtractedChars: 0,
        fileStatuses: [],
        readyCount: 0,
        processingCount: 0,
        failedCount: 0,
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch agent_files with extracted text info
      const { data: agentFiles, error } = await supabase
        .from("agent_files")
        .select("id, filename, mime_type, size_bytes, extraction_status, extracted_text, created_at")
        .in("id", fileIds);

      if (error) {
        console.error("Error fetching agent files:", error);
        setLoading(false);
        return;
      }

      const fileStatuses: AgentFileStatus[] = fileIds.map((fileId) => {
        const agentFile = agentFiles?.find((f) => f.id === fileId);

        if (!agentFile) {
          return {
            id: fileId,
            filename: "Unknown",
            extractedTextLength: 0,
            status: "missing" as const,
          };
        }

        const extractedTextLength = agentFile.extracted_text?.length || 0;
        const extractionStatus = agentFile.extraction_status;

        let status: AgentFileStatus["status"];
        if (extractionStatus === "ready" && extractedTextLength >= MIN_CHARS_FOR_READY) {
          status = "ready";
        } else if (extractionStatus === "failed") {
          status = "failed";
        } else if (["pending", "extracting", "uploading"].includes(extractionStatus)) {
          status = "processing";
        } else if (extractionStatus === "ready" && extractedTextLength < MIN_CHARS_FOR_READY) {
          // Extraction completed but not enough content
          status = "failed";
        } else {
          status = "missing";
        }

        return {
          id: agentFile.id,
          filename: agentFile.filename,
          mimeType: agentFile.mime_type || undefined,
          sizeBytes: agentFile.size_bytes || undefined,
          extractedTextLength,
          status,
          lastUpdated: agentFile.created_at,
        };
      });

      const readyCount = fileStatuses.filter((f) => f.status === "ready").length;
      const processingCount = fileStatuses.filter((f) => f.status === "processing").length;
      const failedCount = fileStatuses.filter((f) => f.status === "failed" || f.status === "missing").length;
      const totalExtractedChars = fileStatuses.reduce((sum, f) => sum + f.extractedTextLength, 0);

      setResult({
        allFilesReady: readyCount === fileIds.length,
        hasProcessingFiles: processingCount > 0,
        hasFailedFiles: failedCount > 0,
        totalExtractedChars,
        fileStatuses,
        readyCount,
        processingCount,
        failedCount,
      });
    } catch (err) {
      console.error("Error checking file statuses:", err);
    } finally {
      setLoading(false);
    }
  }, [fileIds]);

  // Initial check
  useEffect(() => {
    checkFileStatuses();
  }, [checkFileStatuses]);

  // Poll for updates when processing files exist
  useEffect(() => {
    if (!result.hasProcessingFiles) return;

    const interval = setInterval(() => {
      checkFileStatuses();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [result.hasProcessingFiles, checkFileStatuses]);

  return { ...result, loading, refresh: checkFileStatuses };
}
