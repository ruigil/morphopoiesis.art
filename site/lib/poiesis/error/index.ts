// Export all error handling utilities
export * from "./error.types.ts";
export * from "./error-manager.ts";
export * from "./webgpu-support.ts";
export * from "./shader-error.ts";

import { PoiesisErrorManager } from "./error-manager.ts";
export const ErrorManager = PoiesisErrorManager();