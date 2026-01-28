/**
 * Document thumbnail utilities
 * Note: PDF thumbnail generation requires server-side processing
 * For now, we'll indicate that PDF previews need to be uploaded manually
 */

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: File | null): boolean {
  if (!file) return false;
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Check if we can auto-generate a thumbnail for this file type
 * Currently, only PDFs would benefit from auto-thumbnails, but
 * client-side PDF rendering has compatibility issues.
 * Returns false - thumbnails should be uploaded manually or we use placeholders.
 */
export function canGenerateThumbnail(file: File): boolean {
  // PDF thumbnail generation disabled due to build compatibility issues
  // Users can upload custom thumbnails instead
  return false;
}

/**
 * Placeholder for future PDF thumbnail generation
 * Returns null - thumbnails should be uploaded manually
 */
export async function generatePdfThumbnailFile(
  file: File,
  maxWidth: number = 400
): Promise<File | null> {
  // PDF thumbnail generation is not available client-side
  // due to compatibility issues with pdfjs-dist and Vite build targets
  console.log('PDF thumbnail generation not available - please upload a custom thumbnail');
  return null;
}
