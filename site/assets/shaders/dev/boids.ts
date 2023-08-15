import { shader } from "../../../lib/components/shader.ts";
import { WGPU, wgsl, Utils } from "../../../lib/webgpu/webgpu.ts";

document.addEventListener('DOMContentLoaded', event => {
    rd()
});

async function rd() {

    const code = await wgsl(`/assets/shaders/dev/boids.wgsl`)

    const size = 20;
    const initialParticleData = new Array(size * 4);
    for (let i = 0; i < size; ++i) {
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
                data: Utils.square(.05),
                attributes: ["apos"]    
            },
            instance: {
                attributes: ["particlePos","particleVel"],
                instances: size     
            }
        },
        uniforms: {
            params: {
                deltaT: 0.04,
                rule1Distance: 0.025, // separation
                rule2Distance: 0.2, // alignment
                rule3Distance: 0.03, // cohesion
                rule1Scale: 0.2,
                rule2Scale: 0.5,
                rule3Scale: 0.05
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
    .addBufferListener({ 
        onRead: (buffer:Array<any>) => { 
            const v = buffer[0].buffer
           
            value.textContent = `
            [ ${ Array(4).fill(0).map( (e:any,i:number):number => v[i].toFixed(2) ).join(",") }];
            `
            
        //console.log(buffer[0].buffer[0],buffer[0].buffer[1])
        }
    });

    code && shader(context);

}