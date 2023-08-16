import { shader } from "../../../lib/components/shader.ts";
import { WGPU, wgsl, Utils } from "../../../lib/webgpu/webgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    boids()
});

async function boids() {

    const code = await wgsl(`/assets/shaders/boids/boids.wgsl`)

    const size = 1000;
    const initialParticleData = new Array(size * 4);
    for (let i = 0; i < size; ++i) {
      initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
      initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
      initialParticleData[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.01;
      initialParticleData[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.01;
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
 
    const gpu = await new WGPU(canvas!).init();

    const context = gpu.build({
        shader: code,
        geometry: {
            vertex: {
                data: Utils.triangle(1.),
                attributes: ["apos"]    
            },
            instance: {
                attributes: ["particlePos","particleVel"],
                instances: size     
            }
        },
        uniforms: {
            params: {
                deltaT: .0004,
                scale: .02,
                forces: [.004, .002, .002], // max velocity is 1.
                // separation, cohesion, alignment
                distances: [2., 4., 6.] // boid size is 1.
            }
        },
        storage: [
            { name: "particlesA", size: size , data: initialParticleData, vertex: true} ,
            { name: "particlesB", size: size , vertex: true}, 
            { name: "debug", size: 1, read: true}, 
        ],
        workgroupCount: [Math.ceil(size / 64), 1, 1],
        computeCount: 32,
        bindings: {
            groups: [ [0,4,1,2,3], [0,4,2,1,3] ],
            currentGroup: (frame:number) => frame % 2,
        }      
    })
 
    code && shader(context);

}