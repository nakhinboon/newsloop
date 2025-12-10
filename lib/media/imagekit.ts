import ImageKit from 'imagekit';
import { getMediaConfig } from '@/lib/config/media';

/**
 * ImageKit Client Configuration
 * Uses environment configuration from lib/config/media.ts
 * 
 * @requirements 19.4, 19.9
 */

// Lazy initialization to avoid errors during build time
let _imagekit: ImageKit | null = null;

/**
 * Get the ImageKit client instance (singleton)
 * Lazily initializes the client on first use
 */
export function getImageKitClient(): ImageKit {
  if (!_imagekit) {
    const config = getMediaConfig();
    _imagekit = new ImageKit({
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      urlEndpoint: config.urlEndpoint,
    });
  }
  return _imagekit;
}

// Server-side ImageKit client (for backward compatibility)
export const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

// ImageKit transformation options
export interface ImageKitTransform {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  blur?: number;
  crop?: 'maintain_ratio' | 'force' | 'at_least' | 'at_max';
  focus?: 'auto' | 'center' | 'top' | 'left' | 'bottom' | 'right' | 'face';
}

/**
 * Generate an optimized ImageKit URL with transformations
 */
export function getOptimizedUrl(path: string, transforms?: ImageKitTransform): string {
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
  
  if (!transforms) {
    return `${urlEndpoint}${path}`;
  }

  const transformations: string[] = [];

  if (transforms.width) transformations.push(`w-${transforms.width}`);
  if (transforms.height) transformations.push(`h-${transforms.height}`);
  if (transforms.quality) transformations.push(`q-${transforms.quality}`);
  if (transforms.format) transformations.push(`f-${transforms.format}`);
  if (transforms.blur) transformations.push(`bl-${transforms.blur}`);
  if (transforms.crop) transformations.push(`c-${transforms.crop}`);
  if (transforms.focus) transformations.push(`fo-${transforms.focus}`);

  const transformString = transformations.join(',');
  
  return `${urlEndpoint}/tr:${transformString}${path}`;
}

/**
 * Generate a thumbnail URL
 */
export function getThumbnailUrl(path: string, width: number = 200, height?: number): string {
  return getOptimizedUrl(path, {
    width,
    height: height || width,
    crop: 'maintain_ratio',
    quality: 80,
    format: 'auto',
  });
}

/**
 * Generate authentication parameters for client-side uploads
 */
export function getAuthenticationParameters() {
  return imagekit.getAuthenticationParameters();
}

export default imagekit;
