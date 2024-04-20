import { ArrayType, MemberInfo, TemplateType, Type, WgslReflect } from "./poiesis/wgsl-reflect/index.ts";
import { Definitions } from "./poiesis/poiesis.interfaces.ts";

export type Shader = {
    id: string,
    path: string;
    title: string,
    description: string,
    image: string,
    tags: string[],
    sketch: boolean,
    debug: boolean,
    fx: boolean,
    spec: string,
    wgsl: string,
    dynamic: boolean,
    license: string,
}

export const reflect = (wgslCode: string) => {

    const primitiveTypeName = (type: Type | null): string => {
        if (type instanceof ArrayType) return primitiveTypeName(type.format);
        if (type instanceof TemplateType) return primitiveTypeName(type.format);
        return type!.name;
    }
    const sizeType = (type: Type | null, size:number = 0): number => {
        if (type instanceof ArrayType) return sizeType(type.format, type.count);
        if (type instanceof TemplateType) return sizeType(type.format, type.name === 'vec4' ? 4 : type.name === 'vec3' ?  3 : type.name === 'vec2' ? 2 : 1 );
        // we assume only the primitives types u32, i32 and f32, so all 4 bytes 
        return size * 4;
    }

    const members = (ms :MemberInfo[] | null) : any =>  {
        if (!ms) return undefined;
        return ms.map( m => ({
            arrayCount: m.arrayCount,
            arrayStride: m.arrayStride,
            isArray: m.isArray,
            isStruct: m.isStruct,
            name: m.name,
            offset: m.offset,
            size: m.size,
            members: members(m.members),
            type: primitiveTypeName(m.type),
        })).reduce( (acc:Record<string,any>, e:any) => { acc[e.name] = e; return acc; },{})
    };

    const reflect = new WgslReflect(wgslCode);

    const storages = reflect.storage
    .map( s => ({ 
        ...reflect.getStorageBufferInfo(s)!,
        access: s.node.access, 
    } ))
    .map( b => ({
        ...b,
        align: undefined,
        size: (b.isArray) ? b.arrayStride : b.size,
        arrayStride: (b.isArray) && (!b.isStruct) ? b.align : b.arrayStride, 
        members: members(b.members),
        type:  primitiveTypeName(b.type),
    }))
    .reduce( (acc:Record<string,any>, e:any) => { acc[e.name] = e; return acc; },{} )

    const uniforms = reflect.uniforms
    .map( s => ({...reflect.getUniformBufferInfo(s)!}))
    .map( b => ({
        ...b,
        members: members(b.members),
        type:  primitiveTypeName(b.type),
    }))
    .reduce( (acc:Record<string,any>, e:any) => { acc[e.name] = e; return acc; },{} )

    //console.log(reflect)

    const vertexInputs = reflect.entry.vertex[0].inputs.filter(i => i.locationType="location").map( i => {
        return {
        name: i.name,
        location: i.location,
        type: primitiveTypeName(i.type),
        size: sizeType(i.type)
        }
    })

    const entries = { 
        vertex: {
            inputs: vertexInputs,
            name: reflect.entry.vertex[0].node.name
        },
        fragment: {
            name: reflect.entry.fragment[0].node.name
        },
        computes: reflect.entry.compute.map( (c:any) => ({ name: c.node.name }) )
    }

    const samplers = reflect.samplers.map( s => ({
        name: s.node.name,
        group: s.group,
        binding: s.binding
    }))

    const textures = reflect.textures.map( s => ({
        name: s.node.name,
        group: s.group,
        binding: s.binding
    }))

    const response = {
        samplers: samplers,
        storages: storages,
        uniforms: uniforms,
        textures: textures,
        entries: entries, 
        bindGroupLength: reflect.getBindGroups()[0].length // the length of the first one
    } as Definitions;


    return JSON.stringify(response, null, 2);
}



export const script = (shader: Shader, rootpath:string) => {

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
          rows: 10,
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
      import { animate } from '${rootpath}lib/poiesis/index.ts';
      import { Pane } from '${rootpath}lib/tweakpane/tweakpane-4.0.3.min.js';
  
      ${ shader.dynamic ? shader.spec : `import { ${shader.id} } from '${rootpath}/${shader.path}/${shader.id}.ts'` }

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
  
export const htmlPage = async (shader: Shader) => {

    return /*html*/`
      <div id="error" class="full-window"></div>
      <canvas id="canvas" class="full-window"></canvas>
      
      <style>
      .full-window {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
      }
      </style>
      ${ shader.fx ? '<script src="./fxhash.min.js"></script>' : '' }
      <script type="module" src="index.js"></script>
    `;
}
const by = await Deno.readTextFile(`./site/lib/licenses/cc-by-4.0.md`);
const byNcNd = await Deno.readTextFile(`./site/lib/licenses/cc-by-nc-nd-4.0.md`);

const licenses:Record<string,string> = {
  "cc-by": by,
  "cc-by-nc-nd": byNcNd
}

export const license = (name: string) => licenses[name];


export const shaderGenerator = async function* (shader: Shader, rootPath: string) {
  yield {
    url: `${rootPath}/${shader.path}/${shader.id}.wgsl`,
    content: shader.wgsl,
  };
  yield {
    url: `${rootPath}/${shader.path}/${shader.id}.json`,
    content: `${reflect( shader.wgsl )}`,
  };
  // html page
  yield {
    url: `${rootPath}/${shader.path}/`,
    title: shader.title,
    layout: "shaders.layout.ts",
    description: shader.description,
    content: htmlPage(shader),
  };
  // shader licence
  yield {
    url: `${rootPath}/${shader.path}/LICENSE.md`,
    content: license(shader.license),
  };
  // shader code
  yield {
    url: `${rootPath}/${shader.path}/index.ts`,
    content: script(shader,`${rootPath}/`),
  };

}

