/**
 * Media Upload Utilities
 * 
 * Provides validation and upload helper functions for ImageKit integration.
 * 
 * @requirements 17.2, 19.4, 19.9
 */

import { getImageKitClient } from './imagekit';

// Allowed image MIME types
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

// Max file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Default upload folder
export const DEFAULT_UPLOAD_FOLDER = '/blog';

/**
 * File validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Upload options
 */
export interface UploadOptions {
  folder?: string;
  useUniqueFileName?: boolean;
  tags?: string[];
  customMetadata?: Record<string, string>;
}

/**
 * Upload response from ImageKit
 */
export interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  url: string;
  filePath: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  size: number;
  fileType: string;
}

/**
 * Validate file type
 * @param mimeType - The MIME type to validate
 * @returns Validation result
 */
export function validateFileType(mimeType: string): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      error: `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validate file size
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size (default: MAX_FILE_SIZE)
 * @returns Validation result
 */
export function validateFileSize(size: number, maxSize: number = MAX_FILE_SIZE): ValidationResult {
  if (size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB, got ${(size / 1024 / 1024).toFixed(2)}MB`,
    };
  }
  return { valid: true };
}

/**
 * Validate a file for upload
 * Checks both type and size
 * @param mimeType - The MIME type of the file
 * @param size - The size of the file in bytes
 * @returns Validation result
 */
export function validateFile(mimeType: string, size: number): ValidationResult {
  const typeValidation = validateFileType(mimeType);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  const sizeValidation = validateFileSize(size);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  return { valid: true };
}

/**
 * Upload a file to ImageKit
 * @param file - File buffer to upload
 * @param filename - Original filename
 * @param options - Upload options
 * @returns ImageKit upload response
 */
export async function uploadToImageKit(
  file: Buffer,
  filename: string,
  options: UploadOptions = {}
): Promise<ImageKitUploadResponse> {
  const imagekit = getImageKitClient();
  
  const uploadResponse = await imagekit.upload({
    file: file.toString('base64'),
    fileName: filename,
    folder: options.folder || DEFAULT_UPLOAD_FOLDER,
    useUniqueFileName: options.useUniqueFileName ?? true,
    tags: options.tags,
    customMetadata: options.customMetadata,
  });

  return {
    fileId: uploadResponse.fileId,
    name: uploadResponse.name,
    url: uploadResponse.url,
    filePath: uploadResponse.filePath,
    thumbnailUrl: uploadResponse.thumbnailUrl,
    width: uploadResponse.width,
    height: uploadResponse.height,
    size: uploadResponse.size,
    fileType: uploadResponse.fileType,
  };
}

/**
 * Delete a file from ImageKit
 * @param fileId - ImageKit file ID
 */
export async function deleteFromImageKit(fileId: string): Promise<void> {
  const imagekit = getImageKitClient();
  await imagekit.deleteFile(fileId);
}

/**
 * Get authentication parameters for client-side uploads
 * @returns Authentication parameters for ImageKit
 */
export function getClientAuthParams(): {
  token: string;
  expire: number;
  signature: string;
} {
  const imagekit = getImageKitClient();
  return imagekit.getAuthenticationParameters();
}

/**
 * Sanitize filename for upload
 * Removes special characters and spaces
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Get extension
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot > 0 ? filename.slice(lastDot) : '';
  const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  
  // Sanitize name: lowercase, replace spaces with hyphens, remove special chars
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return sanitized + ext.toLowerCase();
}

/**
 * Get file extension from MIME type
 * @param mimeType - MIME type
 * @returns File extension (with dot)
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/svg+xml': '.svg',
  };
  return mimeToExt[mimeType] || '';
}
