
import { WGPU, wgsl, Utils } from './lib/wgpu.ts';

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
    
    const size = 512;
    const current = Array(size*size).fill(0).map(() => Math.random() > 0.3 ? 1 : 0);

    const body = document.querySelector('body');
    const styles = getComputedStyle(body!);

    const color = {
      bcolor: getRGBValues(styles.backgroundColor),
      fcolor: getRGBValues(styles.color)
    }

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          //console.log('Style changed:', mutation.target.classList);
          const styles = getComputedStyle(body!);
          color.bcolor.splice(0,3, ...getRGBValues(styles.backgroundColor) );
          color.fcolor.splice(0,3, ...getRGBValues(styles.color));
        }
      });
    });

    observer.observe(body!, { attributes: true });

    gpu.build({
        shader: code,
        geometry: {
            vertices: Utils.square(1.),
            instances: size*size
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
        workgroupCount: [64, 64, 1],
        bindings: {
            groups: [ [0,4,1,2], [0,4,2,1] ],
            currentGroup: (frame:number) => frame % 2,
        }      
    })
    //.addFPSListener( { onFPS: (fps) => { console.log(fps.fps + " fps") } })
    .draw({ uni: { size: [size, size], fcolor: color.fcolor, bcolor: color.bcolor }});
  }

  landing();
});


