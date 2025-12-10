/**
 * Media Configuration Module
 * 
 * Reads and validates ImageKit environment variables.
 * Exports configuration for ImageKit client.
 * 
 * @requirements 19.4, 19.9
 */

import { getEnvVar } from './env';

/**
 * Media configuration interface
 */
export interface MediaConfig {
  /** ImageKit public key (client-side) */
  publicKey: string;
  /** ImageKit private key (server-side) */
  privateKey: string;
  /** ImageKit URL endpoint for CDN */
  urlEndpoint: string;
}

/**
 * Validate ImageKit public key format
 * Public keys start with 'public_'
 */
export function isValidPublicKey(key: string): boolean {
  return key.startsWith('public_');
}

/**
 * Validate ImageKit private key format
 * Private keys start with 'private_'
 */
export function isValidPrivateKey(key: string): boolean {
  return key.startsWith('private_');
}

/**
 * Validate ImageKit URL endpoint format
 * Should be a valid HTTPS URL containing imagekit.io
 */
export function isValidUrlEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.includes('imagekit.io');
  } catch {
    return false;
  }
}

/**
 * Get media configuration from environment variables
 * Validates key formats and URL endpoint
 */
export function getMediaConfig(): MediaConfig {
  const publicKey = getEnvVar('NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY');
  const privateKey = getEnvVar('IMAGEKIT_PRIVATE_KEY');
  const urlEndpoint = getEnvVar('NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT');
  
  // Validate public key format
  if (!isValidPublicKey(publicKey)) {
    throw new Error(
      `Invalid ImageKit public key format. ` +
      `Expected key starting with 'public_'. ` +
      `Received: ${publicKey.substring(0, 15)}...`
    );
  }
  
  // Validate private key format
  if (!isValidPrivateKey(privateKey)) {
    throw new Error(
      `Invalid ImageKit private key format. ` +
      `Expected key starting with 'private_'. ` +
      `Received: ${privateKey.substring(0, 15)}...`
    );
  }
  
  // Validate URL endpoint format
  if (!isValidUrlEndpoint(urlEndpoint)) {
    throw new Error(
      `Invalid ImageKit URL endpoint format. ` +
      `Expected HTTPS URL containing 'imagekit.io'. ` +
      `Received: ${urlEndpoint}`
    );
  }
  
  return {
    publicKey,
    privateKey,
    urlEndpoint,
  };
}

/**
 * Get ImageKit public key
 */
export function getImageKitPublicKey(): string {
  const key = getEnvVar('NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY');
  if (!isValidPublicKey(key)) {
    throw new Error('Invalid ImageKit public key format');
  }
  return key;
}

/**
 * Get ImageKit private key
 */
export function getImageKitPrivateKey(): string {
  const key = getEnvVar('IMAGEKIT_PRIVATE_KEY');
  if (!isValidPrivateKey(key)) {
    throw new Error('Invalid ImageKit private key format');
  }
  return key;
}

/**
 * Get ImageKit URL endpoint
 */
export function getImageKitUrlEndpoint(): string {
  const url = getEnvVar('NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT');
  if (!isValidUrlEndpoint(url)) {
    throw new Error('Invalid ImageKit URL endpoint format');
  }
  return url;
}

/**
 * Check if media configuration is valid
 * Returns false if any required variables are missing or invalid
 */
export function isMediaConfigValid(): boolean {
  try {
    getMediaConfig();
    return true;
  } catch {
    return false;
  }
}
