import { ShaderErrorInfo } from "./error.interfaces.ts";
import { getErrorManager } from "./error-manager.ts";

/**
 * Common shader error patterns and their suggestions
 */
const COMMON_SHADER_ERRORS = [
  {
    pattern: /undeclared identifier/i,
    suggestion: "Check for typos in variable names or missing variable declarations"
  },
  {
    pattern: /type mismatch/i,
    suggestion: "Ensure variable types match in assignments and function calls"
  },
  {
    pattern: /entry point .* not found/i,
    suggestion: "Verify that the entry point function exists and is spelled correctly"
  },
  {
    pattern: /binding .* not found/i,
    suggestion: "Check that all bindings referenced in the shader are properly defined in the binding layout"
  },
  {
    pattern: /missing .* attribute/i,
    suggestion: "Ensure all required vertex attributes are provided"
  },
  {
    pattern: /storage class .* is not valid/i,
    suggestion: "Check that variables have the correct storage class (e.g., uniform, storage, private)"
  },
  {
    pattern: /cannot assign to .* variable/i,
    suggestion: "Verify that you're not trying to modify read-only variables"
  },
  {
    pattern: /workgroup size exceeds limit/i,
    suggestion: "Reduce the workgroup size to be within device limits"
  },
  {
    pattern: /recursion is not allowed/i,
    suggestion: "WGSL doesn't support recursive function calls. Rewrite using iteration"
  },
  {
    pattern: /array stride must be a multiple of/i,
    suggestion: "Ensure array elements are properly aligned according to WGSL requirements"
  }
];

/**
 * Parse a shader error message to extract structured information
 * @param errorMessage The error message from the shader compilation
 * @returns Structured error information
 */
export const parseShaderError = (errorMessage: string): ShaderErrorInfo => {
  // Extract line number using regex
  const lineMatch = errorMessage.match(/line (\d+)/i) || errorMessage.match(/line:(\d+)/i);
  const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
  
  // Extract column number if available
  const colMatch = errorMessage.match(/column (\d+)/i) || errorMessage.match(/col:(\d+)/i);
  const columnNumber = colMatch ? parseInt(colMatch[1], 10) : undefined;
  
  // Extract error code if available
  const codeMatch = errorMessage.match(/error:([A-Z0-9]+)/i);
  const code = codeMatch ? codeMatch[1] : undefined;
  
  // Generate suggestion based on common errors
  let suggestion: string | undefined;
  for (const errorPattern of COMMON_SHADER_ERRORS) {
    if (errorPattern.pattern.test(errorMessage)) {
      suggestion = errorPattern.suggestion;
      break;
    }
  }
  
  return {
    message: errorMessage,
    lineNumber,
    columnNumber,
    suggestion,
    code
  };
};

/**
 * Format shader code to highlight the error location
 * @param code The shader code
 * @param lineNumber The line number where the error occurred
 * @param columnNumber The column number where the error occurred
 * @returns Formatted code with error context
 */
export const formatShaderErrorContext = (
  code: string,
  lineNumber?: number,
  columnNumber?: number
): string => {
  if (!lineNumber) return code;
  
  const lines = code.split('\n');
  const start = Math.max(0, lineNumber - 3);
  const end = Math.min(lines.length, lineNumber + 2);
  
  return lines.slice(start, end).map((line, i) => {
    const currentLineNumber = start + i + 1;
    const isErrorLine = currentLineNumber === lineNumber;
    
    let result = `${currentLineNumber.toString().padStart(4, ' ')}${isErrorLine ? ' > ' : '   '}${line}`;
    
    if (isErrorLine) {
      // Add caret pointing to the column if available
      if (columnNumber !== undefined) {
        const caretPosition = Math.max(0, columnNumber - 1);
        result += `\n    ${' '.repeat(caretPosition)}^`;
      } else {
        // Otherwise, just highlight the line
        result += '\n    ' + '~'.repeat(line.length);
      }
    }
    
    return result;
  }).join('\n');
};

/**
 * Create a shader module with enhanced error handling
 * @param device The WebGPU device
 * @param code The WGSL shader code
 * @param label Optional label for the shader module
 * @returns The created shader module
 */
export const createShaderModuleWithErrorHandling = (
  device: GPUDevice,
  code: string,
  label: string = "Custom shader"
): GPUShaderModule => {
  const errorManager = getErrorManager();
  
  if (!code || code.trim() === '') {
    errorManager.error(
      'compilation',
      'Shader code is empty or undefined',
      {
        fatal: true,
        suggestion: 'Ensure the shader code is properly loaded before compilation'
      }
    );
    throw new Error('Shader code is empty or undefined');
  }
  
  try {
    // Create the shader module
    const shaderModule = device.createShaderModule({
      label,
      code
    });
    
    // Compile the shader asynchronously to check for errors
    // This is optional but helps catch errors earlier
    shaderModule.getCompilationInfo().then(info => {
      if (info.messages.length > 0) {
        // Process compilation messages
        for (const message of info.messages) {
          if (message.type === 'error') {
            const errorInfo = parseShaderError(message.message);
            
            errorManager.error(
              'compilation',
              `Shader compilation error: ${message.message}`,
              {
                fatal: true,
                details: formatShaderErrorContext(code, message.lineNum, message.linePos),
                suggestion: errorInfo.suggestion,
                code: errorInfo.code
              }
            );
          } else if (message.type === 'warning') {
            // Log warnings but don't treat them as fatal
            errorManager.error(
              'compilation',
              `Shader compilation warning: ${message.message}`,
              {
                fatal: false,
                details: formatShaderErrorContext(code, message.lineNum, message.linePos)
              }
            );
          }
        }
      }
    }).catch(e => {
      // Handle errors in getCompilationInfo itself
      errorManager.wrapError(
        e instanceof Error ? e : new Error(String(e)),
        'compilation',
        'Error checking shader compilation status',
        { fatal: false }
      );
    });
    
    return shaderModule;
  } catch (e) {
    // Handle immediate errors during shader module creation
    const errorInfo = parseShaderError(e instanceof Error ? e.message : String(e));
    
    errorManager.wrapError(
      e instanceof Error ? e : new Error(String(e)),
      'compilation',
      'Shader compilation failed',
      {
        fatal: true,
        details: formatShaderErrorContext(code, errorInfo.lineNumber, errorInfo.columnNumber),
        suggestion: errorInfo.suggestion,
        code: errorInfo.code
      }
    );
    
    throw e;
  }
};

/**
 * Validate a shader's requirements against device capabilities
 * @param device The WebGPU device
 * @param requiredFeatures Array of feature names required by the shader
 * @param requiredLimits Record of limit names and their minimum values
 * @returns True if the device meets all requirements
 */
export const validateShaderRequirements = (
  device: GPUDevice,
  requiredFeatures: string[] = [],
  requiredLimits: Record<string, number> = {}
): boolean => {
  const errorManager = getErrorManager();
  
  // Check features
  const missingFeatures: string[] = [];
  for (const feature of requiredFeatures) {
    if (!device.features.has(feature as GPUFeatureName)) {
      missingFeatures.push(feature);
    }
  }
  
  if (missingFeatures.length > 0) {
    errorManager.error(
      'compatibility',
      `Shader requires features not supported by this device: ${missingFeatures.join(', ')}`,
      {
        fatal: true,
        suggestion: 'Try using a device with more advanced WebGPU capabilities'
      }
    );
    return false;
  }
  
  // Check limits
  const insufficientLimits: Record<string, { required: number; actual: number }> = {};
  for (const [limitName, requiredValue] of Object.entries(requiredLimits)) {
    const actualValue = (device.limits as any)[limitName];
    if (typeof actualValue === 'number' && actualValue < requiredValue) {
      insufficientLimits[limitName] = {
        required: requiredValue,
        actual: actualValue
      };
    }
  }
  
  if (Object.keys(insufficientLimits).length > 0) {
    const limitDetails = Object.entries(insufficientLimits)
      .map(([name, { required, actual }]) => `${name}: required ${required}, actual ${actual}`)
      .join('\n');
    
    errorManager.error(
      'compatibility',
      'Shader requires device limits that exceed the capabilities of this device',
      {
        fatal: true,
        details: limitDetails,
        suggestion: 'Try reducing workgroup sizes or simplifying the shader'
      }
    );
    return false;
  }
  
  return true;
};
