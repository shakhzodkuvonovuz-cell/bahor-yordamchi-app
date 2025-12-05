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

export type FileReadStatus = 'ready' | 'unsupported' | 'error' | 'processing';

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
 * Check if file is a PDF
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
 * Extract text from PDF using pdf.js
 * Includes timeout and graceful error handling
 */
async function extractTextFromPdf(file: File): Promise<TextExtractionResult> {
  // Add timeout to prevent hanging
  const timeoutPromise = new Promise<TextExtractionResult>((_, reject) => {
    setTimeout(() => reject(new Error('PDF extraction timeout')), 15000);
  });
  
  const extractionPromise = (async (): Promise<TextExtractionResult> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const maxPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages
      const extractedTexts: string[] = [];
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();
          
          if (pageText) {
            extractedTexts.push(`--- Page ${pageNum} ---\n${pageText}`);
          }
        } catch (pageError) {
          console.warn(`Failed to extract page ${pageNum}:`, pageError);
        }
      }
      
      if (extractedTexts.length === 0) {
        // PDF might be image-based (scanned), not supported for text extraction in beta
        return { 
          text: null, 
          status: 'unsupported', 
          truncated: false 
        };
      }
      
      let fullText = extractedTexts.join('\n\n');
      const truncated = fullText.length > MAX_TEXT_LENGTH;
      if (truncated) {
        fullText = fullText.slice(0, MAX_TEXT_LENGTH) + '\n\n[... truncated ...]';
      }
      
      if (pdf.numPages > maxPages) {
        fullText += `\n\n[Note: Only first ${maxPages} of ${pdf.numPages} pages extracted]`;
      }
      
      return {
        text: fullText,
        status: 'ready',
        truncated,
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
      return { text: null, status: 'unsupported', truncated: false };
    }
  })();
  
  try {
    return await Promise.race([extractionPromise, timeoutPromise]);
  } catch (error) {
    console.error('PDF extraction failed or timed out:', error);
    return { text: null, status: 'unsupported', truncated: false };
  }
}

/**
 * Extract text content from a file
 */
export async function extractTextFromFile(file: File): Promise<TextExtractionResult> {
  // Images are handled by vision pipeline, not text extraction
  if (isImageFile(file)) {
    return { text: null, status: 'ready', truncated: false };
  }
  
  // PDFs - extract text directly
  if (isPdfFile(file)) {
    return extractTextFromPdf(file);
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
    processing: {
      uz: "O'qilmoqda...",
      en: "Reading...",
      ru: "Чтение...",
      tr: "Okunuyor...",
    },
  };
  
  return labels[status]?.[language] || labels[status]?.en || null;
}
