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
export type PoiesisError = {
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
export type ErrorManagerOptions = {
  /** Whether to log errors to the console */
  logToConsole?: boolean;
  /** Whether to throw fatal errors */
  throwFatalErrors?: boolean;
}

/**
 * Initialize WebGPU with fallback options
 * @param canvas The canvas element to use
 * @returns A promise that resolves to a GPUDevice if successful
 */
export type WebGPUInitializationResult = {
  device: GPUDevice;
  features?: Record<string, boolean>;
  /** Device limits if available */
  limits?: Record<string, number>;
};

/**
 * Callback function for error handling
 */
export type ErrorCallback = (error: PoiesisError) => void;


/**
 * Information about a shader error
 */
export type ShaderErrorInfo = {
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

export type RequiredLimits = {
  supported: boolean;
  insufficientLimits: Record<string, { required: number; actual: number }>;
}

export type PoiesisErrorOptions = Partial<Omit<PoiesisError, 'type' | 'message' | 'originalError'>>;

export type RequiredFeatures = {
  supported: boolean;
  missingFeatures: string[];
}
