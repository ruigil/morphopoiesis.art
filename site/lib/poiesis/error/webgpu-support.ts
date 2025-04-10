import { PoiesisError, WebGPUSupportResult } from "./error.interfaces.ts";
import { getErrorManager } from "./error-manager.ts";

/**
 * Check if WebGPU is supported in the current browser and environment
 * @returns A promise that resolves to a WebGPUSupportResult object
 */
export const checkWebGPUSupport = async (): Promise<WebGPUSupportResult> => {
  const result: WebGPUSupportResult = {
    supported: false,
    features: {},
    errors: []
  };
  
  // Check if the WebGPU API is available
  if (!navigator.gpu) {
    const error: PoiesisError = {
      type: 'compatibility',
      message: 'WebGPU is not supported in this browser',
      suggestion: 'Try using Chrome 113+, Edge 113+, or Firefox with WebGPU enabled',
      fatal: true
    };
    
    result.errors.push(error);
    return result;
  }
  
  // Try to get an adapter
  let adapter: GPUAdapter | null;
  try {
    adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      const error: PoiesisError = {
        type: 'compatibility',
        message: 'No appropriate GPUAdapter found',
        suggestion: 'Your device may not support WebGPU or may have outdated drivers',
        fatal: true
      };
      
      result.errors.push(error);
      return result;
    }
  } catch (e) {
    const error: PoiesisError = {
      type: 'compatibility',
      message: 'Error requesting GPUAdapter',
      details: e instanceof Error ? e.message : String(e),
      suggestion: 'Check if your browser has WebGPU enabled in the flags',
      fatal: true,
      originalError: e instanceof Error ? e : undefined
    };
    
    result.errors.push(error);
    return result;
  }
  
  // Get adapter info if available
  result.adapter = {
    // The name property might not be available in all implementations
    name: (adapter as any).name || undefined,
    description: undefined // Not available in the current WebGPU spec
  };
  
  // Check specific features
  result.features = {
    // Core WebGPU features
    computeShaders: true, // All WebGPU implementations must support compute shaders
    
    // Optional features
    textureCompressionBC: adapter.features.has('texture-compression-bc'),
    textureCompressionETC2: adapter.features.has('texture-compression-etc2'),
    textureCompressionASTC: adapter.features.has('texture-compression-astc'),
    indirectFirstInstance: adapter.features.has('indirect-first-instance'),
    shaderF16: adapter.features.has('shader-f16'),
    rg11b10ufloatRenderable: adapter.features.has('rg11b10ufloat-renderable'),
    bgra8unormStorage: adapter.features.has('bgra8unorm-storage'),
    float32Filterable: adapter.features.has('float32-filterable')
  };
  
  // Check limits
  result.limits = {
    maxTextureDimension1D: adapter.limits.maxTextureDimension1D,
    maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
    maxTextureDimension3D: adapter.limits.maxTextureDimension3D,
    maxTextureArrayLayers: adapter.limits.maxTextureArrayLayers,
    maxBindGroups: adapter.limits.maxBindGroups,
    maxBindingsPerBindGroup: adapter.limits.maxBindingsPerBindGroup,
    maxDynamicUniformBuffersPerPipelineLayout: adapter.limits.maxDynamicUniformBuffersPerPipelineLayout,
    maxDynamicStorageBuffersPerPipelineLayout: adapter.limits.maxDynamicStorageBuffersPerPipelineLayout,
    maxSampledTexturesPerShaderStage: adapter.limits.maxSampledTexturesPerShaderStage,
    maxSamplersPerShaderStage: adapter.limits.maxSamplersPerShaderStage,
    maxStorageBuffersPerShaderStage: adapter.limits.maxStorageBuffersPerShaderStage,
    maxStorageTexturesPerShaderStage: adapter.limits.maxStorageTexturesPerShaderStage,
    maxUniformBuffersPerShaderStage: adapter.limits.maxUniformBuffersPerShaderStage,
    maxUniformBufferBindingSize: adapter.limits.maxUniformBufferBindingSize,
    maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
    maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX,
    maxComputeWorkgroupSizeY: adapter.limits.maxComputeWorkgroupSizeY,
    maxComputeWorkgroupSizeZ: adapter.limits.maxComputeWorkgroupSizeZ,
    maxComputeWorkgroupsPerDimension: adapter.limits.maxComputeWorkgroupsPerDimension
  };
  
  // Check if the device can be created
  try {
    const device = await adapter.requestDevice();
    device.destroy();
  } catch (e) {
    const error: PoiesisError = {
      type: 'compatibility',
      message: 'Failed to create WebGPU device',
      details: e instanceof Error ? e.message : String(e),
      suggestion: 'Your device may not meet the minimum requirements for WebGPU',
      fatal: true,
      originalError: e instanceof Error ? e : undefined
    };
    
    result.errors.push(error);
    return result;
  }
  
  // If we got here, WebGPU is supported
  result.supported = true;
  return result;
};

/**
 * Initialize WebGPU with fallback options
 * @param canvas The canvas element to use
 * @param fallbackElement Optional element to display fallback content in
 * @returns A promise that resolves to a GPUDevice if successful
 */
export const initializeWebGPU = async ( canvas: HTMLCanvasElement ): Promise<{ device: GPUDevice; context: GPUCanvasContext } | null> => {
  const errorManager = getErrorManager();
  
  // Check if WebGPU is supported
  const support = await checkWebGPUSupport();
  if (!support.supported) {
    // Handle the first error
    if (support.errors.length > 0) {
      errorManager.handleError(support.errors[0]);
    }
        
    return null;
  }
  
  // Get the WebGPU context
  const context = canvas.getContext('webgpu');
  if (!context) {
    errorManager.error(
      'initialization',
      'Failed to get WebGPU context from canvas',
      {
        fatal: true,
        suggestion: 'Make sure the canvas element is properly initialized'
      }
    );
    return null;
  }
  
  // Request adapter
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    errorManager.error(
      'initialization',
      'Failed to get GPU adapter',
      {
        fatal: true,
        suggestion: 'Your device may not support WebGPU or may have outdated drivers'
      }
    );
    return null;
  }
  
  // Request device
  let device: GPUDevice;
  try {
    device = await adapter.requestDevice();
    
    // Add device lost handler
    device.lost.then((info) => {
      errorManager.error(
        'runtime',
        `WebGPU device was lost: ${info.message}`,
        {
          fatal: true,
          suggestion: 'Try refreshing the page or updating your graphics drivers',
          details: `Reason: ${info.reason}`
        }
      );
    });
    
    // Configure the context
    const preferredFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: preferredFormat,
      alphaMode: 'premultiplied'
    });
    
    return { device, context };
  } catch (e) {
    errorManager.wrapError(
      e instanceof Error ? e : new Error(String(e)),
      'initialization',
      'Failed to initialize WebGPU device',
      {
        fatal: true,
        suggestion: 'Check browser console for more details'
      }
    );
    return null;
  }
};

/**
 * Check if the device supports specific features required by a shader
 * @param device The WebGPU device
 * @param requiredFeatures Array of feature names required by the shader
 * @returns An object with the check result and any missing features
 */
export const checkRequiredFeatures = (
  device: GPUDevice,
  requiredFeatures: string[]
): { supported: boolean; missingFeatures: string[] } => {
  const missingFeatures: string[] = [];
  
  for (const feature of requiredFeatures) {
    if (!device.features.has(feature as GPUFeatureName)) {
      missingFeatures.push(feature);
    }
  }
  
  return {
    supported: missingFeatures.length === 0,
    missingFeatures
  };
};

/**
 * Check if the device meets the minimum limits required by a shader
 * @param device The WebGPU device
 * @param requiredLimits Record of limit names and their minimum values
 * @returns An object with the check result and any insufficient limits
 */
export const checkRequiredLimits = (
  device: GPUDevice,
  requiredLimits: Record<string, number>
): { supported: boolean; insufficientLimits: Record<string, { required: number; actual: number }> } => {
  const insufficientLimits: Record<string, { required: number; actual: number }> = {};
  
  for (const [limitName, requiredValue] of Object.entries(requiredLimits)) {
    // Cast to any to access limits by string key
    const actualValue = (device.limits as any)[limitName];
    if (typeof actualValue === 'number' && actualValue < requiredValue) {
      insufficientLimits[limitName] = {
        required: requiredValue,
        actual: actualValue
      };
    }
  }
  
  return {
    supported: Object.keys(insufficientLimits).length === 0,
    insufficientLimits
  };
};
