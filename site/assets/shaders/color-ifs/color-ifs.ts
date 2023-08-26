import { WGPUContext } from "../../../lib/webgpu/webgpu.ts";

export const colorIFS = async () => {

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
 
    const code = await (await fetch(`/assets/shaders/color-ifs/color-ifs.wgsl`)).text();

    const gpu = await WGPUContext.init(canvas!);
 
    return gpu.build(() => ({ shader: code })) ;
}