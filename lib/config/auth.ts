/**
 * Auth Configuration Module
 * 
 * Reads and validates Clerk authentication environment variables.
 * Exports configuration for Clerk initialization.
 * 
 * @requirements 19.2, 19.7
 */

import { getEnvVar, getEnvVarOrDefault } from './env';

/**
 * Auth configuration interface
 */
export interface AuthConfig {
  /** Clerk publishable key (client-side) */
  publishableKey: string;
  /** Clerk secret key (server-side) */
  secretKey: string;
  /** Sign-in URL */
  signInUrl: string;
  /** Sign-up URL */
  signUpUrl: string;
  /** Redirect URL after sign-in */
  afterSignInUrl: string;
  /** Redirect URL after sign-up */
  afterSignUpUrl: string;
}

/**
 * Validate Clerk publishable key format
 * Publishable keys start with 'pk_test_' or 'pk_live_'
 */
export function isValidPublishableKey(key: string): boolean {
  return key.startsWith('pk_test_') || key.startsWith('pk_live_');
}

/**
 * Validate Clerk secret key format
 * Secret keys start with 'sk_test_' or 'sk_live_'
 */
export function isValidSecretKey(key: string): boolean {
  return key.startsWith('sk_test_') || key.startsWith('sk_live_');
}

/**
 * Get auth configuration from environment variables
 * Validates key formats and presence
 */
export function getAuthConfig(): AuthConfig {
  const publishableKey = getEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  const secretKey = getEnvVar('CLERK_SECRET_KEY');
  
  // Validate key formats
  if (!isValidPublishableKey(publishableKey)) {
    throw new Error(
      `Invalid Clerk publishable key format. ` +
      `Expected key starting with 'pk_test_' or 'pk_live_'. ` +
      `Received: ${publishableKey.substring(0, 10)}...`
    );
  }
  
  if (!isValidSecretKey(secretKey)) {
    throw new Error(
      `Invalid Clerk secret key format. ` +
      `Expected key starting with 'sk_test_' or 'sk_live_'. ` +
      `Received: ${secretKey.substring(0, 10)}...`
    );
  }
  
  return {
    publishableKey,
    secretKey,
    signInUrl: getEnvVarOrDefault('NEXT_PUBLIC_CLERK_SIGN_IN_URL', '/dashboard/sign-in'),
    signUpUrl: getEnvVarOrDefault('NEXT_PUBLIC_CLERK_SIGN_UP_URL', '/dashboard/sign-up'),
    afterSignInUrl: getEnvVarOrDefault('NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL', '/dashboard'),
    afterSignUpUrl: getEnvVarOrDefault('NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL', '/dashboard'),
  };
}

/**
 * Get Clerk publishable key
 */
export function getClerkPublishableKey(): string {
  const key = getEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  if (!isValidPublishableKey(key)) {
    throw new Error('Invalid Clerk publishable key format');
  }
  return key;
}

/**
 * Get Clerk secret key
 */
export function getClerkSecretKey(): string {
  const key = getEnvVar('CLERK_SECRET_KEY');
  if (!isValidSecretKey(key)) {
    throw new Error('Invalid Clerk secret key format');
  }
  return key;
}

/**
 * Check if auth configuration is valid
 * Returns false if any required variables are missing or invalid
 */
export function isAuthConfigValid(): boolean {
  try {
    getAuthConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if running in test mode (using test keys)
 */
export function isTestMode(): boolean {
  try {
    const key = getEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    return key.startsWith('pk_test_');
  } catch {
    return false;
  }
}
