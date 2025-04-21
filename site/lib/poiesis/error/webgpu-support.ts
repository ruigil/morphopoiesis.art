import { PoiesisError, RequiredFeatures, RequiredLimits, WebGPUInitializationResult } from "./error.types.ts";
import { ErrorManager } from "./index.ts";

export const initializeWebGPU = async (): Promise<WebGPUInitializationResult> => {
  
  // Check if the WebGPU API is available
  if (!navigator.gpu) {
    const error: PoiesisError = {
      type: 'compatibility',
      message: 'WebGPU is not supported in this browser',
      suggestion: 'Try using Chrome 113+, Edge 113+, or Firefox with WebGPU enabled',
      fatal: true
    };

    ErrorManager.error(error);
    throw new Error('WebGPU is not supported in this browser');
  }
      
  // Request adapter
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    const error: PoiesisError = {
      type: 'initialization',
      message: 'Failed to get GPU adapter',
      suggestion: 'Your device may not support WebGPU or may have outdated drivers',
      fatal: true
    };
    ErrorManager.error(error);
    throw new Error('Failed to get GPU adapter');
  }
  // Check specific features
  const features = {
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
  const limits = {
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


  // Request device
  const device = await adapter.requestDevice();
  if (!device) {
    const error: PoiesisError = {
      type: 'compatibility',
      message: 'Failed to create WebGPU device',
      suggestion: 'Your device may not meet the minimum requirements for WebGPU',
      fatal: true,
    };
    ErrorManager.error(error);
    throw new Error('Failed to create WebGPU device');
  }
  
  // Add device lost handler
  device.lost.then((info) => {
    if (info.reason === 'destroyed') {
      return;
    }
    const error: PoiesisError = {
      type: 'runtime',
      message: `WebGPU device was lost: ${info.message}`,
      suggestion: 'Try refreshing the page or updating your graphics drivers',
      details: `Reason: ${info.reason}`,
      fatal: true
    };
    ErrorManager.error(error);
    throw new Error(`WebGPU device was lost: ${info.message}`);
  });
  
  // we can have several contextes with the same device...
  return { device, features, limits };
};

/**
 * Check if the device supports specific features required by a shader
 * @param device The WebGPU device
 * @param requiredFeatures Array of feature names required by the shader
 * @returns An object with the check result and any missing features
 */

export const checkRequiredFeatures = (device: GPUDevice, requiredFeatures: string[]): RequiredFeatures => {
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
export const checkRequiredLimits = (device: GPUDevice, requiredLimits: Record<string, number>) : RequiredLimits => {
  
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
