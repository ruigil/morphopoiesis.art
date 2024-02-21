
const script = (shader: any, data: Lume.Data) => {

  const saveScreenshot = (id: string) => {
    return /* ts */ `
      // Add keypress event listener
      document.addEventListener('keypress', function(event) {
        if (event.key === 's') { 
          let dataUrl = canvas.toDataURL('image/png');
          let link = document.createElement('a');
          link.href = dataUrl;
          link.download = ${ id }.png;
          link.click();
        }
      });
    `
  }

  const tweakPane = () => {
    return /* ts */ `
      const PARAMS = {
        name: '${shader.title}',
        fps: '',
        frame: 0,
        elapsed: '',
        debug: '',
        color: '#ff0055',
        delay: 0
      };
      
      const pane = new Pane();
      
      pane.addBinding(PARAMS, 'name', { readonly: true });
      pane.addBinding(PARAMS, 'fps', { readonly: true });
      pane.addBinding(PARAMS, 'frame', { readonly: true });
      pane.addBinding(PARAMS, 'elapsed', { readonly: true });
      pane.addBinding(PARAMS, 'debug', {
        readonly: true,
        multiline: true,
        rows: 10,
      });
      const unis = pane.addFolder({
        title: 'Uniforms',
      });
      unis.addBinding(PARAMS, 'color');
      const crtl = pane.addFolder({
        title: 'Controls',
      });

      const pp = crtl.addButton({
        title: 'pause',
        label: 'Play/Pause',   // optional
      });
      const reset = crtl.addButton({
        title: 'reset',
        label: 'Reset',   // optional
      });
      const delay = crtl.addBinding(PARAMS, 'delay', { readonly: false });
      delay.on('change', (ev) => {
        console.log('changed: ' + JSON.stringify(ev.value));
        anim.delay(ev.value);
      });

      pp.on('click', () => {
        if (pp.title === 'pause') { pp.title = 'play'; } else { pp.title = 'pause'; }
        anim.togglePlayPause();
      });
      reset.on('click', () => {
        anim.reset();
      });
    `
  }

  const listeners = () => {
    return /* ts */ `
      const fpsListener = (fps) => { PARAMS.fps = fps.fps + " fps"; PARAMS.elapsed = fps.time; PARAMS.frame = fps.frame};
      const bufferListener = (view) => { PARAMS.debug =  JSON.stringify(view[0].get(),null,4) } ;
    `
  }

  return /*ts*/ `
    import { ${shader.id} } from './${shader.id}/${shader.id}.ts';
    import { animate } from '../lib/poiesis/index.ts';
    import { Pane } from '../lib/tweakpane/tweakpane-4.0.3.min.js';

    document.addEventListener('DOMContentLoaded', async (event)  => {
      const canvas = document.querySelector("#canvas");
      
      ${ shader.debug && tweakPane()  }

      ${ saveScreenshot(shader.id) }

      const fx = ('$fx' in window) ? $fx : undefined;
    
      const code = await (await fetch('./${shader.id}.wgsl')).text();
      const defs = await (await fetch('./${shader.id}.json')).json();

      const spec = await ${shader.id}(code,defs, fx);
      ${ shader.debug && listeners()  }

      const anim = await animate(spec, canvas, {} ${ shader.debug ?  ', { onFPS: fpsListener }, { onRead: bufferListener }' : '' } );
      anim.start();

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