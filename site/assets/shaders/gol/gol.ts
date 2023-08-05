import { shader } from "../../../lib/components/shader.ts";
import { wgsl, Utils } from "../../../lib/webgpu/webgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    gameOfLife()
});

async function gameOfLife() {

    const code = await wgsl(`/assets/shaders/gol/gol.wgsl`)
    
    const current = Array(64*64).fill(0).map(() => Math.random() > 0.5 ? 1 : 0);
    code && shader({
        shader: code,
        geometry: {
            vertices: Utils.square(1.),
            instances: 64 * 64
        },
        uniforms: {
            uni: {
                size: [64, 64],
                fcolor: [0,0,0],
                bcolor: [255,255,255]
            }
        },
        storage: [
            { name: "current", size: current.length, data: current } ,
            { name: "next", size: 64 * 64 } 
        ],
        workgroupCount: [8, 8, 1],
        bindings: {
            groups: [ [0,4,1,2], [0,4,2,1] ],
            currentGroup: (frame:number) => frame % 2,
        }      
    });
}