import type { PageData } from "lume/core.ts";

export const title = "Home";
export const motto = "studies on the synthesis of form";
export const layout = "base.layout.ts";
export const scripts = ["/assets/js/index.js"];
export const url = "/";


export default ({ comp, featured, metas }: PageData): string => {

  return `
  <div class="p-7 rounded-lg text-2xl mt-20 mx-auto desc opacity-90">studies on the synthesis of form</div>
  <canvas class="full-window" id="canvas"></canvas>  
  <style>
    .desc {
      z-index: 100;
      background: var(--sl-color-neutral-0);
    }
    .full-window {
      position: fixed;
      top: 0;
      left: 0;

      width: 100vw;
      height: 100vh;
    }
  <style>
  `
};