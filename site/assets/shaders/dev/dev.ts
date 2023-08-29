import { WGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { WGPUContext } from "../../../lib/webgpu/webgpu.ts";
import { loadWGSL, loadTexture, loadWebcam, square } from "../../../lib/webgpu/utils.ts";
import { player } from "../../js/player.ts";

export const dev = async () => {

    const code = await loadWGSL(`/assets/shaders/dev/dev.wgsl`);

    //const tree = await loadTexture("/assets/img/treeoflife.webp");
    //const webcam = await loadWebcam();
    const spec = ():WGPUSpec => {
        const numParticles = 1;
        const size = 32;
        const initialParticleData = new Array(numParticles * 4);
        for (let i = 0; i < numParticles; ++i) {
          initialParticleData[4 * i + 0] = .5 * (Math.random() - 0.5);
          initialParticleData[4 * i + 1] = .5 * (Math.random() - 0.5);
          initialParticleData[4 * i + 2] =  0;
          initialParticleData[4 * i + 3] =  1.;
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
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4,5], [0,1,3,2,4,5] ]
        }
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
    const value = document.querySelector("#value") as HTMLCanvasElement;

    const gpu = await WGPUContext.init(canvas!);
    const context = gpu.build(spec)
    .addBufferListener({ 
        onRead: (buffer:Array<any>) => { 
            const v = buffer[0].buffer
            value.textContent = `
            [ ${ Array(4).fill(0).map( (e:any,i:number):number => v[i].toFixed(4) ).join(",") }];
            `
        }
    });

/*
    // Get a reference to the canvas element
    const camvas = document.getElementById('webcam') as HTMLCanvasElement;
    // Get a reference to the canvas context
    const ctx = camvas.getContext('2d');
    camvas.width = webcam?.settings.width! ;
    camvas.height = webcam?.settings.height!;
    // Draw the video frames onto the canvas
    setInterval(() => {
        //ctx?.save();
        //ctx?.scale(-1, 1);
        //ctx?.translate(-canvas.width, 0);
        ctx?.drawImage(webcam.video, 0, 0);
        // Restore the canvas state
        //ctx?.restore();
    }, 16);
*/
    return context;

}

document.addEventListener('DOMContentLoaded', async (event)  => {
    const context = await dev();

    const canvas = context.getCanvas();

    canvas.width = 512;
    canvas.height = 512;

    let frame = 0;
    setInterval(async () => {
        console.log("frame",frame)
        await context.frame(frame++,{});
    }, 1600);


});
