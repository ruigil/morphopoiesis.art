import { shader } from "../../../lib/components/shader.ts";
import { WGPU, wgsl, Utils } from "../../../lib/webgpu/webgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    gameOfLife()
});

async function gameOfLife() {

    const code = await wgsl(`/assets/shaders/gol/gol.wgsl`)
    
    const size = 128;
    const current = Array(size*size).fill(0).map(() => Math.random() > 0.5 ? 1 : 0);

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

    const gpu = await new WGPU(canvas!).init();

    const context = gpu.build({
        shader: code,
        geometry: {
            vertex: {
                data: Utils.square(1.),
                attributes: ["pos"],
                instances: size * size    
            }
        },
        uniforms: {
            uni: {
                size: [size, size],
                fcolor: [0,0,0],
                bcolor: [255,255,255]
            }
        },
        storage: [
            { name: "current", size: current.length, data: current } ,
            { name: "next", size: size * size } 
        ],
        workgroupCount: [size / 8, size / 8, 1],
        bindings: {
            groups: [ [0,4,1,2], [0,4,2,1] ],
            currentGroup: (frame:number) => frame % 2,
        }      
    });

    code && shader(context);
}