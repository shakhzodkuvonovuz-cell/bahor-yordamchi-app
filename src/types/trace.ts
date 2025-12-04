// Trace types for "Reasoned for Xs" feature

export type TraceStep = 
  | 'thinking'
  | 'analyzing_request'
  | 'image_analysis'
  | 'web_search'
  | 'reading_files'
  | 'drafting_answer'
  | 'safety_check'
  | 'formatting'
  | 'saving';

export interface TraceStepData {
  step: TraceStep;
  startMs: number;
  endMs?: number;
  durMs?: number;
  data?: {
    sources?: { title: string; url: string }[];
    [key: string]: any;
  };
}

export interface TraceEvent {
  type: 'trace';
  step: TraceStep;
  status: 'start' | 'end';
  t: number; // milliseconds since request start
  data?: {
    sources?: { title: string; url: string }[];
    [key: string]: any;
  };
}

export interface TraceComplete {
  type: 'trace_complete';
  elapsed_ms: number;
  sources?: { title: string; url: string }[];
}

export interface MessageTrace {
  steps: TraceStepData[];
  elapsedMs: number;
  sources: { title: string; url: string }[];
  isComplete: boolean;
}
