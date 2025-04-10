/**
 * Defines the types of errors that can occur in the Poiesis framework
 */
export type PoiesisErrorType = 
  | 'initialization'  // Errors during framework initialization
  | 'compatibility'   // Browser/device compatibility issues
  | 'compilation'     // Shader compilation errors
  | 'resource'        // Resource creation/management errors
  | 'runtime'         // Errors during execution
  | 'validation'      // Input validation errors
  | 'unknown';        // Unclassified errors

/**
 * Structured error object for Poiesis framework
 */
export interface PoiesisError {
  /** The type of error that occurred */
  type: PoiesisErrorType;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional technical details (stack trace, error context, etc.) */
  details?: string;
  
  /** Suggested action to resolve the error */
  suggestion?: string;
  
  /** Whether this error is fatal and should stop execution */
  fatal: boolean;
  
  /** The original error object if this wraps another error */
  originalError?: Error;
  
  /** Error code for programmatic handling */
  code?: string;
  
  /** Additional context-specific data */
  context?: Record<string, unknown>;
}

/**
 * Configuration options for the error manager
 */
export interface ErrorManagerOptions {
  /** Whether to log errors to the console */
  logToConsole?: boolean;
  
  /** Whether to display errors in the DOM */
  displayInDOM?: boolean;
  
  /** CSS selector for the error container element */
  errorElementSelector?: string;
  
  /** Whether to throw fatal errors */
  throwFatalErrors?: boolean;
}

/**
 * Callback function for error handling
 */
export type ErrorCallback = (error: PoiesisError) => void;

/**
 * Result of WebGPU support check
 */
export interface WebGPUSupportResult {
  /** Whether WebGPU is supported at all */
  supported: boolean;
  
  /** Specific features and their support status */
  features: Record<string, boolean>;
  
  /** Any errors encountered during the check */
  errors: PoiesisError[];
  
  /** Device limits if available */
  limits?: Record<string, number>;
  
  /** Adapter info if available */
  adapter?: {
    name?: string;
    description?: string;
  };
}

/**
 * Information about a shader error
 */
export interface ShaderErrorInfo {
  /** The error message */
  message: string;
  
  /** The line number where the error occurred, if available */
  lineNumber?: number;
  
  /** The column number where the error occurred, if available */
  columnNumber?: number;
  
  /** Suggested fix for the error */
  suggestion?: string;
  
  /** The error code if available */
  code?: string;
}
