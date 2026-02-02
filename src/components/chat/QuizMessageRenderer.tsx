/**
 * QuizMessageRenderer - Renders quiz content from message meta.toolResult
 * Parses the AI's generate_quiz tool output and displays QuizEngine
 */

import { QuizEngine, type QuizQuestion } from "@/components/teacher";
import { useLesson } from "@/contexts/LessonContext";

interface QuizToolResult {
  type: "tool_result";
  tool: "generate_quiz";
  success: boolean;
  data?: {
    questions: QuizQuestion[];
    step_range?: string;
    topic?: string;
  };
  error?: string;
}

interface QuizMessageRendererProps {
  meta?: {
    toolResult?: QuizToolResult;
    quizQuestions?: QuizQuestion[];
  };
  onQuizComplete?: (passed: boolean, score: number) => void;
}

export function QuizMessageRenderer({ meta, onQuizComplete }: QuizMessageRendererProps) {
  const { isQuizMode } = useLesson();
  
  // Parse quiz questions from meta
  const quizData = meta?.toolResult?.data || meta?.quizQuestions 
    ? { questions: meta?.toolResult?.data?.questions || meta?.quizQuestions || [] }
    : null;

  if (!quizData?.questions?.length) {
    return null;
  }

  // Only render if in quiz mode or if questions are explicitly provided
  if (!isQuizMode && !meta?.quizQuestions?.length) {
    return null;
  }

  return (
    <div className="my-4">
      <QuizEngine
        questions={quizData.questions}
        onComplete={onQuizComplete}
      />
    </div>
  );
}

/**
 * Parse quiz JSON from markdown code blocks in message content
 * Fallback for when AI returns quiz as JSON in message
 */
export function parseQuizFromContent(content: string): QuizQuestion[] | null {
  try {
    // Look for ```quiz or ```json blocks
    const quizMatch = content.match(/```(?:quiz|json)?\s*\n([\s\S]*?)\n```/);
    if (!quizMatch) return null;

    const jsonStr = quizMatch[1].trim();
    const parsed = JSON.parse(jsonStr);
    
    // Validate structure
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) {
      return parsed as QuizQuestion[];
    }
    
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions as QuizQuestion[];
    }

    return null;
  } catch {
    return null;
  }
}

export default QuizMessageRenderer;
