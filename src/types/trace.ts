// Trace types for ThinkBar feature - shows real-time AI processing steps

export type TraceStep = 
  | 'preparing'
  | 'new_chat'
  | 'uploading'
  | 'parsing_files'
  | 'web_search'
  | 'selecting_model'
  | 'thinking'
  | 'writing'
  | 'saving'
  | 'generating_image'
  | 'delivering'
  // Legacy steps (for backwards compatibility)
  | 'analyzing_request'
  | 'image_analysis'
  | 'reading_files'
  | 'drafting_answer'
  | 'safety_check'
  | 'formatting';

export interface TraceStepDetail {
  // File-related (safe counts only)
  filesCount?: number;
  extractedChars?: number;
  // Web search (safe counts only)  
  sourcesCount?: number;
  // Model selection
  modelPreference?: 'chat' | 'reasoner';
  modelName?: string;
  // Image generation (safe metadata only)
  imageEngine?: string;
  imageModel?: string;
  imageSteps?: number;
  imageDurationMs?: number;
  imageSize?: string;
  translated?: boolean;
  // Saving status
  localSaved?: boolean;
  cloudSaved?: boolean;
  cloudError?: boolean;
  // Generic
  [key: string]: any;
}

export interface TraceStepData {
  step: TraceStep;
  startMs: number;
  endMs?: number;
  durMs?: number;
  detail?: TraceStepDetail;
}

export interface TraceEvent {
  type: 'trace' | 'status';
  step: TraceStep;
  status: 'start' | 'done' | 'end' | 'error'; // 'end' is legacy alias for 'done'
  t: number; // milliseconds since request start
  requestId?: string;
  detail?: TraceStepDetail;
  data?: TraceStepDetail; // Legacy field name
}

export interface TraceComplete {
  type: 'trace_complete';
  elapsed_ms: number;
  sources?: { title: string; url: string }[];
  detail?: TraceStepDetail;
}

export interface MessageTrace {
  steps: TraceStepData[];
  elapsedMs: number;
  sources: { title: string; url: string }[];
  isComplete: boolean;
  detail?: TraceStepDetail; // Aggregated safe details
}
