import { PSpec, animate } from "../../works/libs/poiesis/index.ts";

export const player = async (spec: (w:number,h:number) => PSpec, unis?: any) => {

  const play = document.querySelector("#play") as HTMLButtonElement;
  const reset = document.querySelector("#reset") as HTMLButtonElement;
  const full = document.querySelector("#full") as HTMLButtonElement;
  const fpsSmall = document.querySelector("#fps") as HTMLDivElement;

  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

  const anim = await animate(spec, canvas, unis, { onFPS: (fps) => { fpsSmall.textContent = fps.fps + " fps" } });

  anim.start();

  play.addEventListener('click', event => {
    anim.togglePlayPause();
    play.name = play.name === "play" ? "pause" : "play";
  });

  reset.addEventListener('click', event => {
    anim.reset();
  });

  full.addEventListener('click', event => {
    if (!document.fullscreenElement) {
      canvas.requestFullscreen().catch(console.log);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

}