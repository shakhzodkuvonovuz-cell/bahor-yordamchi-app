// Unified document processing service
// Routes to Vision AI for images, OCR for text-based PDFs

import { analyzeImageWithVision, isVisionSupportedImage, isPdfImageBased, resizeImageForUpload } from './visionService';
import { extractTextFromPDF, extractTextFromImage } from './ocrService';

// Vision API upgrade note: Using Lovable AI Gateway with google/gemini-2.5-flash for image understanding

export interface DocumentAnalysisResult {
  success: boolean;
  content: string;
  type: 'vision' | 'ocr';
  error?: string;
}

export interface ProcessingProgress {
  status: string;
  percent?: number;
}

/**
 * Process a single attachment (image or PDF) and extract/analyze content
 * - Images: Use Vision AI for full semantic analysis
 * - Text-based PDFs: Use Tesseract OCR
 * - Image-based PDFs: Use Vision AI on each page
 */
export async function processDocument(
  attachment: {
    type: string;
    url?: string;
    previewUrl?: string;
    name: string;
  },
  options: {
    mode?: string;
    language?: string;
    userPrompt?: string;
    onProgress?: (progress: ProcessingProgress) => void;
  } = {}
): Promise<DocumentAnalysisResult> {
  const { mode, language, userPrompt, onProgress } = options;
  
  const isImage = isVisionSupportedImage(attachment);
  const isPDF = attachment.type === 'application/pdf' || 
                attachment.name.toLowerCase().endsWith('.pdf');
  
  // Process images with Vision AI
  if (isImage) {
    const imageUrl = attachment.url || attachment.previewUrl;
    if (!imageUrl) {
      return { success: false, content: '', type: 'vision', error: 'No image URL' };
    }
    
    onProgress?.({ 
      status: language === 'uz' ? 'Tasvir tahlil qilinmoqda...' :
              language === 'en' ? 'Analyzing image...' :
              language === 'ru' ? 'Анализ изображения...' :
              'Görsel analiz ediliyor...',
      percent: 50 
    });
    
    const result = await analyzeImageWithVision(imageUrl, { mode, language, userPrompt });
    
    return {
      success: result.success,
      content: result.analysis,
      type: 'vision',
      error: result.error,
    };
  }
  
  // Process PDFs
  if (isPDF) {
    const pdfUrl = attachment.previewUrl || attachment.url;
    if (!pdfUrl) {
      return { success: false, content: '', type: 'ocr', error: 'No PDF URL' };
    }
    
    onProgress?.({ 
      status: language === 'uz' ? 'PDF tekshirilmoqda...' :
              language === 'en' ? 'Checking PDF...' :
              language === 'ru' ? 'Проверка PDF...' :
              'PDF kontrol ediliyor...',
      percent: 20 
    });
    
    try {
      // Fetch the PDF file
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const file = new File([blob], attachment.name, { type: 'application/pdf' });
      
      // Check if PDF is image-based or text-based
      const isImageBased = await isPdfImageBased(file);
      
      if (isImageBased) {
        // For image-based PDFs, convert first few pages to images and use Vision
        onProgress?.({ 
          status: language === 'uz' ? 'PDF rasmlari tahlil qilinmoqda...' :
                  language === 'en' ? 'Analyzing PDF images...' :
                  language === 'ru' ? 'Анализ изображений PDF...' :
                  'PDF görselleri analiz ediliyor...',
          percent: 50 
        });
        
        // Use Vision AI on PDF pages (convert to image first)
        const pdfAnalysis = await analyzePdfPagesWithVision(file, { mode, language, userPrompt });
        return pdfAnalysis;
      } else {
        // Text-based PDF - use OCR for direct text extraction
        onProgress?.({ 
          status: language === 'uz' ? 'PDF matni o\'qilmoqda...' :
                  language === 'en' ? 'Reading PDF text...' :
                  language === 'ru' ? 'Чтение текста PDF...' :
                  'PDF metni okunuyor...',
          percent: 50 
        });
        
        const ocrResult = await extractTextFromPDF(file);
        return {
          success: ocrResult.success,
          content: ocrResult.text,
          type: 'ocr',
          error: ocrResult.error,
        };
      }
    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        success: false,
        content: '',
        type: 'ocr',
        error: error instanceof Error ? error.message : 'PDF processing failed',
      };
    }
  }
  
  return { success: false, content: '', type: 'ocr', error: 'Unsupported file type' };
}

/**
 * Convert PDF pages to images and analyze with Vision AI
 */
async function analyzePdfPagesWithVision(
  pdfFile: File,
  options: { mode?: string; language?: string; userPrompt?: string }
): Promise<DocumentAnalysisResult> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const maxPages = Math.min(pdf.numPages, 3); // Limit to first 3 pages for vision
    const analyses: string[] = [];
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context!,
        viewport: viewport,
      }).promise;
      
      // Convert canvas to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.85);
      
      // Analyze with Vision AI
      const result = await analyzeImageWithVision(imageData, {
        mode: options.mode,
        language: options.language,
        userPrompt: options.userPrompt || `This is page ${pageNum} of a PDF document. Analyze what you see.`,
      });
      
      if (result.success && result.analysis) {
        analyses.push(`--- Sahifa ${pageNum} ---\n${result.analysis}`);
      }
    }
    
    if (analyses.length === 0) {
      return {
        success: false,
        content: '',
        type: 'vision',
        error: 'Could not analyze PDF pages',
      };
    }
    
    return {
      success: true,
      content: analyses.join('\n\n'),
      type: 'vision',
    };
  } catch (error) {
    console.error('PDF vision analysis error:', error);
    return {
      success: false,
      content: '',
      type: 'vision',
      error: error instanceof Error ? error.message : 'PDF analysis failed',
    };
  }
}

/**
 * Process multiple attachments and return combined analysis
 */
export async function processAttachments(
  attachments: Array<{ type: string; url?: string; previewUrl?: string; name: string }>,
  options: {
    mode?: string;
    language?: string;
    userPrompt?: string;
    onProgress?: (status: string) => void;
  } = {}
): Promise<{ 
  content: string | null; 
  hasContent: boolean; 
  type: 'vision' | 'ocr' | 'mixed' | null;
}> {
  if (!attachments || attachments.length === 0) {
    return { content: null, hasContent: false, type: null };
  }
  
  const results: { name: string; content: string; type: 'vision' | 'ocr' }[] = [];
  let hasVision = false;
  let hasOcr = false;
  
  for (const attachment of attachments) {
    const result = await processDocument(attachment, {
      ...options,
      onProgress: (progress) => options.onProgress?.(progress.status),
    });
    
    if (result.success && result.content) {
      results.push({
        name: attachment.name,
        content: result.content,
        type: result.type,
      });
      
      if (result.type === 'vision') hasVision = true;
      if (result.type === 'ocr') hasOcr = true;
    }
  }
  
  if (results.length === 0) {
    return { content: null, hasContent: false, type: null };
  }
  
  // Combine results
  const combinedContent = results
    .map(r => `[${r.name}]\n${r.content}`)
    .join('\n\n---\n\n');
  
  const contentType: 'vision' | 'ocr' | 'mixed' = 
    hasVision && hasOcr ? 'mixed' : hasVision ? 'vision' : 'ocr';
  
  return {
    content: combinedContent,
    hasContent: true,
    type: contentType,
  };
}
