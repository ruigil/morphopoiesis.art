import { shader } from "../../../lib/components/shader.ts";
import { WGPU, wgsl } from "../../../lib/webgpu/webgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    colorIfs()
});

async function colorIfs() {

    const code = await wgsl("/assets/shaders/color-ifs/color-ifs.wgsl");
    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

    const gpu = await new WGPU(canvas!).init();
 
    code && shader( gpu.build({ shader: code }) );
}