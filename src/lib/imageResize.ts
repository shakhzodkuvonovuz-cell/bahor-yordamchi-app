/**
 * Client-side image resizing utility for Image Studio
 * Uses browser Canvas API to resize images before upload
 */

export interface ResizeOptions {
  maxLongEdge: number;
  quality: number;
  format: "image/jpeg" | "image/png" | "image/webp";
}

const DEFAULT_OPTIONS: ResizeOptions = {
  maxLongEdge: 1536,
  quality: 0.85,
  format: "image/jpeg",
};

/**
 * Loads an image file into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Gets EXIF orientation from image file
 * Returns 1-8 orientation value, or 1 if not found
 */
async function getExifOrientation(file: File): Promise<number> {
  try {
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);
    
    // Check for JPEG marker
    if (view.getUint16(0, false) !== 0xFFD8) return 1;
    
    let offset = 2;
    while (offset < view.byteLength) {
      if (view.getUint16(offset, false) === 0xFFE1) {
        // Found EXIF marker
        const exifOffset = offset + 4;
        if (view.getUint32(exifOffset, false) !== 0x45786966) return 1; // "Exif"
        
        const tiffOffset = exifOffset + 6;
        const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
        
        const ifdOffset = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);
        const numEntries = view.getUint16(ifdOffset, littleEndian);
        
        for (let i = 0; i < numEntries; i++) {
          const entryOffset = ifdOffset + 2 + i * 12;
          if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
            // Orientation tag
            return view.getUint16(entryOffset + 8, littleEndian);
          }
        }
        return 1;
      }
      offset += 2 + view.getUint16(offset + 2, false);
    }
  } catch {
    // Ignore EXIF parsing errors
  }
  return 1;
}

/**
 * Applies EXIF orientation transform to canvas context
 */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
): { width: number; height: number } {
  switch (orientation) {
    case 2: // Flip horizontal
      ctx.scale(-1, 1);
      ctx.translate(-width, 0);
      return { width, height };
    case 3: // Rotate 180
      ctx.rotate(Math.PI);
      ctx.translate(-width, -height);
      return { width, height };
    case 4: // Flip vertical
      ctx.scale(1, -1);
      ctx.translate(0, -height);
      return { width, height };
    case 5: // Rotate 90 CW + flip horizontal
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      return { width: height, height: width };
    case 6: // Rotate 90 CW
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -height);
      return { width: height, height: width };
    case 7: // Rotate 90 CCW + flip horizontal
      ctx.rotate(-Math.PI / 2);
      ctx.scale(1, -1);
      ctx.translate(-width, 0);
      return { width: height, height: width };
    case 8: // Rotate 90 CCW
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-width, 0);
      return { width: height, height: width };
    default: // Normal (1) or unknown
      return { width, height };
  }
}

/**
 * Resizes an image file to fit within maxLongEdge, preserving aspect ratio
 * and EXIF orientation. Returns a Blob in the specified format.
 */
export async function resizeImage(
  file: File,
  options: Partial<ResizeOptions> = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Load image and get orientation
  const [img, orientation] = await Promise.all([
    loadImage(file),
    getExifOrientation(file),
  ]);
  
  let { width, height } = img;
  
  // Swap dimensions for rotated orientations
  if (orientation >= 5 && orientation <= 8) {
    [width, height] = [height, width];
  }
  
  // Calculate scaled dimensions
  const longEdge = Math.max(width, height);
  let scale = 1;
  if (longEdge > opts.maxLongEdge) {
    scale = opts.maxLongEdge / longEdge;
  }
  
  const scaledWidth = Math.round(width * scale);
  const scaledHeight = Math.round(height * scale);
  
  // Create canvas with correct dimensions
  const canvas = document.createElement("canvas");
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  
  // Apply orientation transform
  if (orientation > 1) {
    applyOrientation(ctx, orientation, scaledWidth, scaledHeight);
  }
  
  // Draw image scaled
  ctx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    0,
    0,
    orientation >= 5 && orientation <= 8 ? scaledHeight : scaledWidth,
    orientation >= 5 && orientation <= 8 ? scaledWidth : scaledHeight
  );
  
  // Clean up image object URL
  URL.revokeObjectURL(img.src);
  
  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create image blob"));
        }
      },
      opts.format,
      opts.quality
    );
  });
}

/**
 * Generates a storage path for studio input images
 */
export function generateStudioInputPath(userId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uuid = crypto.randomUUID();
  return `${userId}/studio_inputs/${year}/${month}/${uuid}.jpg`;
}
