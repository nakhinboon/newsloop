/**
 * Environment Variable Validation Module
 * 
 * Provides centralized validation for all required environment variables.
 * Throws descriptive errors for missing or invalid configuration.
 * 
 * @requirements 19.5
 */

// Define all required environment variables by category
export const REQUIRED_ENV_VARS = {
  database: ['DATABASE_URL', 'DIRECT_URL'],
  auth: ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'],
  cache: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  media: [
    'NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY',
    'IMAGEKIT_PRIVATE_KEY',
    'NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT',
  ],
} as const;

// Type for environment variable categories
export type EnvCategory = keyof typeof REQUIRED_ENV_VARS;

// Type for validation result
export interface ValidationResult {
  valid: boolean;
  missing: string[];
  category?: EnvCategory;
}

/**
 * Check if an environment variable is set and non-empty
 */
function isEnvVarSet(name: string): boolean {
  const value = process.env[name];
  return value !== undefined && value.trim() !== '';
}

/**
 * Get the value of an environment variable
 * Throws if the variable is not set
 */
export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Please set ${name} in your .env file or environment.`
    );
  }
  return value;
}

/**
 * Get the value of an environment variable or return a default
 */
export function getEnvVarOrDefault(name: string, defaultValue: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  return value;
}

/**
 * Get list of missing environment variables for a specific category
 */
export function getMissingVarsForCategory(category: EnvCategory): string[] {
  const requiredVars = REQUIRED_ENV_VARS[category];
  return requiredVars.filter((varName) => !isEnvVarSet(varName));
}

/**
 * Get list of all missing environment variables across all categories
 */
export function getMissingVars(): string[] {
  const allMissing: string[] = [];
  
  for (const category of Object.keys(REQUIRED_ENV_VARS) as EnvCategory[]) {
    const missing = getMissingVarsForCategory(category);
    allMissing.push(...missing);
  }
  
  return allMissing;
}

/**
 * Validate environment variables for a specific category
 */
export function validateCategory(category: EnvCategory): ValidationResult {
  const missing = getMissingVarsForCategory(category);
  return {
    valid: missing.length === 0,
    missing,
    category,
  };
}

/**
 * Validate all required environment variables
 * Throws a descriptive error if any are missing
 */
export function validateAll(): void {
  const missing = getMissingVars();
  
  if (missing.length > 0) {
    const errorMessage = [
      'Missing required environment variables:',
      '',
      ...missing.map((varName) => `  - ${varName}`),
      '',
      'Please ensure all required environment variables are set in your .env file.',
      'See .env.example for reference.',
    ].join('\n');
    
    throw new Error(errorMessage);
  }
}

/**
 * Validate environment variables and return detailed results
 * Does not throw - returns validation status for each category
 */
export function validateAllWithDetails(): Record<EnvCategory, ValidationResult> {
  const results: Record<EnvCategory, ValidationResult> = {} as Record<EnvCategory, ValidationResult>;
  
  for (const category of Object.keys(REQUIRED_ENV_VARS) as EnvCategory[]) {
    results[category] = validateCategory(category);
  }
  
  return results;
}

/**
 * Check if all environment variables are valid
 * Returns true if all required variables are set
 */
export function isConfigValid(): boolean {
  return getMissingVars().length === 0;
}

/**
 * Log validation status to console
 * Useful for debugging configuration issues
 */
export function logValidationStatus(): void {
  const results = validateAllWithDetails();
  
  console.log('Environment Configuration Status:');
  console.log('================================');
  
  for (const [category, result] of Object.entries(results)) {
    const status = result.valid ? '✓' : '✗';
    console.log(`${status} ${category}: ${result.valid ? 'OK' : 'MISSING'}`);
    
    if (!result.valid) {
      for (const varName of result.missing) {
        console.log(`    - ${varName}`);
      }
    }
  }
}
