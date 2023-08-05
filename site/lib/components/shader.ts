import { WGPU } from "../webgpu/webgpu.ts";

export async function shader(spec: any, unis?: any) {

  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

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
        console.log("fullscreen")
        console.log(window.innerHeight, window.innerWidth)
      }).catch(err => {});;
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });
  
  const gpu = await new WGPU(canvas!).init();

  gpu.build(spec)
    .addFPSListener({ onFPS: (fps) => { fpsSmall.textContent = fps.fps + " fps" } })
    .draw(unis, controls);
}