const script = (shader: any, data: Lume.Data) => {

  return `
  import { ${shader.id} } from './${shader.id}/${shader.id}.ts';
  import { PContext } from '../lib/poiesis/index.ts';

  document.addEventListener('DOMContentLoaded', async (event)  => {
    const canvas = document.querySelector("#canvas");

      ${ shader.debug ?
        `const fpsSmall = document.querySelector("#fps");
        const debug = document.querySelector("#debug");
        ` : ''
      }

      const context = await PContext.init(canvas);
      const spec = await ${shader.id}('./${shader.id}.wgsl','./${shader.id}.json');

      const observer = new ResizeObserver(async (entries) => {
        canvas.width = entries[0].target.clientWidth * devicePixelRatio;
        canvas.height = entries[0].target.clientHeight * devicePixelRatio;

        try {
          ${ shader.debug ? 
            'context.build(spec).addBufferListener({onRead: (view) => { debug.textContent =  JSON.stringify(view[0].get(),null,4) }}).animate({},undefined,{ onFPS: (fps) => { fpsSmall.textContent = fps.fps + " fps" } });':
            'context.build(spec).animate({});'
          }
        } catch (err) {
          const error = document.querySelector("#error") ;
          error.innerHTML = "<span>Sorry, but there was an error with your WebGPU context. <br/> " + 
          "WebGPU is a new standard for graphics on the web.<br/>" +
          "The standard is currently implemented only <a href='https://caniuse.com/webgpu'>on certain browsers</a>.<br/>" +
          "For the full experience please use a supported browser. <br/>" +
          "<span style='color:red;'>" + err + "</span><span/>";
        }
      });

      observer.observe(canvas)            
    });`
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