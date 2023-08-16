import { shader } from "../../../lib/components/shader.ts";
import { WGPU, wgsl, Utils } from "../../../lib/webgpu/webgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    rd()
});

async function rd() {

    const code = await wgsl(`/assets/shaders/reaction-diffusion/reaction-diffusion.wgsl`)

    const size = 512;
    const current = Array(size * size * 2).fill(0).map((v,i) => i % 2 == 0 ? 1 : (Math.random() > 0.01 ? 0 : 1) );
    
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
                size: [size, size]
            }
        },
        storage: [
            { name: "current", size: size * size, data: current } ,
            { name: "next", size: size * size}, 
        ],
        workgroupCount: [size / 8, size / 8, 1],
        computeCount: 32,
        bindings: {
            groups: [ [0,4,1,2,3], [0,4,2,1,3] ],
            currentGroup: (frame:number) => frame % 2,
        }      
    })

    code && shader(context);

}