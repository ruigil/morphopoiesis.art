import { WGPU, wgsl } from "../../../lib/webgpu/webgpu.ts";

export const colorIfs = async () => {

    const code = await wgsl("/assets/shaders/color-ifs/color-ifs.wgsl");
    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

    const gpu = await new WGPU(canvas!).init();
 
    return gpu.build({ shader: code }) ;
}