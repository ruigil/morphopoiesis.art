import { WGPUSpec, BufferView } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { WGPUContext } from "../../../lib/webgpu/webgpu.ts";
import { loadWGSL, square} from "../../../lib/webgpu/utils.ts";
import { player } from "../../js/player.ts";

export const dev = async () => {

    const code = await loadWGSL(`/assets/shaders/dev/dev.wgsl`);

    const spec = ():WGPUSpec => {
        const numAgents = 20000;
        const size = 1024;
        const agents = new Array(numAgents).fill({}).map( (e,i) => ({
            pos: [ Math.random()- .5, Math.random() - .5],
            vel: [Math.random() - .5, Math.random() - .5]
        }));
        
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
                    agents: numAgents,
                    sa: 22.5 * (Math.PI / 180),
                    sd: 20.,
                    evaporation: .99,
                }
            },
            storages: [
                { name: "agents", size: numAgents , data: agents },
                { name: "trailMapA", size: size * size } ,
                { name: "trailMapB", size: size * size } ,
                { name: "debug", size: 1, read: true } ,
            ],
            compute: [
                { name: "computeTrailmap", workgroups: [size / 8, size / 8, 1] },
                { name: "computeAgents", workgroups: [Math.ceil(numAgents / 64), 1, 1] }
            ],
            computeGroupCount: 3,
            bindings: [ [0,1,2,3,4,5], [0,1,3,2,4,5] ]
        }
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  
    const value = document.querySelector("#value") as HTMLDivElement;

    const gpu = await WGPUContext.init(canvas!);
    const context = gpu.build(spec)
    .addBufferListener({ 
        onRead: (view:Array<BufferView>) => { 
            value.innerHTML = `<pre><code>${ JSON.stringify(view[0].get(),null,4) }</code></pre>`
        }
    });

/*
            //[ ${ Array(8).fill(0).map( (e:any,i:number):number => v[i].toFixed(4) ).join(",") }];
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

    player(context, {}, 0);

});
