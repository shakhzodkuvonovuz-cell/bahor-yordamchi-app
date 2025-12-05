// Client-side text extraction for supported file types
// Max 20,000 characters to keep payload size reasonable

const MAX_TEXT_LENGTH = 20000;

// File types that can be read as text
const TEXT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/xml',
  'application/json',
  'application/xml',
];

const TEXT_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.htm',
  '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.log',
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h',
  '.css', '.scss', '.less', '.sql', '.sh', '.bash', '.zsh',
];

export type FileReadStatus = 'ready' | 'unsupported' | 'error';

export interface TextExtractionResult {
  text: string | null;
  status: FileReadStatus;
  truncated: boolean;
}

/**
 * Check if a file can be read as text
 */
export function isTextReadable(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Check MIME type
  if (TEXT_MIME_TYPES.some(t => mimeType.startsWith(t))) {
    return true;
  }
  
  // Check extension
  if (TEXT_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
    return true;
  }
  
  // Empty MIME type with text extension (common for .md, .json on some systems)
  if (!mimeType || mimeType === 'application/octet-stream') {
    return TEXT_EXTENSIONS.some(ext => fileName.endsWith(ext));
  }
  
  return false;
}

/**
 * Check if file is an image (handled by vision pipeline)
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a PDF (handled separately)
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Check if file is a Word document (not yet supported in beta)
 */
export function isWordFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type.includes('wordprocessingml') || 
         type.includes('msword') ||
         name.endsWith('.doc') || 
         name.endsWith('.docx');
}

/**
 * Extract text content from a file
 */
export async function extractTextFromFile(file: File): Promise<TextExtractionResult> {
  // Images are handled by vision pipeline, not text extraction
  if (isImageFile(file)) {
    return { text: null, status: 'ready', truncated: false };
  }
  
  // PDFs are handled by documentService (vision/OCR)
  if (isPdfFile(file)) {
    return { text: null, status: 'ready', truncated: false };
  }
  
  // Word docs not supported in beta
  if (isWordFile(file)) {
    return { text: null, status: 'unsupported', truncated: false };
  }
  
  // Check if text-readable
  if (!isTextReadable(file)) {
    return { text: null, status: 'unsupported', truncated: false };
  }
  
  try {
    const text = await file.text();
    const truncated = text.length > MAX_TEXT_LENGTH;
    const finalText = truncated ? text.slice(0, MAX_TEXT_LENGTH) + '\n\n[... truncated ...]' : text;
    
    return {
      text: finalText,
      status: 'ready',
      truncated,
    };
  } catch (error) {
    console.error('Text extraction error:', error);
    return { text: null, status: 'error', truncated: false };
  }
}

/**
 * Get human-readable status label for file
 */
export function getFileReadStatusLabel(
  status: FileReadStatus | undefined,
  language: string
): string | null {
  if (!status) return null;
  
  const labels: Record<FileReadStatus, Record<string, string>> = {
    ready: {
      uz: "O'qishga tayyor",
      en: "Ready to read",
      ru: "Готов к чтению",
      tr: "Okumaya hazır",
    },
    unsupported: {
      uz: "Qo'llab-quvvatlanmaydi (beta)",
      en: "Unsupported (beta)",
      ru: "Не поддерживается (бета)",
      tr: "Desteklenmiyor (beta)",
    },
    error: {
      uz: "O'qib bo'lmadi",
      en: "Could not read",
      ru: "Не удалось прочитать",
      tr: "Okunamadı",
    },
  };
  
  return labels[status]?.[language] || labels[status]?.en || null;
}
