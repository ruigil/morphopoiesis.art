import { Shader } from "../lib/generators.ts";

const script = (shader:Shader) => {
    
    return /*ts*/ `
        import { Poiesis, drawLoop, ErrorManager } from '../lib/poiesis/index.ts';
        import { ${shader.id} } from '../shaders/${shader.path}/${shader.id}.ts';
        const displayError = (error) => {
          const escapeHtml = (text) => {
            return text.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('\\n', "<br/>");
          }
  
          const errorElement = document.getElementById('poiesis-error')!
          errorElement.className = 'poiesis-error ' + error.type + (error.fatal ? ' fatal' : '')
          errorElement.style.display = 'block';
          errorElement.innerHTML = '<h3 class="poiesis-error-title">' + error.type + ' Error</h3>' +
            '<p class="poiesis-error-message">' + escapeHtml(error.message) + '</p>' +
            (error.suggestion ? '<p class="poiesis-error-suggestion">Suggestion: ' + error.suggestion + '</p>' : '') +
            (error.details ? '<pre class="poiesis-error-details">' + escapeHtml(error.message) + '</p>' : '')
        }
  
        document.addEventListener('DOMContentLoaded', async (event)  => {
            const canvas = document.querySelector("#canvas");
            const play = document.querySelector("#play") as HTMLButtonElement;
            const reset = document.querySelector("#reset") as HTMLButtonElement;
            const camera = document.querySelector("#cam") as HTMLButtonElement;
            const full = document.querySelector("#full") as HTMLButtonElement;
            const fpsSmall = document.querySelector("#fps") as HTMLDivElement;
          
            play.addEventListener('click', event => {
              loop.togglePlayPause();
              play.name = play.name === "play" ? "pause" : "play";
            });
          
            reset.addEventListener('click', event => {
              loop.reset();
            });

            cam.addEventListener('click', event => {
                screenshot();
            });
            
            full.addEventListener('click', event => {
              if (!document.fullscreenElement) {
                canvas.requestFullscreen().catch(console.log);
              } else if (document.exitFullscreen) {
                document.exitFullscreen();
              }
            });

            const screenshot = () => {
                let dataUrl = canvas.toDataURL('image/png');
                let link = document.createElement('a');
                link.href = dataUrl;
                link.download = '${shader.id}.png';
                link.click();
            }
                      
            // Add keypress event listener
            document.addEventListener('keypress', (event) => {
                if (event.key === 's') {
                    screenshot(); 
                }
            });
  
            const code = await (await fetch('../../shaders/${shader.path}/${shader.id}.wgsl')).text();
            const defs = await (await fetch('../../shaders/${shader.path}/${shader.id}.json')).json();

            const fpsListener = {
              onFPS: (fps) => { fpsSmall.textContent = fps.fps.toFixed(2) + " fps"}
            }
            
            ErrorManager.addErrorCallback((error) => displayError(error));

            const gpu = await Poiesis();
            const spec = await ${shader.id}(code,defs);
            const loop = drawLoop(gpu, spec, canvas, {}, fpsListener);
            loop.start();
            
            document.addEventListener('keypress', function(event) {
              if (event.key === 'r') { 
                loop.reset()
              }
            });

        });
    `
}
  

export default function* (data: Lume.Data) {

    for (const s of data.shaders) {
      if (s.sketch) yield {
        url: `./${s.id}/index.ts`,
        title: s.title,
        description: s.description,
        content: `${script(s)}`,
      };
    }
}