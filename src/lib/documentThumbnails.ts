import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

/**
 * Generate a thumbnail image from the first page of a PDF
 * @param file - The PDF file to generate a thumbnail from
 * @param maxWidth - Maximum width of the thumbnail (default 400px)
 * @returns A Blob of the thumbnail image (PNG format)
 */
export async function generatePdfThumbnail(
  file: File,
  maxWidth: number = 400
): Promise<Blob | null> {
  try {
    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Get the first page
    const page = await pdf.getPage(1);
    
    // Calculate scale to fit within maxWidth while maintaining aspect ratio
    const viewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    
    // Create a canvas to render the page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error('Could not get canvas context');
      return null;
    }
    
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    // Render the page to the canvas
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;
    
    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/png',
        0.9
      );
    });
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    return null;
  }
}

/**
 * Generate a thumbnail from a PDF file and return it as a File object
 */
export async function generatePdfThumbnailFile(
  file: File,
  maxWidth: number = 400
): Promise<File | null> {
  const blob = await generatePdfThumbnail(file, maxWidth);
  if (!blob) return null;
  
  // Create a File from the Blob
  const thumbnailName = file.name.replace(/\.pdf$/i, '-thumbnail.png');
  return new File([blob], thumbnailName, { type: 'image/png' });
}

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Get supported document types for thumbnail generation
 */
export function canGenerateThumbnail(file: File): boolean {
  // Currently only PDF is supported
  return isPdfFile(file);
}
