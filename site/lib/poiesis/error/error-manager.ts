import { ErrorCallback, ErrorManagerOptions, PoiesisError } from "./error.interfaces.ts";

/**
 * Centralized error management system for the Poiesis framework.
 * Handles error reporting, formatting, and recovery strategies.
 */
export class PoiesisErrorManager {
  private static instance: PoiesisErrorManager;
  private errorElement: HTMLElement | null = null;
  private errorCallbacks: ErrorCallback[] = [];
  private options: ErrorManagerOptions = {
    logToConsole: true,
    displayInDOM: true,
    throwFatalErrors: true
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize error container if needed
    if (this.options.displayInDOM && this.options.errorElementSelector) {
      this.setErrorElementBySelector(this.options.errorElementSelector);
    }
  }

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
    
    if (this.options.displayInDOM && this.options.errorElementSelector) {
      this.setErrorElementBySelector(this.options.errorElementSelector);
    }
  }

  /**
   * Set the DOM element to display errors in
   * @param element The HTML element to display errors in
   */
  public setErrorElement(element: HTMLElement): void {
    this.errorElement = element;
  }

  /**
   * Set the DOM element to display errors in by CSS selector
   * @param selector CSS selector for the error element
   */
  public setErrorElementBySelector(selector: string): void {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) {
      this.errorElement = element;
    } else {
      console.warn(`[Poiesis] Error element with selector "${selector}" not found`);
    }
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
    
    // Display in DOM if enabled and element is available
    if (this.options.displayInDOM && this.errorElement) {
      this.displayErrorInDOM(error);
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
   * Display an error in the DOM
   * @param error The error to display
   */
  private displayErrorInDOM(error: PoiesisError): void {
    if (!this.errorElement) return;
    
    // Create error container
    const errorContainer = document.createElement('div');
    errorContainer.className = `poiesis-error ${error.type}${error.fatal ? ' fatal' : ''}`;
    
    // Create error content
    errorContainer.innerHTML = `
      <h3 class="poiesis-error-title">${this.capitalizeFirstLetter(error.type)} Error</h3>
      <p class="poiesis-error-message">${this.escapeHTML(error.message)}</p>
      ${error.suggestion ? `<p class="poiesis-error-suggestion">Suggestion: ${this.escapeHTML(error.suggestion)}</p>` : ''}
      ${error.details ? `<pre class="poiesis-error-details">${this.escapeHTML(error.details)}</pre>` : ''}
    `;
    
    // Add basic styling if not already present
    this.ensureErrorStyles();
    
    // Clear previous errors and add the new one
    this.errorElement.innerHTML = '';
    this.errorElement.appendChild(errorContainer);
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

  /**
   * Ensure that error styles are added to the document
   */
  private ensureErrorStyles(): void {
    const styleId = 'poiesis-error-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .poiesis-error {
        background-color: rgba(30, 30, 30, 0.9);
        color: #fff;
        border-radius: 4px;
        padding: 12px;
        margin: 10px 0;
        font-family: sans-serif;
        max-width: 100%;
        overflow-x: auto;
      }
      .poiesis-error.fatal {
        border-left: 4px solid #ff5555;
      }
      .poiesis-error-title {
        margin: 0 0 8px 0;
        color: #ff5555;
        font-size: 16px;
      }
      .poiesis-error-message {
        margin: 0 0 8px 0;
      }
      .poiesis-error-suggestion {
        margin: 8px 0;
        font-style: italic;
        color: #aaa;
      }
      .poiesis-error-details {
        background-color: rgba(0, 0, 0, 0.3);
        padding: 8px;
        margin: 8px 0 0 0;
        border-radius: 2px;
        font-family: monospace;
        font-size: 12px;
        white-space: pre-wrap;
        overflow-x: auto;
        max-height: 200px;
        overflow-y: auto;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Capitalize the first letter of a string
   * @param str The string to capitalize
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param str The string to escape
   */
  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Export a convenience function to get the error manager instance
export const getErrorManager = (): PoiesisErrorManager => PoiesisErrorManager.getInstance();
