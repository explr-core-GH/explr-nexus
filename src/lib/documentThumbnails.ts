/**
 * Document thumbnail utilities
 * Uses CloudConvert for server-side thumbnail generation
 */

const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: File | null): boolean {
  if (!file) return false;
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Check if a file is a document that can have thumbnails generated
 */
export function isDocumentFile(file: File | null): boolean {
  if (!file) return false;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? DOCUMENT_EXTENSIONS.includes(ext) : false;
}

/**
 * Get the file extension from a filename
 */
export function getFileExtension(fileName: string): string | null {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
}

/**
 * Check if we can auto-generate a thumbnail for this file type
 * Returns true for PDFs and Office documents
 */
export function canGenerateThumbnail(file: File): boolean {
  return isDocumentFile(file);
}
