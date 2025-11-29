import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// OCR engine upgrade path: Google Vision / Enterprise OCR planned for Premium phase.

export interface OCRResult {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * Extract text from an image using Tesseract OCR
 * Supports Uzbek, Russian, and English text
 */
export async function extractTextFromImage(imageSource: string | File | Blob): Promise<OCRResult> {
  try {
    // Use multiple languages for better accuracy
    const result = await Tesseract.recognize(
      imageSource,
      'eng+rus+uzb_cyrl', // English, Russian, and Uzbek Cyrillic
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      }
    );

    const text = result.data.text.trim();
    
    if (!text) {
      return {
        success: false,
        text: '',
        error: 'No text found in image',
      };
    }

    return {
      success: true,
      text,
    };
  } catch (error) {
    console.error('OCR error:', error);
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'OCR failed',
    };
  }
}

/**
 * Convert a PDF page to an image canvas
 */
async function pdfPageToCanvas(page: any, scale: number = 2): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  return canvas;
}

/**
 * Extract text from a PDF file using PDF.js + Tesseract OCR
 * Processes first 5 pages to keep it fast
 */
export async function extractTextFromPDF(pdfFile: File): Promise<OCRResult> {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const maxPages = Math.min(pdf.numPages, 5); // Limit to first 5 pages for MVP
    const extractedTexts: string[] = [];
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // First try to extract text directly from PDF (for searchable PDFs)
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      if (pageText.length > 50) {
        // PDF has embedded text, use it directly
        extractedTexts.push(`--- Sahifa ${pageNum} ---\n${pageText}`);
      } else {
        // PDF is likely scanned, use OCR
        const canvas = await pdfPageToCanvas(page);
        const ocrResult = await extractTextFromImage(canvas.toDataURL('image/png'));
        
        if (ocrResult.success && ocrResult.text) {
          extractedTexts.push(`--- Sahifa ${pageNum} ---\n${ocrResult.text}`);
        }
      }
    }
    
    if (extractedTexts.length === 0) {
      return {
        success: false,
        text: '',
        error: 'Could not extract text from PDF',
      };
    }
    
    const combinedText = extractedTexts.join('\n\n');
    
    return {
      success: true,
      text: combinedText,
    };
  } catch (error) {
    console.error('PDF OCR error:', error);
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'PDF processing failed',
    };
  }
}

/**
 * Process attachments and extract text using OCR
 * Returns extracted text or null if no text could be extracted
 */
export async function processAttachmentsForOCR(
  attachments: Array<{ type: string; url?: string; previewUrl?: string; name: string }>,
  onProgress?: (status: string) => void
): Promise<{ extractedText: string | null; hasOCR: boolean }> {
  if (!attachments || attachments.length === 0) {
    return { extractedText: null, hasOCR: false };
  }
  
  const extractedTexts: string[] = [];
  let hasOCR = false;
  
  for (const attachment of attachments) {
    const isPDF = attachment.type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf');
    const isImage = attachment.type.startsWith('image/');
    
    if (isPDF && attachment.previewUrl) {
      hasOCR = true;
      onProgress?.("PDF hujjati o'qilmoqda...");
      
      try {
        // Fetch the PDF file from the URL
        const response = await fetch(attachment.previewUrl);
        const blob = await response.blob();
        const file = new File([blob], attachment.name, { type: 'application/pdf' });
        
        const result = await extractTextFromPDF(file);
        if (result.success && result.text) {
          extractedTexts.push(`[${attachment.name}]\n${result.text}`);
        }
      } catch (error) {
        console.error('PDF fetch error:', error);
      }
    } else if (isImage && (attachment.url || attachment.previewUrl)) {
      hasOCR = true;
      onProgress?.("Rasm o'qilmoqda...");
      
      const imageUrl = attachment.url || attachment.previewUrl;
      if (imageUrl) {
        const result = await extractTextFromImage(imageUrl);
        if (result.success && result.text) {
          extractedTexts.push(`[${attachment.name}]\n${result.text}`);
        }
      }
    }
  }
  
  if (extractedTexts.length === 0) {
    return { extractedText: null, hasOCR };
  }
  
  return {
    extractedText: extractedTexts.join('\n\n---\n\n'),
    hasOCR: true,
  };
}
