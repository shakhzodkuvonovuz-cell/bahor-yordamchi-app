import { supabase } from "@/integrations/supabase/client";

// Vision service using Lovable AI Gateway for real image understanding

export interface VisionAnalysisResult {
  success: boolean;
  analysis: string;
  error?: string;
}

/**
 * Resize image for mobile compatibility and faster uploads
 * Max dimension: 1920px, quality: 0.85
 */
export async function resizeImageForUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      let { width, height } = img;
      const maxDimension = 1920;
      
      // Scale down if needed
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with compression
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      resolve(base64);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert file/blob to base64 for API transmission
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Analyze image using Lovable AI Vision (Gemini)
 * This provides full semantic understanding, not just OCR
 */
export async function analyzeImageWithVision(
  imageSource: string | File | Blob,
  options: {
    mode?: string;
    language?: string;
    userPrompt?: string;
  } = {}
): Promise<VisionAnalysisResult> {
  try {
    let imageData: string;
    
    // Handle different input types
    if (typeof imageSource === 'string') {
      // If it's already a base64 string or URL
      if (imageSource.startsWith('data:')) {
        imageData = imageSource;
      } else if (imageSource.startsWith('http')) {
        // Fetch and convert to base64 for URLs
        try {
          const response = await fetch(imageSource);
          const blob = await response.blob();
          imageData = await fileToBase64(blob);
        } catch (e) {
          // If fetch fails, try passing URL directly
          imageData = imageSource;
        }
      } else {
        imageData = imageSource;
      }
    } else {
      // File or Blob - resize for mobile compatibility
      if (imageSource instanceof File && imageSource.type.startsWith('image/')) {
        imageData = await resizeImageForUpload(imageSource);
      } else {
        imageData = await fileToBase64(imageSource);
      }
    }

    // Call the vision analysis edge function
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: {
        imageBase64: imageData.startsWith('data:') ? imageData : undefined,
        imageUrl: !imageData.startsWith('data:') ? imageData : undefined,
        mode: options.mode || 'general',
        language: options.language || 'uz',
        userPrompt: options.userPrompt,
      },
    });

    if (error) {
      console.error('Vision API error:', error);
      return {
        success: false,
        analysis: '',
        error: error.message || 'Failed to analyze image',
      };
    }

    if (!data?.analysis) {
      return {
        success: false,
        analysis: '',
        error: 'No analysis returned',
      };
    }

    return {
      success: true,
      analysis: data.analysis,
    };
  } catch (error) {
    console.error('Vision service error:', error);
    return {
      success: false,
      analysis: '',
      error: error instanceof Error ? error.message : 'Vision analysis failed',
    };
  }
}

/**
 * Check if a file is an image that can be analyzed with vision
 */
export function isVisionSupportedImage(file: { type: string; name: string }): boolean {
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return supportedTypes.includes(file.type.toLowerCase()) || 
         /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
}

/**
 * Check if a PDF appears to be image-based (scanned) vs text-based
 * This is a heuristic - we check the first page's text content
 */
export async function isPdfImageBased(pdfFile: File): Promise<boolean> {
  try {
    // Dynamic import to avoid loading pdfjs when not needed
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    
    // If first page has very little text (<50 chars), it's likely image-based
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .trim();
    
    return pageText.length < 50;
  } catch (e) {
    console.error('Error checking PDF type:', e);
    // Default to text-based (use OCR) if we can't determine
    return false;
  }
}
