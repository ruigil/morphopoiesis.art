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
    const value = document.querySelector("#value") as HTMLCanvasElement;

    const gpu = await new WGPU(canvas!).init();

    const context = gpu.build({
        shader: code,
        geometry: {
            vertices: Utils.square(1.),
            instances: size * size
        },
        uniforms: {
            uni: {
                size: [size, size],
                fcolor: [0,0,0],
                bcolor: [255,255,255]
            }
        },
        storage: [
            { name: "current", size: current.length, data: current } ,
            { name: "next", size: size * size }, 
            { name: "debug", size: 1, read: true } // vec4 = 4 floats 
        ],
        workgroupCount: [size / 8, size / 8, 1],
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

    code && await shader(context);

}