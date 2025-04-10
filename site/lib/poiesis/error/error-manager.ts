import { ErrorCallback, ErrorManagerOptions, PoiesisError } from "./error.interfaces.ts";

/**
 * Centralized error management system for the Poiesis framework.
 * Handles error reporting, formatting, and recovery strategies.
 */
export class PoiesisErrorManager {
  private static instance: PoiesisErrorManager;
  private errorCallbacks: ErrorCallback[] = [];
  private options: ErrorManagerOptions = {
    logToConsole: true,
    throwFatalErrors: true
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of the error manager
   */
  public static getInstance(): PoiesisErrorManager {
    if (!PoiesisErrorManager.instance) {
      PoiesisErrorManager.instance = new PoiesisErrorManager();
    }
    return PoiesisErrorManager.instance;
  }

  /**
   * Configure the error manager
   * @param options Configuration options
   */
  public configure(options: ErrorManagerOptions): void {
    this.options = { ...this.options, ...options };    
  }


  /**
   * Register a callback to be called when an error occurs
   * @param callback The callback function
   */
  public addErrorCallback(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Remove a previously registered error callback
   * @param callback The callback function to remove
   */
  public removeErrorCallback(callback: ErrorCallback): void {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Handle an error by logging, displaying, and notifying callbacks
   * @param error The error to handle
   */
  public handleError(error: PoiesisError): void {
    // Log to console if enabled
    if (this.options.logToConsole) {
      this.logErrorToConsole(error);
    }
        
    // Notify all registered callbacks
    this.notifyCallbacks(error);
    
    // Throw if fatal and throwFatalErrors is enabled
    if (error.fatal && this.options.throwFatalErrors) {
      throw new Error(`[Poiesis] ${error.type}: ${error.message}`);
    }
  }

  /**
   * Create and handle an error in one step
   * @param type The type of error
   * @param message The error message
   * @param options Additional error options
   */
  public error(
    type: PoiesisError['type'],
    message: string,
    options: Partial<Omit<PoiesisError, 'type' | 'message'>> = {}
  ): void {
    const error: PoiesisError = {
      type,
      message,
      fatal: options.fatal ?? false,
      ...options
    };
    
    this.handleError(error);
  }

  /**
   * Create a wrapped error from an existing Error object
   * @param originalError The original error
   * @param type The type of error
   * @param message Optional custom message (defaults to original error message)
   * @param options Additional error options
   */
  public wrapError(
    originalError: Error,
    type: PoiesisError['type'],
    message?: string,
    options: Partial<Omit<PoiesisError, 'type' | 'message' | 'originalError'>> = {}
  ): void {
    const error: PoiesisError = {
      type,
      message: message ?? originalError.message,
      originalError,
      details: originalError.stack,
      fatal: options.fatal ?? false,
      ...options
    };
    
    this.handleError(error);
  }

  /**
   * Log an error to the console with appropriate formatting
   * @param error The error to log
   */
  private logErrorToConsole(error: PoiesisError): void {
    const errorPrefix = `[Poiesis Error] [${error.type}]`;
    
    if (error.fatal) {
      console.error(`${errorPrefix} FATAL: ${error.message}`);
    } else {
      console.warn(`${errorPrefix}: ${error.message}`);
    }
    
    if (error.details) {
      console.info(`${errorPrefix} Details:`, error.details);
    }
    
    if (error.suggestion) {
      console.info(`${errorPrefix} Suggestion: ${error.suggestion}`);
    }
    
    if (error.originalError) {
      console.debug(`${errorPrefix} Original error:`, error.originalError);
    }
  }


  /**
   * Notify all registered callbacks about an error
   * @param error The error to notify about
   */
  private notifyCallbacks(error: PoiesisError): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('[Poiesis] Error in error callback:', callbackError);
      }
    }
  }

}

export const getErrorManager = (): PoiesisErrorManager => PoiesisErrorManager.getInstance();
