
const script = (shader: any, data: Lume.Data) => {

  const saveScreenshot = (id: string) => {
    return /* ts */ `
      // Add keypress event listener
      document.addEventListener('keypress', function(event) {
        if (event.key === 's') { 
          let dataUrl = canvas.toDataURL('image/png');
          let link = document.createElement('a');
          link.href = dataUrl;
          link.download = '${ id }.png';
          link.click();
        }
      });
    `
  }

  const fillParam = () => {
    return /* ts */ `
      //console.log(spec(canvas.width, canvas.height).debugpane.get())
      let specdebug = spec(canvas.width, canvas.height).debugpane;
      const su = specdebug ? specdebug.get() : {};
      const uniforms = specdebug ? specdebug.map(su) : {};
      const PARAMS = {
        name: '${shader.title}',
        fps: '',
        frame: 0,
        elapsed: '',
        debug: '',
        delay: 0,
        ...su
      };
    `
  }

  const tweakPane = () => {
    return /* ts */ `
      
      const pane = new Pane();
      
      pane.addBinding(PARAMS, 'name', { readonly: true });
      pane.addBinding(PARAMS, 'fps', { readonly: true });
      pane.addBinding(PARAMS, 'frame', { readonly: true });
      pane.addBinding(PARAMS, 'elapsed', { readonly: true });
      const d = pane.addFolder({ title: 'Debug', expanded: false});
      d.addBinding(PARAMS, 'debug', {
        readonly: true,
        multiline: true,
        rows: 30,
      });
      const unis = pane.addFolder({
        title: 'Uniforms',
        expanded: false,
      });
      for (let key in su) {
        const u = unis.addBinding(PARAMS, key, { readonly: false });
        u.on('change', (ev) => {
          const mu = specdebug.map({...su, [key]: ev.value });
          for (let mukey in mu) {
            uniforms[mukey] = mu[mukey];
          }
        });
      }
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
        anim.delay(ev.value);
      });

      pp.on('click', () => {
        if (pp.title === 'pause') { pp.title = 'play'; } else { pp.title = 'pause'; }
        anim.togglePlayPause();
      });
      reset.on('click', () => {
        anim.reset();
        specdebug = spec(canvas.width, canvas.height).debugpane;
        if (specdebug) {
          const su = specdebug.get();
          for (let sukey in su) {
            PARAMS[sukey] = su[sukey];
          }
          const mu = specdebug.map(su);
          for (let mukey in mu) {
            uniforms[mukey] = mu[mukey];
          }
        }
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
    import { ${shader.id} } from './${shader.path}/${shader.id}.ts';
    import { animate } from '../lib/poiesis/index.ts';
    import { Pane } from '../lib/tweakpane/tweakpane-4.0.3.min.js';

    document.addEventListener('DOMContentLoaded', async (event)  => {
      const canvas = document.querySelector("#canvas");
      

      ${ saveScreenshot(shader.id) }

      const fx = ('$fx' in window) ? $fx : undefined;
    
      const code = await (await fetch('./${shader.id}.wgsl')).text();
      const defs = await (await fetch('./${shader.id}.json')).json();

      const spec = await ${shader.id}(code,defs, fx);

      ${ shader.debug && fillParam() }
      ${ shader.debug && tweakPane() }
      ${ shader.debug && listeners() }

      const anim = animate(spec, canvas, ${ shader.debug ?  'uniforms, { onFPS: fpsListener }, { onRead: bufferListener }' : '{}' } );
      anim.start();
      //anim.delay(1000);

    });`
}


export default function* (data: Lume.Data) {

  for (const s of data.shaders) {
    yield {
      url: `./${s.path}/index.ts`,
      title: s.title,
      description: s.description,
      content: `${script(s, data)}`,
    };
  }
}