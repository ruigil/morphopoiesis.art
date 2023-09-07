import { WGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { WGPUContext } from "../../../lib/webgpu/webgpu.ts";
import { loadWGSL, square } from "../../../lib/webgpu/utils.ts";

export const gol = async () => {

    const code = await loadWGSL(`/assets/shaders/gol/gol.wgsl`);

    const spec = (): WGPUSpec => {
        const size = 128;
        const current = Array(size*size).fill(0).map(() => Math.random() > 0.5 ? 1 : 0);
        return {
            code: code,
            geometry: {
                vertex: {
                    data: square(1.),
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
            storages: [
                { name: "current", size: current.length, data: current } ,
                { name: "next", size: size * size } 
            ],
            compute: [
                { name: "computeMain", workgroups:  [size / 8, size / 8, 1] },
            ],
    
            bindings: [ [0,4,1,2], [0,4,2,1] ]
        }
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

    const gpu = await WGPUContext.init(canvas!); 

    return gpu.build(spec);

}