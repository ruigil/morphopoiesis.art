// Export all error handling utilities
export * from "./error.interfaces.ts";
export * from "./error-manager.ts";
export * from "./webgpu-support.ts";
export * from "./shader-error.ts";

// Re-export the error manager instance getter for convenience
import { getErrorManager } from "./error-manager.ts";
export { getErrorManager };
