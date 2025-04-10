
import { loadJSON, loadWGSL, animate } from "./lib/poiesis/index.ts";
import { ligrowth } from "./shaders/ligrowth/ligrowth.ts";


const featureShader = async () => {

  const body = document.querySelector('body');

  const isDark = (): boolean => {
    const currentMode = globalThis.matchMedia("(prefers-color-scheme: dark)").matches.toString();
    return (localStorage.getItem("dark-theme") || currentMode) === "true"; // true = "dark", false = "light"
  }

  const color = isDark() ? {
    params: {
      mode: [.4,.2,.1,3]
    }
  } : {
    params: {
      mode: [.0,.0,.9,3]
    }
  };

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const dark = (mutation.target as HTMLBodyElement).classList.contains('sl-theme-dark');
        if (dark) {
          color.params.mode = [.4,.2,.1,3];
        } else {
          color.params.mode = [.0,.0,.9,3];
        }
      }
    });
  });

  observer.observe(body!, { attributes: true });

  const code = await loadWGSL(`./shaders/ligrowth/ligrowth.wgsl`);
  const defs = await loadJSON(`./shaders/ligrowth/ligrowth.json`);
  const spec = await ligrowth(code,defs, undefined);

  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  const anim = animate(spec, canvas, color);
  anim.start();

}

document.addEventListener('DOMContentLoaded', () => {
  featureShader();
});


