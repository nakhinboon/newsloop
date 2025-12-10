/**
 * Database Configuration Module
 * 
 * Reads and validates database connection strings from environment variables.
 * Exports configuration for Prisma client with Neon PostgreSQL.
 * 
 * @requirements 19.1, 19.6
 */

import { getEnvVar } from './env';

// PostgreSQL connection string pattern
// Matches: postgresql://user:password@host:port/database?params
const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\/.+/i;

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  /** Pooled connection URL for Prisma queries */
  url: string;
  /** Direct connection URL for migrations */
  directUrl: string;
}

/**
 * Validate that a string is a valid PostgreSQL connection URL
 */
export function isValidPostgresUrl(url: string): boolean {
  return POSTGRES_URL_PATTERN.test(url);
}

/**
 * Validate a database connection string format
 * Throws descriptive error if invalid
 */
function validateConnectionString(url: string, varName: string): void {
  if (!isValidPostgresUrl(url)) {
    throw new Error(
      `Invalid database connection string format for ${varName}. ` +
      `Expected a PostgreSQL URL starting with 'postgresql://' or 'postgres://'. ` +
      `Received: ${url.substring(0, 20)}...`
    );
  }
}

/**
 * Get database configuration from environment variables
 * Validates both URL format and presence
 */
export function getDatabaseConfig(): DatabaseConfig {
  const url = getEnvVar('DATABASE_URL');
  const directUrl = getEnvVar('DIRECT_URL');
  
  // Validate connection string formats
  validateConnectionString(url, 'DATABASE_URL');
  validateConnectionString(directUrl, 'DIRECT_URL');
  
  return {
    url,
    directUrl,
  };
}

/**
 * Get the pooled database URL for Prisma queries
 */
export function getDatabaseUrl(): string {
  const url = getEnvVar('DATABASE_URL');
  validateConnectionString(url, 'DATABASE_URL');
  return url;
}

/**
 * Get the direct database URL for migrations
 */
export function getDirectDatabaseUrl(): string {
  const directUrl = getEnvVar('DIRECT_URL');
  validateConnectionString(directUrl, 'DIRECT_URL');
  return directUrl;
}

/**
 * Check if database configuration is valid
 * Returns false if any required variables are missing or invalid
 */
export function isDatabaseConfigValid(): boolean {
  try {
    getDatabaseConfig();
    return true;
  } catch {
    return false;
  }
}
