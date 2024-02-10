
import { PSpec, PContext, loadJSON, loadWGSL, square, scaleAspect } from "../../lib/poiesis/index.ts";

document.addEventListener('DOMContentLoaded', async (event) => {

  const landing = async () => {

    const getRGBValues = (rgbString: string): number[]  => {
      const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }
      return [0,0,0];
    }

    const body = document.querySelector('body');
    const styles = getComputedStyle(body!);

    const isDark = (): boolean => {
      const currentMode = window.matchMedia("(prefers-color-scheme: dark)").matches.toString();
      return (localStorage.getItem("dark-theme") || currentMode) === "true"; // true = "dark", false = "light"
    }

    const color = isDark() ? {
      bcolor: [16,24,42],
      fcolor: [255,255,255]
    } :
    {
      bcolor: [240,240,240],
      fcolor: [0,0,0]
    };

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          let dark = (mutation.target as HTMLBodyElement).classList.contains('sl-theme-dark');
          if (dark) {
            color.bcolor.splice(0,3, ...[16,24,42] );
            color.fcolor.splice(0,3, ...[255,255,255]);
          } else {
            color.bcolor.splice(0,3, ...[240,240,240] );
            color.fcolor.splice(0,3, ...[0,0,0]);
          }
        }
      });
    });

    observer.observe(body!, { attributes: true });

    const frontpage = async () => {
    
        const code = await loadWGSL(`./works/dla/dla.wgsl`);
        const defs = await loadJSON(`./works/dla/dla.json`);
    
        const spec = (w:number,h:number):PSpec => {
            console.log(w,h)
            const numParticles = 70000;
            const size = scaleAspect(w,h,512);
    
            const particles = Array(numParticles).fill({}).map(() => ({
                pos: [2 * Math.random() - 1, 2 * Math.random() - 1],
                vel: [2 * Math.random() - 1, 2 * Math.random() - 1],
            }))
            // initialize the ice with a few nucleation points
            const ice = Array(size.x * size.y).fill(0).map(() => Math.random() < 0.00001 ? 1 : 0);
    
            return {
                code: code,
                defs: defs,
                geometry: {
                    vertex: {
                        data: square(1.),
                        attributes: ["pos"],
                        instances: size.x * size.y    
                    }
                },
                uniforms: {
                    params: {
                        size: [size.x, size.y],
                        drops: numParticles,
                        fcolor: [0,255,255],
                        bcolor: [0,0,0]
                    }
                },
                storages: [
                    { name: "drops", size: numParticles , data: particles} ,
                    { name: "iceA", size: size.x * size.y, data: ice} ,
                    { name: "iceB", size: size.x * size.y, data: ice } ,
                ],
                computes: [
                    { name: "computeIce", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                    { name: "computeDrops", workgroups: [Math.ceil(numParticles / 64), 1, 1] }
                ],
                computeGroupCount: 5,
                bindings: [ [0,1,2,3,4,5], [0,1,3,2,4,5] ]
            }
        }
    
        return spec;
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
    const context = await PContext.init(canvas!);
    const observerCanvas = new ResizeObserver(async (entries) => {
      canvas.width = entries[0].target.clientWidth * devicePixelRatio;
      canvas.height = entries[0].target.clientHeight * devicePixelRatio;

      try {
        const spec = await frontpage();
        context.build(spec).animate({ params: { fcolor: color.fcolor, bcolor: color.bcolor }});
      } catch (e) {
        const error = document.querySelector("#error") as HTMLDivElement;
        error.innerHTML = "<span>Sorry, but there was an error with your WebGPU context. <br/> " + 
        "WebGPU is a new standard for graphics on the web.<br/>" +
        "The standard is currently implemented only <a href='https://caniuse.com/webgpu'>on certain browsers</a>.<br/>" +
        "For the full experience please use a supported browser. <br/>" +
        "<span style='color:red;'>" + e + "</span><span/>";
      }
    });

    observerCanvas.observe(canvas);
  
  }

  landing();

});


