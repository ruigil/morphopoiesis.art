import { PContext, PSpec, BufferView, loadWGSL, square } from "../../../lib/poiesis/index.ts";

export const dev = async () => {

    const code = await loadWGSL(`/assets/shaders/dev/dev.wgsl`);

    const spec = ():PSpec => {
        const size = 512;

        const cell = (vel:[number,number], pressure:number, dye: [number,number,number], solid: number) => (
            { velocity: vel, pressure: pressure, dye: dye, solid: solid }
        )
        const circle = (x:number, y:number, r:number): boolean => Math.hypot(x,y) < r;
        const solid = (x:number, y:number): number =>  ( x == 0 || y == size-1 ||  circle(size/2-x,(size/3)-y,40)) ? 1 : 0;
    
        const fluid =  Array.from( { length: size * size }, (_,i) => 
            cell( [0,0], 0, [0,0,0], solid(i % size, Math.floor(i / size) )) );
            
        return {
            code: code,
            geometry: {
                vertex: {
                    data: square(1.),
                    attributes: ["pos"],
                    instances: size * size    
                }
            },
            uniforms: {
                sim: {
                    size: [size, size],
                    dt: 1. / 60.
                }
            },
            storages: [
                { name: "fluidA", size: size * size, data: fluid },
                { name: "fluidB", size: size * size, data: fluid },
                { name: "divergence", size: size * size }
            ],
            computes: [
                { name: "advect", workgroups: [size / 8, size / 8, 1] },
                { name: "addForces", workgroups: [size / 8, size / 8, 1] },
                { name: "computeDivergence", workgroups: [size / 8, size / 8, 1]},
                { name: "pressureSolver", workgroups: [size / 8, size / 8, 1], instances: 40},
                { name: "subtractPressureGradient", workgroups: [size / 8, size / 8, 1]}
            ],
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }


    return spec;

}

const devPage = async () => {
    const play = document.querySelector("#play") as HTMLButtonElement;
    const reset = document.querySelector("#reset") as HTMLButtonElement;
    const full = document.querySelector("#full") as HTMLButtonElement;
    const fpsSmall = document.querySelector("#fps") as HTMLDivElement;
    const fullscreen = document.querySelector("#fullscreen") as HTMLButtonElement;
    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  
    const value = document.querySelector("#value") as HTMLDivElement;
    const spec = await dev();

    const gpu = await PContext.init(canvas!);
    const context = gpu.build(spec)    
    .addBufferListener({ 
        onRead: (view:Array<BufferView>) => { 
            value.innerHTML = `<pre><code>${ JSON.stringify(view[0].get(),null,4) }</code></pre>`
        }
    });
  
    const controls = { play: true, reset: false, delta: 0 }
  
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

    context.animate({},controls, { onFPS: (fps:any) => { fpsSmall.textContent = fps.fps + " fps" } })
}


document.addEventListener('DOMContentLoaded', async (event)  => {
    devPage();
});


