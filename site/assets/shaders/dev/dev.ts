import { shader } from "../../../lib/components/shader.ts";
import { WGPU, wgsl, Utils } from "../../../lib/webgpu/webgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    boids()
});

async function boids() {

    const code = await wgsl(`/assets/shaders/dev/dev.wgsl`)

    const numParticles = 1000;
    const size = 32;
    const initialParticleData = new Array(numParticles * 4);
    for (let i = 0; i < numParticles; ++i) {
      initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
      initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
      initialParticleData[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.01;
      initialParticleData[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.01;
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
    const value = document.querySelector("#value") as HTMLCanvasElement;

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
            params: {
                size: [size, size],
                deltaT: .01,
                scale: .015,
                forces: [.04, .025, .025, .02], // last one is mouse force
                // separation, cohesion, alignment
                distances: [2., 4., 6.] // boid size is 1.
            }
        },
        storage: [
            { name: "agents", size: numParticles , data: initialParticleData} ,
            { name: "trailMapA", size: size * size } ,
            { name: "trailMapB", size: size * size } ,
            { name: "debug", size: 1, read: true}, 
        ],
        workgroupCount: [size / 8, size / 8, 1],
        bindings: {
            groups: [ [0,1,2,3,4,5], [0,1,2,4,3,5] ],
            currentGroup: (frame:number) => frame % 2,
        }      
    })
    .addBufferListener({ 
        onRead: (buffer:Array<any>) => { 
            const v = buffer[0].buffer
            value.textContent = `
            [ ${ Array(4).fill(0).map( (e:any,i:number):number => v[i].toFixed(4) ).join(",") }];
            `
        }
    });

    code && shader(context);

}