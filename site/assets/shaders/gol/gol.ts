import { shader } from "../../../lib/components/shader.ts";
import { wgsl, Utils } from "../../../lib/webgpu/webgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    gameOfLife()
});

async function gameOfLife() {

    const code = await wgsl(`/assets/shaders/gol/gol.wgsl`)
    
    const current = Array(256 * 256).fill(0).map(() => Math.random() > 0.5 ? 1 : 0);
    code && shader({
        shader: code,
        geometry: {
            vertices: Utils.square(1.),
            instances: 256 * 256
        },
        uniforms: {
            uni: {
                size: [256, 256],
                fcolor: [0,0,0],
                bcolor: [255,255,255]
            }
        },
        storage: [
            { name: "current", size: current.length, data: current } ,
            { name: "next", size: 256 * 256 } 
        ],
        workgroupCount: [32, 32, 1],
        bindings: {
            groups: [ [0,4,1,2], [0,4,2,1] ],
            currentGroup: (frame:number) => frame % 2,
        }      
    });
}