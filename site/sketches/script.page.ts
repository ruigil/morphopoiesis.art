const script = (shader: any, data: Lume.Data) => {
    
    return /*ts*/ `
        import { animate } from '../lib/poiesis/index.ts';
        import { ${shader.id} } from '../works/${shader.id}/${shader.id}.ts';

        document.addEventListener('DOMContentLoaded', async (event)  => {
            const canvas = document.querySelector("#canvas");
            const play = document.querySelector("#play") as HTMLButtonElement;
            const reset = document.querySelector("#reset") as HTMLButtonElement;
            const camera = document.querySelector("#cam") as HTMLButtonElement;
            const full = document.querySelector("#full") as HTMLButtonElement;
            const fpsSmall = document.querySelector("#fps") as HTMLDivElement;
          
            play.addEventListener('click', event => {
              anim.togglePlayPause();
              play.name = play.name === "play" ? "pause" : "play";
            });
          
            reset.addEventListener('click', event => {
              anim.reset();
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
  
            const code = await (await fetch('../../works/${shader.id}/${shader.id}.wgsl')).text();
            const defs = await (await fetch('../../works/${shader.id}/${shader.id}.json')).json();

            const fpsListener = (fps) => { fpsSmall.textContent = fps.fps + " fps"};

            const spec = await ${shader.id}(code,defs);

            const anim = await animate(spec, canvas, {} , { onFPS: fpsListener } );
            anim.start();

        });
    `
}
  

export default function* (data: Lume.Data) {

    for (const s of data.shaders) {
      yield {
        url: `./${s.id}/index.ts`,
        title: s.title,
        description: s.description,
        content: `${script(s, data)}`,
      };
    }
}