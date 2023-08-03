import { shader } from "../../../lib/components/shader.ts";
import { wgsl } from "../../../lib/webgpu/webgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    colorIfs()
});

async function colorIfs() {

    const code = await wgsl("/assets/shaders/color-ifs/color-ifs.wgsl");
    
    code && shader({ shader: code });
}