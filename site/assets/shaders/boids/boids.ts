import { WGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { WGPUContext } from "../../../lib/webgpu/webgpu.ts";
import { loadWGSL, triangle } from "../../../lib/webgpu/utils.ts";

export const boids = async () => {

    const code = await loadWGSL(`/assets/shaders/boids/boids.wgsl`);

    const spec = ():WGPUSpec => {
        const size = 2000;
        const initialParticleData = new Array(size * 6);
        for (let i = 0; i < size; ++i) {
          initialParticleData[6 * i + 0] = 2 * (Math.random() - 0.5);
          initialParticleData[6 * i + 1] = 2 * (Math.random() - 0.5);
          initialParticleData[6 * i + 2] = 2 * (Math.random() - 0.5) * 0.01;
          initialParticleData[6 * i + 3] = 2 * (Math.random() - 0.5) * 0.01;
          initialParticleData[6 * i + 4] = 2 * Math.random() - 1.0;
          initialParticleData[6 * i + 5] = 0;
        }

        return {
            code: code,
            geometry: {
                vertex: {
                    data: triangle(1.),
                    attributes: ["apos"]    
                },
                instance: {
                    attributes: ["partPos","partVel","partPha"],
                    instances: size
                }
            },
            uniforms: {
                params: {
                    deltaT: .01,
                    scale: .015,
                    forces: [.04, .025, .025, .02], // last one is mouse force
                    // separation, cohesion, alignment
                    distances: [2., 4., 6., 1.] // boid size is 1.
                }
            },
            storage: [
                { name: "particlesA", size: size , data: initialParticleData, vertex: true} ,
                { name: "particlesB", size: size , vertex: true} 
            ],
            compute: [
                { name: "computeMain", workgroups:  [Math.ceil(size / 64), 1, 1] },
            ],
            bindings: {
                groups: [ [0,4,1,2,3], [0,4,2,1,3] ],
                currentGroup: (frame:number) => frame % 2,
            }      
        }
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
 
    const gpu = await WGPUContext.init(canvas!);

    return gpu.build(spec);

}