import { WGPUContext, Utils } from "../../../lib/webgpu/webgpu.ts";

export const colorIFS = async () => {

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
 
    const code = await Utils.loadWGSL(`/assets/shaders/color-ifs/color-ifs.wgsl`);

    const gpu = await WGPUContext.init(canvas!);
 
    return gpu.build(() => ({ code: code })) ;
}