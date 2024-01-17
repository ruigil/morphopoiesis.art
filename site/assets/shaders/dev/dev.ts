import { PContext, PSpec, BufferView, loadWGSL, square } from "../../../lib/poiesis/index.ts";

export const dev = async () => {

    const code = await loadWGSL(`/assets/shaders/dev/dev.wgsl`);
    const size = 256; 
    const empty = new ImageData(size, size);
    const emptyBitmap = await createImageBitmap(empty);

    const spec = ():PSpec => {
        return {
            code: code,
            storages: [
                { name: "debug", size: 1, read: true }
            ],
            textures: [
                { name: "tex", data: emptyBitmap },
                { name: "buffer", data: emptyBitmap, storage: true }
            ],
            computes: [
                { name: "pathTracer", workgroups: [size / 8, size / 8, 1] }
            ],
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }


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

    const gpu = await PContext.init(canvas!);
    const context = gpu.build(spec)    
    .addBufferListener({ 
        onRead: (view:Array<BufferView>) => { 
            value.innerHTML = `<pre><code>${ JSON.stringify(view[0].get(),null,4) }</code></pre>`
        }
    });
  
    const controls = { play: true, reset: false, delta: 0 }
  
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

    context.animate({},controls, { onFPS: (fps:any) => { fpsSmall.textContent = fps.fps + " fps" } })
}


document.addEventListener('DOMContentLoaded', async (event)  => {
    devPage();
});


