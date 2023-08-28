import { WGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { WGPUContext } from "../../../lib/webgpu/webgpu.ts";
import { loadWGSL, square } from "../../../lib/webgpu/utils.ts";

export const physarum = async () => {

    const code = await loadWGSL(`/assets/shaders/physarum/physarum.wgsl`);

    const spec = ():WGPUSpec => {
        const numParticles = 140000;
        const size = 1024;
        const initialParticleData = new Array(numParticles * 4);
        for (let i = 0; i < numParticles; ++i) {
          initialParticleData[4 * i + 0] = .5 * (Math.random() - 0.5);
          initialParticleData[4 * i + 1] = .5 * (Math.random() - 0.5);
          initialParticleData[4 * i + 2] =  Math.random() - 0.5;
          initialParticleData[4 * i + 3] = Math.random() - 0.5;
        }

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
                    agents: numParticles,
                    sa: 22.5 * Math.PI / 180,
                    sd: 12.,
                    evaporation: .995,
                }
            },
            storage: [
                { name: "agents", size: numParticles , data: initialParticleData} ,
                { name: "trailMapA", size: size * size } ,
                { name: "trailMapB", size: size * size } ,
            ],
            compute: [
                { name: "computeTrailmap", workgroups: [size / 8, size / 8, 1] },
                { name: "computeAgents", workgroups: [Math.ceil(numParticles / 64), 1, 1] }
            ],
            computeGroupCount: 10,
            bindings: {
                groups: [ [0,1,2,3,4,5], [0,1,3,2,4,5] ],
                currentGroup: (frame:number) => frame % 2,
            }      
        }
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  
    const gpu = await WGPUContext.init(canvas!);
  
    return gpu.build(spec)
}