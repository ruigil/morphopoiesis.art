
import { loadJSON, loadWGSL, drawLoop, Poiesis, ErrorManager, PoiesisError } from "./lib/poiesis/index.ts";
import { boids } from "./shaders/boids/boids.ts";

// maybe a webcomponent ?
const displayError = (error: PoiesisError) => {
    const escapeHtml = (text: string): string => {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\n/g, "<br/>");
    }
    const errorElement = document.getElementById('poiesis-error')!
    console.log(errorElement)
    errorElement.className = `poiesis-error ${error.type}${error.fatal ? ' fatal' : ''}`;
    errorElement.style.display = 'block';
    errorElement.innerHTML = `
      <h3 class="poiesis-error-title">${error.type} Error</h3>
      <p class="poiesis-error-message">${escapeHtml(error.message)}</p>
      ${error.suggestion ? `<p class="poiesis-error-suggestion">Suggestion: ${error.suggestion}</p>` : ''}
      ${error.details ? `<pre class="poiesis-error-details">${error.details}</pre>` : ''}`
}

const featureShader = async () => {

/*
  // useful to configure uniform values based on the theme
  const body = document.querySelector('body')!;
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

  observer.observe(body, { attributes: true });
*/

  const code = await loadWGSL(`./shaders/boids/boids.wgsl`);
  const defs = await loadJSON(`./shaders/boids/boids.json`);
  const spec = await boids(code,defs);
  ErrorManager.addErrorCallback((error) => displayError(error));

  const gpu = await Poiesis();
  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  const anim = drawLoop(gpu, spec, canvas);
  anim.start();
}

document.addEventListener('DOMContentLoaded', () => {
  featureShader();
});


