import { WGPU, WGPUContext } from "../webgpu/webgpu.ts";

export async function shader(gpu: WGPUContext, unis?: any) {

  const play = document.querySelector("#play") as HTMLButtonElement;
  const reset = document.querySelector("#reset") as HTMLButtonElement;
  const full = document.querySelector("#full") as HTMLButtonElement;
  const fpsSmall = document.querySelector("#fps") as HTMLDivElement;
  const fullscreen = document.querySelector("#fullscreen") as HTMLButtonElement;

  const controls = { play: true, reset: false, frames: 0 }

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

  gpu
  .addFPSListener({ onFPS: (fps) => { fpsSmall.textContent = fps.fps + " fps" } })
  .draw(unis,controls)
  
}