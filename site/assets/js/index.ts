
import { WGPU, wgsl, Utils } from '../../lib/webgpu/webgpu.ts';

document.addEventListener('DOMContentLoaded', event => {

  const landing = async () => {

    const getRGBValues = (rgbString: string): number[]  => {
      const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }
      return [0,0,0];
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
    
    const code = await wgsl(`/assets/shaders/gol/gol.wgsl`)

    const gpu = await new WGPU(canvas!).init();
    
    const size = 256;
    const current = Array(size*size).fill(0).map(() => Math.random() > 0.3 ? 1 : 0);

    const body = document.querySelector('body');
    const styles = getComputedStyle(body!);

    const isDark = (): boolean => {
      const currentMode = window.matchMedia("(prefers-color-scheme: dark)").matches.toString();
      return (localStorage.getItem("dark-theme") || currentMode) === "true"; // true = "dark", false = "light"
    }

    const color = isDark() ? {
      //bcolor: getRGBValues(styles.backgroundColor),
      bcolor: [16,24,42],
      //fcolor: getRGBValues(styles.color)
      fcolor: [224,128,16]
    } :
    {
      bcolor: [240,240,240],
      fcolor: [196,96,0]
    };

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          //console.log('Style changed:', mutation.target.classList.length);
          //const styles = getComputedStyle(body!);
          let dark = mutation.target.classList.contains('sl-theme-dark');
          if (dark) {
            color.bcolor.splice(0,3, ...[16,24,42] );
            color.fcolor.splice(0,3, ...[224,128,16]);
          } else {
            color.bcolor.splice(0,3, ...[240,240,240] );
            color.fcolor.splice(0,3, ...[196,96,0]);
          }
        }
      });
    });

    observer.observe(body!, { attributes: true });

    gpu.build({
        shader: code,
        geometry: {
          vertex: {
            data: Utils.square(1.),
            attributes: ["pos"],
            instances: size * size    
         }
        },
        uniforms: {
            uni: {
              size: [size, size],
              fcolor: color.fcolor,
              bcolor: color.bcolor
            }
        },
        storage: [
            { name: "current", size: current.length, data: current } ,
            { name: "next", size: size * size } 
        ],
        workgroupCount: [size/8, size/8, 1],
        bindings: {
            groups: [ [0,4,1,2], [0,4,2,1] ],
            currentGroup: (frame:number) => frame % 2,
        }      
    })
    .draw({ uni: { size: [size, size], fcolor: color.fcolor, bcolor: color.bcolor }});
  }

  landing();
});


