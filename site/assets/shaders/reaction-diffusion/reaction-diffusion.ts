import { WebGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { loadWGSL, square } from "../../../lib/webgpu/utils.ts";

export const rd = async () => {

    const code = await loadWGSL(`/assets/shaders/reaction-diffusion/reaction-diffusion.wgsl`);

    const spec =  () : WebGPUSpec => {
        const size = 512;
        const current = Array(size * size).fill([0,0]).map((v,i) => [ 1 , (Math.random() > 0.01 ? 0 : 1) ] );

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
                    size: [size, size]
                }
            },
            storages: [
                { name: "current", size: size * size, data: current } ,
                { name: "next", size: size * size}, 
            ],
            computes: [
                { name: "computeMain", workgroups:  [size / 8, size / 8, 1] },
            ],
            computeGroupCount: 32,
            bindings: [ [0,4,1,2,3], [0,4,2,1,3] ]
        }
    }

    return spec
}