import { shader } from "../../../_components/js/shader.ts";
import { wgsl } from "../../js/lib/wgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    colorIfs()
});

async function colorIfs() {

    const code = await wgsl("/assets/shaders/color-ifs/color-ifs.wgsl");
    
    code && shader({ shader: code });
}