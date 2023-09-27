import { PSpec } from "../../lib/poiesis/poiesis.interfaces.ts";
import { PContext } from "../../lib/poiesis/poiesis.ts";

export const player = async (spec: () => PSpec, unis?: any, delta?: number) => {

  const play = document.querySelector("#play") as HTMLButtonElement;
  const reset = document.querySelector("#reset") as HTMLButtonElement;
  const full = document.querySelector("#full") as HTMLButtonElement;
  const fpsSmall = document.querySelector("#fps") as HTMLDivElement;
  const fullscreen = document.querySelector("#fullscreen") as HTMLButtonElement;

  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
 
  const context = await PContext.init(canvas!);
  
  const controls = { play: true, reset: false, delta: delta || 0}

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

  context.build(spec).loop(unis, controls, { onFPS: (fps) => { fpsSmall.textContent = fps.fps + " fps" } })
  
}