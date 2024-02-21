
import { loadJSON, loadWGSL, animate } from "./lib/poiesis/index.ts";
import { ligrowth } from "./works/ligrowth/ligrowth.ts";


const featureShader = async () => {

  const body = document.querySelector('body');

  const isDark = (): boolean => {
    const currentMode = window.matchMedia("(prefers-color-scheme: dark)").matches.toString();
    return (localStorage.getItem("dark-theme") || currentMode) === "true"; // true = "dark", false = "light"
  }

  const color = isDark() ? {
    params: {
      mode: [1,.1,0]
    }
  } : {
    params: {
      mode: [0,1,0]
    }
  };

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        let dark = (mutation.target as HTMLBodyElement).classList.contains('sl-theme-dark');
        if (dark) {
          color.params.mode = [1,.1,0];
        } else {
          color.params.mode = [0,1,0];
        }
      }
    });
  });

  observer.observe(body!, { attributes: true });

  const code = await loadWGSL(`./works/ligrowth/ligrowth.wgsl`);
  const defs = await loadJSON(`./works/ligrowth/ligrowth.json`);
  const spec = await ligrowth(code,defs, undefined);

  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  const anim = await animate(spec, canvas, color);
  anim.start();

}

document.addEventListener('DOMContentLoaded', async (event) => {
  featureShader();
});


