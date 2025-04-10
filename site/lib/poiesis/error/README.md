# Poiesis Error Handling System

This directory contains the error handling system for the Poiesis framework. It provides a centralized way to handle errors, display them to users, and provide helpful suggestions for resolving issues.

## Overview

The error handling system consists of several components:

- **ErrorManager**: A singleton class that centralizes error handling
- **WebGPU Support**: Enhanced WebGPU feature detection and fallbacks
- **Shader Error Handling**: Structured shader compilation error handling with line numbers and suggestions
- **Error Interfaces**: Type definitions for the error system

## Using the Error System in Your Application

### Basic Setup

```typescript
import { getErrorManager, initializeWebGPU } from '../lib/poiesis/error/index.ts';
import { Poiesis } from '../lib/poiesis/poiesis.ts';

// Get the canvas element
const canvas = document.getElementById('canvas');

// Get the error container element
const errorContainer = document.getElementById('error-container');

// Get the error manager instance
const errorManager = getErrorManager();

// Configure the error manager
errorManager.configure({
    logToConsole: true,        // Log errors to the console
    displayInDOM: true,        // Display errors in the DOM
    throwFatalErrors: false    // Don't throw fatal errors (handle them gracefully)
});

// Set the error element for displaying errors
errorManager.setErrorElement(errorContainer);

// Initialize WebGPU with error handling
const webgpuInit = await initializeWebGPU(canvas, errorContainer);
if (webgpuInit) {
    // WebGPU initialized successfully, proceed with your application
    const { device, context } = webgpuInit;
    
    // Initialize Poiesis
    const poiesis = await Poiesis(canvas, errorContainer);
    
    // Continue with your application...
}
```

### Adding Custom Error Callbacks

You can add custom callbacks to handle errors in your own way:

```typescript
// Add a custom error callback
errorManager.addErrorCallback((error) => {
    // Log the error to your analytics service
    analytics.logError(error.type, error.message);
    
    // Show a notification to the user
    showNotification(`Error: ${error.message}`);
    
    // Take different actions based on error type
    if (error.type === 'compatibility') {
        showBrowserUpgradePrompt();
    }
});
```

### Handling Errors in Your Code

You can use the error manager to handle errors in your own code:

```typescript
try {
    // Some code that might throw an error
    const result = await riskyOperation();
    
    // Process the result...
} catch (e) {
    // Handle the error using the error manager
    errorManager.wrapError(
        e,
        'runtime',
        'Failed to perform operation',
        {
            fatal: false,
            suggestion: 'Try again with different parameters',
            details: 'The operation failed because...'
        }
    );
}
```

### Creating Custom Errors

You can also create custom errors directly:

```typescript
// Create a non-fatal warning
errorManager.error(
    'validation',
    'Invalid parameter: size must be a power of 2',
    {
        fatal: false,
        suggestion: 'Use a size that is a power of 2, e.g., 256, 512, 1024',
        details: 'The provided size was 300, which is not a power of 2'
    }
);

// Create a fatal error
errorManager.error(
    'resource',
    'Failed to create texture: Out of memory',
    {
        fatal: true,
        suggestion: 'Try reducing the texture size or closing other applications',
        details: 'Attempted to create a 4K texture but ran out of GPU memory'
    }
);
```

## Styling Error Messages

The error manager adds basic styles to error messages displayed in the DOM, but you can customize them by adding your own CSS:

```css
/* Style the error container */
.poiesis-error {
    background-color: rgba(30, 30, 30, 0.9);
    color: white;
    border-radius: 8px;
    padding: 16px;
    margin: 10px 0;
    font-family: sans-serif;
    max-width: 100%;
    overflow-x: auto;
}

/* Style fatal errors differently */
.poiesis-error.fatal {
    border-left: 4px solid #ff5555;
}

/* Style the error title */
.poiesis-error-title {
    margin: 0 0 8px 0;
    color: #ff5555;
    font-size: 16px;
}

/* Style the error message */
.poiesis-error-message {
    margin: 0 0 8px 0;
}

/* Style the error suggestion */
.poiesis-error-suggestion {
    margin: 8px 0;
    font-style: italic;
    color: #aaa;
}

/* Style the error details */
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
```

## Complete Example

See the `site/examples/error-handling-demo.html` file for a complete example of how to use the error handling system in a real application.

## Error Types

The error system supports the following error types:

- `initialization`: Errors during framework initialization
- `compatibility`: Browser/device compatibility issues
- `compilation`: Shader compilation errors
- `resource`: Resource creation/management errors
- `runtime`: Errors during execution
- `validation`: Input validation errors
- `unknown`: Unclassified errors

Each error type has specific handling and suggestions tailored to the type of error.
