import { WGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { WGPUContext, Utils } from "../../../lib/webgpu/webgpu.ts";

export const dev = async () => {

    const wgsl = await Utils.loadWGSL(`/assets/shaders/dev/dev.wgsl`);

    const tree = await Utils.loadTexture("/assets/img/treeoflife.webp");
    const webcam = await Utils.loadWebcam();

    const spec = ():WGPUSpec => {

        return {
            code: wgsl,
            geometry: {
                vertex: {
                    data: Utils.square(1.),
                    attributes: ["pos"],
                }
            },
            textures: [
                { name : "webcamTexture",  data: webcam.video }
            ]
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

    return context;

}