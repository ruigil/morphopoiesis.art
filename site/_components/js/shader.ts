import { WGPU } from "../../assets/js/lib/wgpu.ts";


export async function shader(spec: any, unis?: any) {
    
    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  
    const play = document.querySelector("#play") as HTMLButtonElement;
    const fpsSmall = document.querySelector("#fps") as HTMLDivElement;
    const reset = document.querySelector("#reset") as HTMLButtonElement;
    //const c2 = document.querySelector("#c2") as HTMLCanvasElement;
    
    const controls = { play: true, reset: false, frames: 0 }
    
    play.addEventListener('click', event => {
      controls.play = !controls.play;
      play.name = controls.play ? "pause" : "play";
    });
    reset.addEventListener('click', event => {
      controls.reset = true;
    });
    
    const gpu = await new WGPU(canvas!).init();
            
    gpu.build(spec)
    .addFPSListener( { onFPS: (fps) => { fpsSmall.textContent = fps.fps + " fps" } })
    .draw( unis, controls);
}