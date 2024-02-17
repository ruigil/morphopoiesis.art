
import { PSpec, PContext, loadJSON, loadWGSL, square, scaleAspect } from "../../works/libs/poiesis/index.ts";


const frontpage = async () => {
    
  const code = await loadWGSL(`./works/dla/dla.wgsl`);
  const defs = await loadJSON(`./works/dla/dla.json`);

  const spec = (w:number,h:number):PSpec => {
      const numWaterDrops = 70000;
      const size = scaleAspect(w,h,512);

      // initialize the water drops with random positions and velocities
      const waterDrops = Array.from({ length: numWaterDrops }, () => ({
          pos: [2 * Math.random() - 1, 2 * Math.random() - 1],
          vel: [2 * Math.random() - 1, 2 * Math.random() - 1],
      }))
      // initialize the ice with a few nucleation points
      const ice = Array.from({ length: size.x * size.y}, () => Math.random() < 0.00003 ? 1 : 0);

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
                  drops: numWaterDrops,
                  fcolor: [0,255,255],
                  bcolor: [0,0,0]
              }
          },
          storages: [
              { name: "drops", size: numWaterDrops , data: waterDrops} ,
              { name: "iceA", size: size.x * size.y, data: ice} ,
              { name: "iceB", size: size.x * size.y, data: ice } ,
          ],
          computes: [
              { name: "computeIce", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
              { name: "computeDrops", workgroups: [Math.ceil(numWaterDrops / 64), 1, 1] }
          ],
          computeGroupCount: 16,
          bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
      }
  }

  return spec;
}



document.addEventListener('DOMContentLoaded', async (event) => {

  const landing = async () => {

    const body = document.querySelector('body');

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


