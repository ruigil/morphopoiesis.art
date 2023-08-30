import { WGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { WGPUContext } from "../../../lib/webgpu/webgpu.ts";
import { loadWGSL, square } from "../../../lib/webgpu/utils.ts";

export const dla = async () => {

    const code = await loadWGSL(`/assets/shaders/dla/dla.wgsl`);

    const spec = ():WGPUSpec => {
        const numParticles = 170000;
        const size = 1024;
        const initialParticleData = new Array(numParticles * 4);
        for (let i = 0; i < numParticles; ++i) {
          initialParticleData[4 * i + 0] = 2. * (Math.random() - 0.5);
          initialParticleData[4 * i + 1] = 2. * (Math.random() - 0.5);
          initialParticleData[4 * i + 2] =  Math.random();
          initialParticleData[4 * i + 3] =  Math.random();
        }
        const ice = new Array(size * size);
        // initialize the ice with a few nucleation points
        for (let i = 0; i < size * size; ++i) { ice[i ] =  Math.random() < 0.00001; }

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
            storage: [
                { name: "drops", size: numParticles , data: initialParticleData} ,
                { name: "iceA", size: size * size, data: ice} ,
                { name: "iceB", size: size * size, data: ice } ,
            ],
            compute: [
                { name: "computeDrops", workgroups: [Math.ceil(numParticles / 64), 1, 1] }
            ],
            computeGroupCount: 5,
            bindings: [ [0,1,2,3,4,5], [0,1,3,2,4,5] ]
        }
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
    const value = document.querySelector("#value") as HTMLCanvasElement;

    const gpu = await WGPUContext.init(canvas!);

    return gpu.build(spec);

}
