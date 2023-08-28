import { WGPUContext } from "../../../lib/webgpu/webgpu.ts";
import { loadWGSL } from "../../../lib/webgpu/utils.ts";

export const colorIFS = async () => {

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
 
    const code = await loadWGSL(`/assets/shaders/color-ifs/color-ifs.wgsl`);

    const gpu = await WGPUContext.init(canvas!);
 
    return gpu.build(() => ({ code: code })) ;
}