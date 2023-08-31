import { WGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { WGPUContext } from "../../../lib/webgpu/webgpu.ts";
import { loadWGSL, loadTexture, loadWebcam, square } from "../../../lib/webgpu/utils.ts";
import { player } from "../../js/player.ts";
import { CHAR_0 } from "https://deno.land/std@0.195.0/path/_constants.ts";

export const dev = async () => {

    const code = await loadWGSL(`/assets/shaders/dev/dev.wgsl`);

    //const tree = await loadTexture("/assets/img/treeoflife.webp");
    //const webcam = await loadWebcam();
    const spec = ():WGPUSpec => {
        const numParticles = 40000;
        const size = 512;
        const initialParticleData = new Array(numParticles * 4);
        for (let i = 0; i < numParticles; ++i) {
          initialParticleData[4 * i + 0] = 2. * (Math.random() - 0.5);
          initialParticleData[4 * i + 1] = 2. * (Math.random() - 0.5);
          initialParticleData[4 * i + 2] =  0;// Math.random();
          initialParticleData[4 * i + 3] =  1;//Math.random();
        }
        const initialTrailMap = new Array(size * size);
        const line = (i:number, y:number) => { return Math.floor(i / size) == y ? 1 : 0 }
        for (let i = 0; i < size * size; ++i) {
            initialTrailMap[i ] =  Math.random() < 0.001;
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
                    drops: numParticles,
                    fcolor: [0,255,255],
                    bcolor: [0,0,0]
                }
            },
            storage: [
                { name: "drops", size: numParticles , data: initialParticleData} ,
                { name: "iceA", size: size * size, data: initialTrailMap} ,
                { name: "iceB", size: size * size, data: initialTrailMap } ,
                { name: "debug", size: 1, read:true } ,
            ],
            compute: [
                { name: "computeIce", workgroups: [Math.ceil(size / 8), Math.ceil(size / 8), 1] },
                { name: "computeDrops", workgroups: [Math.ceil(numParticles / 64), 1, 1] }
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


    player(await dev(), {}, 0);

});
