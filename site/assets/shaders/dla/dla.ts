import { WebGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { loadWGSL, square } from "../../../lib/webgpu/utils.ts";

export const dla = async () => {

    const code = await loadWGSL(`/assets/shaders/dla/dla.wgsl`);

    const spec = ():WebGPUSpec => {
        const numParticles = 170000;
        const size = 1024;

        const particles = Array(numParticles).fill({}).map(() => ({
            pos: [2 * Math.random() - 1, 2 * Math.random() - 1],
            vel: [2 * Math.random() - 1, 2 * Math.random() - 1],
        }))
        // initialize the ice with a few nucleation points
        const ice = Array(size * size).fill(0).map(() => Math.random() < 0.00001 ? 1 : 0);

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
                params: {
                    size: [size, size],
                    drops: numParticles,
                    fcolor: [0,255,255],
                    bcolor: [0,0,0]
                }
            },
            storages: [
                { name: "drops", size: numParticles , data: particles} ,
                { name: "iceA", size: size * size, data: ice} ,
                { name: "iceB", size: size * size, data: ice } ,
            ],
            computes: [
                { name: "computeIce", workgroups: [Math.ceil(size / 8), Math.ceil(size / 8), 1] },
                { name: "computeDrops", workgroups: [Math.ceil(numParticles / 64), 1, 1] }
            ],
            computeGroupCount: 5,
            bindings: [ [0,1,2,3,4,5], [0,1,3,2,4,5] ]
        }
    }

    return spec;
}
