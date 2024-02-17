import { PSpec } from "../../works/libs/poiesis/poiesis.interfaces.ts";
import { PContext } from "../../works/libs/poiesis/poiesis.ts";

export const player = async (spec: (w:number,h:number) => PSpec, unis?: any, delta?: number) => {

  const play = document.querySelector("#play") as HTMLButtonElement;
  const reset = document.querySelector("#reset") as HTMLButtonElement;
  const full = document.querySelector("#full") as HTMLButtonElement;
  const fpsSmall = document.querySelector("#fps") as HTMLDivElement;

  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  const controls = { play: true, reset: false, delta: delta || 0}
  const context = await PContext.init(canvas!);
 
  const observer = new ResizeObserver(async (entries) => {
    canvas.width = entries[0].target.clientWidth * devicePixelRatio;
    canvas.height = entries[0].target.clientHeight * devicePixelRatio;
    try {
      context.build(spec).animate(unis, controls, { onFPS: (fps) => { fpsSmall.textContent = fps.fps + " fps" } })
    } catch (err) {
      const error = document.querySelector("#error") as HTMLDivElement;
      error.innerHTML = "<span>Sorry, but there was an error with your WebGPU context. <br/> " + 
      "WebGPU is a new standard for graphics on the web.<br/>" +
      "The standard is currently implemented only <a href='https://caniuse.com/webgpu'>on certain browsers</a>.<br/>" +
      "For the full experience please use a supported browser. <br/>" +
      "<span style='color:red;'>" + err + "</span><span/>";
    }
  });

  observer.observe(canvas)

  play.addEventListener('click', event => {
    controls.play = !controls.play;
    play.name = controls.play ? "pause" : "play";
  });

  reset.addEventListener('click', event => {
    controls.reset = true;
  });

  full.addEventListener('click', event => {
    if (!document.fullscreenElement) {
      canvas.requestFullscreen().catch(console.log);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

}