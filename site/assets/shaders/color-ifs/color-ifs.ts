import { WebGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { loadWGSL } from "../../../lib/webgpu/utils.ts";

export const colorIFS = async () => {
 
    const code = await loadWGSL(`/assets/shaders/color-ifs/color-ifs.wgsl`);
 
    return (): WebGPUSpec => ({ code: code });
}