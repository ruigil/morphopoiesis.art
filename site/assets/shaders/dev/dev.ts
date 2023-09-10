import { PoiesisSpec, BufferView } from "../../../lib/poiesis/poiesis.interfaces.ts";
import { PoiesisContext } from "../../../lib/poiesis/poiesis.ts";
import { loadWGSL, square} from "../../../lib/poiesis/utils.ts";

export const dev = async () => {

    const code = await loadWGSL(`/assets/shaders/dev/dev.wgsl`);

    const spec = ():PoiesisSpec => {
        const size = 32;
        
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
                sim: {
                    size: [size, size],
                    gravity: -9.81,
                    density: 1000.,
                    dt: 1. / 60.,
                    iterCount: 40,
                }
            },
            storages: [
                { name: "fluidA", size: size * size } ,
                { name: "fluidB", size: size * size } ,
                { name: "debug", size: 1, read: true } ,
            ],
            computes: [
                { name: "computeFD", workgroups: [size / 8, size / 8, 1] },
                { name: "computeFreeDivergence", workgroups: [size / 8, size / 8, 1], instances: 40}
            ],
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }


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
    return spec;

}

const devPage = async () => {
    const play = document.querySelector("#play") as HTMLButtonElement;
    const reset = document.querySelector("#reset") as HTMLButtonElement;
    const full = document.querySelector("#full") as HTMLButtonElement;
    const fpsSmall = document.querySelector("#fps") as HTMLDivElement;
    const fullscreen = document.querySelector("#fullscreen") as HTMLButtonElement;
    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  
    const value = document.querySelector("#value") as HTMLDivElement;
    const spec = await dev();

    const gpu = await PoiesisContext.init(canvas!);
    const context = gpu.build(spec)    
    .addBufferListener({ 
        onRead: (view:Array<BufferView>) => { 
            value.innerHTML = `<pre><code>${ JSON.stringify(view[0].get(),null,4) }</code></pre>`
        }
    });
  
    const controls = { play: true, reset: false, delta: 100 }
  
    play.addEventListener('click', event => {
      controls.play = !controls.play;
      play.name = controls.play ? "pause" : "play";
    });
  
    reset.addEventListener('click', event => {
      controls.reset = true;
    });
  
    full.addEventListener('click', event => {
      if (!document.fullscreenElement) {
        //document.documentElement.requestFullscreen();
        fullscreen.requestFullscreen().then(() => {
          //console.log("fullscreen")
          //console.log(window.innerHeight, window.innerWidth)
        }).catch(err => {});;
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    });

    context.loop({},controls, { onFPS: (fps:any) => { fpsSmall.textContent = fps.fps + " fps" } })
}

document.addEventListener('DOMContentLoaded', async (event)  => {
    devPage();
});
