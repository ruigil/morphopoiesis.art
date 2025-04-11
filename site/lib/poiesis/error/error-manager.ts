import { ErrorCallback, ErrorManagerOptions, PoiesisError, PoiesisErrorOptions } from "./error.types.ts";

/**
 * Centralized error management system for the Poiesis framework.
 * Handles error reporting, formatting, and recovery strategies.
 */
export const PoiesisErrorManager = () => {

  const state = {
    errorCallbacks: [] as ErrorCallback[],
    options: {
      logToConsole: true,
      throwFatalErrors: true
    } as ErrorManagerOptions,
  }

  /**
   * Configure the error manager
   * @param options Configuration options
   */
  const configure = (configOptions: ErrorManagerOptions): void => {
    state.options = { ...state.options, ...configOptions };
  }


  /**
   * Register a callback to be called when an error occurs
   * @param callback The callback function
   */
  const addErrorCallback = (callback: ErrorCallback): void => {
    state.errorCallbacks.push(callback);
  }

  /**
   * Remove a previously registered error callback
   * @param callback The callback function to remove
   */
  const removeErrorCallback = (callback: ErrorCallback): void => {
    state.errorCallbacks = state.errorCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Handle an error by logging, displaying, and notifying callbacks
   * @param error The error to handle
   */
  const handleError = (error: PoiesisError): void => {
    // Log to console if enabled
    if (state.options.logToConsole) {
      logErrorToConsole(error);
    }

    // Notify all registered callbacks
    notifyCallbacks(error);

    // Throw if fatal and throwFatalErrors is enabled
    if (error.fatal && state.options.throwFatalErrors) {
      throw new Error(`[Poiesis] ${error.type}: ${error.message}`);
    }
  }

  /**
   * Create and handle an error in one step
   * @param type The type of error
   * @param message The error message
   * @param options Additional error options
   */
  const error = (type: PoiesisError['type'], message: string, options: PoiesisErrorOptions = {}): void => {
    const error: PoiesisError = {
      type,
      message,
      fatal: options.fatal ?? false,
      ...options
    };

    handleError(error);
  }

  /**
   * Log an error to the console with appropriate formatting
   * @param error The error to log
   */
  const logErrorToConsole = (error: PoiesisError): void => {
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
  const notifyCallbacks = (error: PoiesisError): void => {
    for (const callback of state.errorCallbacks) {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('[Poiesis] Error in error callback:', callbackError);
      }
    }
  }

  return {
    configure,
    addErrorCallback,
    removeErrorCallback,
    error
  }

}
