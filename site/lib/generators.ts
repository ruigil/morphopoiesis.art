import { WgslReflect, VariableInfo, MemberInfo, TypeInfo, StructInfo, ArrayInfo, TemplateInfo } from "./poiesis/wgsl-reflect/index.ts";
import { ArrayType, BaseVariable, Definitions, PrimitiveType, StructType, TemplateType, Variable, VariableType } from "./poiesis/poiesis.types.ts";

export type Shader = {
  id: string,
  title: string,
  description: string,
  path: string,
  image: string,
  tags: string[],
  sketch: boolean,
  panel: boolean,
  fx: boolean,
  spec: string,
  wgsl: string,
  dynamic: boolean,
  license: string,
}

const reflect = (wgslCode: string) => {
  const makeDefinitions = (variables: VariableInfo[]): Record<string, Variable> => {
    const result: Record<string, Variable> = {};

    const makeArrayType = (typeInfo: TypeInfo | null, elementSize?: number): VariableType => {
      if (!typeInfo) {
        return { name: "unknown", size: elementSize || 0, primitive: "unknown" } as PrimitiveType;
      }

      // Base info for the type
      const baseInfo: BaseVariable = {
        size: elementSize || 0, // Use provided element size if available
      };

      if (typeInfo instanceof StructInfo) {
        // Element is a struct
        const members: Record<string, VariableType> = {};
        if (typeInfo.members) {
          for (const member of typeInfo.members) {
            members[member.name] = makeDefinitionType(member);
          }
        }
        return {
          ...baseInfo,
          struct: {
            name: typeInfo.name,
            members: members
          }
        } as StructType;
      } else if (typeInfo instanceof ArrayInfo) {
        // Element is another array (nested array)
        // For nested arrays, the element size is the stride (if known) or we calculate it
        return {
          ...baseInfo,
          array: {
            count: typeInfo.count,
            element: makeArrayType(typeInfo.format, typeInfo.stride),
          }
        } as ArrayType;
      } else if (typeInfo instanceof TemplateInfo) {
        // Element is a template
        return {
          ...baseInfo,
          template: {
            name: typeInfo.name,
            size: baseInfo.size,
            primitive: typeInfo.format ? typeInfo.format.name : "unknown"
          }
        } as TemplateType;
      } else {
        // Element is a primitive
        return {
          ...baseInfo,
          primitive: typeInfo.name
        } as PrimitiveType;
      }
    }

    const makeDefinitionType = (variableInfo: VariableInfo | MemberInfo): VariableType => {
      // Start with the base info - size is already provided by the reflection API
      const baseInfo: BaseVariable = {
        size: variableInfo.size, // Total size in bytes
      };

      // Add binding/group info if present (only on VariableInfo, not MemberInfo)
      if ('group' in variableInfo && variableInfo.group !== undefined) {
        baseInfo.group = variableInfo.group;
        baseInfo.binding = variableInfo.binding;
      }

      // Add offset if present (usually on MemberInfo)
      if ('offset' in variableInfo && variableInfo.offset !== undefined) {
        baseInfo.offset = variableInfo.offset;
      }

      // Add access if present
      if ('access' in variableInfo && variableInfo.access) {
        baseInfo.access = variableInfo.access;
      }

      // Now create the typed structure based on the type
      if (!variableInfo.type) {
        return { ...baseInfo, primitive: "unknown" } as PrimitiveType;
      }

      if (variableInfo.type instanceof StructInfo) {
        // It's a struct
        const members: Record<string, VariableType> = {};
        if (variableInfo.type.members) {
          for (const member of variableInfo.type.members) {
            members[member.name] = makeDefinitionType(member);
          }
        }
        return {
          ...baseInfo,
          struct: {
            members: members
          }
        } as StructType;
      } else if (variableInfo.type instanceof ArrayInfo) {
        // It's an array
        // For arrays, we need the stride between elements
        const elementStride = variableInfo.stride;

        // Construct the element type
        const element = makeArrayType(
          variableInfo.type.format,
          elementStride // Pass the stride as the element size
        );

        return {
          ...baseInfo,
          array: {
            count: variableInfo.type.count,
            stride: elementStride,
            element: element
          }
        } as ArrayType;
      } else if (variableInfo.type instanceof TemplateInfo) {
        // It's a template (vec2, vec3, etc.)
        // We use the size directly from the reflection API
        return {
          ...baseInfo,
          template: {
            size: baseInfo.size,
            primitive: variableInfo.type.format ? variableInfo.type.format.name : "unknown"
          }
        } as TemplateType;
      } else if (variableInfo.type.name.startsWith('vec')) {
        // It's a vector type (vec2, vec3, vec4)
        const typeName = variableInfo.type.name.endsWith('f') ? 'f32' : variableInfo.type.name.endsWith('i') ? 'i32' : 'u32';
        return {
          ...baseInfo,
          template: {
            size: baseInfo.size,
            primitive: typeName,
          }  
        } as TemplateType;
      } else {
        // It's a primitive type
        return {
          ...baseInfo,
          primitive: variableInfo.type.name
        } as PrimitiveType;
      }
    }

    for (const variable of variables) {
      result[variable.name] = makeDefinitionType(variable) as Variable;
    }

    return result;
  }
  const primitiveTypeName = (type: TypeInfo | null): string => {
    if (type instanceof ArrayInfo) return primitiveTypeName(type.format);
    if (type instanceof TemplateInfo) return primitiveTypeName(type.format);
    return type!.name;
  }
  const sizeType = (type: TypeInfo | null, size: number = 0): number => {
    if (type instanceof ArrayInfo) return sizeType(type.format, type.count);
    if (type instanceof TemplateInfo) return sizeType(type.format, type.name === 'vec4' ? 4 : type.name === 'vec3' ? 3 : type.name === 'vec2' ? 2 : 1);
    // we assume only the primitives types u32, i32 and f32, so all 4 bytes 
    return size * 4;
  }

  const reflect = new WgslReflect(wgslCode);
  const uniformVariables = makeDefinitions(reflect.uniforms);
  const storageVariables = makeDefinitions(reflect.storage.filter(s => s.resourceType === 1));

  const samplers = reflect.samplers.map(s => ({ name: s.name, group: s.group, binding: s.binding }))
  const textures = reflect.textures.map(t => ({ name: t.name, group: t.group, binding: t.binding }))
    .concat(reflect.storage.filter(s => s.resourceType === 4).map(t => ({ name: t.name, group: t.group, binding: t.binding })))

  const entries = {
    ...(reflect.entry.vertex[0] ?
      {
        vertex: {
          name: reflect.entry.vertex[0].name,
          inputs: reflect.entry.vertex[0].inputs.map(i =>
            ({ name: i.name, location: i.location, type: primitiveTypeName(i.type), size: sizeType(i.type) }))
        }
      } : undefined),
    ...(reflect.entry.fragment[0] ? {
      fragment: {
        name: reflect.entry.fragment[0].name
      },
    } : undefined),
    ...(reflect.entry.compute ? {
      computes: reflect.entry.compute.map(c => ({ name: c.name }))
    } : undefined)
  }

  return {
    samplers: samplers,
    textures: textures,
    entries: entries,
    uniforms: uniformVariables,
    storages: storageVariables,
    bindGroupLength: reflect.getBindGroups()[0] ? reflect.getBindGroups()[0].length : 0,
  } as Definitions;

}


export const script = (shader: Shader, rpath: string) => {

  const saveScreenshot = (id: string) => {
    return /* ts */ `
        // Add keypress event listener
        document.addEventListener('keypress', function(event) {
          if (event.key === 's') { 
            let dataUrl = canvas.toDataURL('image/png');
            let link = document.createElement('a');
            link.href = dataUrl;
            link.download = '${id}.png';
            link.click();
          }
        });
      `
  }
  const resetKey = () => {
    return /* ts */ `
        // Add keypress event listener
        document.addEventListener('keypress', function(event) {
          if (event.key === 'r') { 
            loop.reset()
          }
        });
      `
  }

  const displayError = () => {
    return /* ts */ `
      // maybe a webcomponent ?
      const displayError = (error) => {
        const escapeHtml = (text) => {
          return text.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('\\n', "<br/>");
        }

        const errorElement = document.getElementById('poiesis-error')!
        errorElement.className = 'poiesis-error ' + error.type + (error.fatal ? ' fatal' : '')
        errorElement.style.display = 'block';
        errorElement.innerHTML = '<h3 class="poiesis-error-title">' + error.type + ' Error</h3>' +
          '<p class="poiesis-error-message">' + escapeHtml(error.message) + '</p>' +
          (error.suggestion ? '<p class="poiesis-error-suggestion">Suggestion: ' + error.suggestion + '</p>' : '') +
          (error.details ? '<pre class="poiesis-error-details">' + error.details + '</pre>' : '')
      }
    `
  }

  const tweakPane = () => {
    return /* ts */ `
        const PARAMS = {
          fps: 0,
          frame: 0,
          elapsed: 0,
          delay: 0
        };
        
        const pane = new Pane({ title: '${shader.title}'});
        
        pane.addBinding(PARAMS, 'fps', { readonly: true });
        pane.addBinding(PARAMS, 'frame', { readonly: true,  format: (v) => v });
        pane.addBinding(PARAMS, 'elapsed', { readonly: true });
        const crtl = pane.addFolder({
          title: 'Controls',
        });

        const feat = pane.addFolder({
          title: 'GPU Features',
          expanded: false
        });

        Object.entries(gpu.features).forEach(([k,v]) => {
          PARAMS[k] = v;
          feat.addBinding(PARAMS, k, { readonly: true });        
        });

        const limits = pane.addFolder({
          title: 'GPU Limits',
          expanded: false
        });

        Object.entries(gpu.limits).forEach(([k,v]) => {
          PARAMS[k] = v;
          limits.addBinding(PARAMS, k, { readonly: true, format: (v) => v });        
        });

        const pp = crtl.addButton({
          title: 'pause',
          label: 'Play/Pause',   
        })
        pp.on('click', (e) => {
          pp.title = (pp.title === 'pause') ? 'play' : 'pause';
          loop.togglePlayPause();
        });

        crtl.addButton({
          title: 'reset',
          label: 'Reset',   
        }).on('click', () => {
          loop.reset();
        });

        crtl.addBinding(PARAMS, 'delay', { readonly: false }).on('change', (ev) => {
          loop.delay(ev.value);
        });
        
        let specunis = null;
        let specstorages = null;
        let bufferListeners = [];

      `
  }

  const listeners = () => {
    return /* ts */ `
        const fpsListener = {
          onFPS: (fps) => { PARAMS.fps = fps.fps; PARAMS.elapsed = fps.time; PARAMS.frame = fps.frame }
        };
        const buildListener = {
          onBuild: (spec,instance) => { 
            let s = spec;
            let storages = s.storages ? s.storages.filter( s => s.read ) : [];
            
            storages.forEach( ss => PARAMS[ss.name] = '');


            if (s.unipane) {
              if (specunis) specunis.dispose();
              specunis = pane.addFolder({
                title: 'Uniforms',
                expanded: true,
              });
              s.unipane.config(specunis, PARAMS);
            }
            if (specstorages) specstorages.forEach( s => s.dispose());
            specstorages = storages.map( ss => {
                let sp = pane.addFolder({ title: ss.name, expanded: true});
                sp.addBinding(PARAMS,ss.name, {
                  readonly: true,
                  multiline: true,
                  rows: 10,
                });
                return sp;        
            })
            const bufferListeners = storages.map(ss => {
              return {
                name: ss.name,
                onRead: (view) => { PARAMS[ss.name] =  JSON.stringify(view.get(),null,4) } 
              } 
            });
            instance.addBufferListeners(bufferListeners);
          }
        };

      `
  }

  return /*ts*/ `
      import { Poiesis, drawLoop, ErrorManager } from '${rpath}/../lib/poiesis/index.ts'; 
      import { ${shader.id} } from '${rpath}/../shaders/${shader.path}/${shader.id}.ts';
      
      ${shader.panel ? `import { Pane } from '${rpath}/../lib/tweakpane/tweakpane-4.0.3.min.js';` : ''}
      
      ${  displayError() }

      document.addEventListener('DOMContentLoaded', async (event)  => {
        const canvas = document.querySelector("#canvas");
      
        const fx = ('$fx' in window) ? $fx : undefined;

        const code = await (await fetch('./${shader.id}.wgsl')).text();
        const defs = await (await fetch('./${shader.id}.json')).json();
  
        ErrorManager.addErrorCallback((error) => displayError(error));
  
        const gpu = await Poiesis();

        const spec = await ${shader.id}(code,defs, fx);
  
        ${shader.panel && listeners()}
        ${shader.panel && tweakPane()}

        const loop = drawLoop(gpu, spec, canvas, {} ${shader.panel ? ', fpsListener, buildListener' : ''} );
        loop.start();
          
        ${saveScreenshot(shader.id)}
        ${resetKey()}
  
      });`
}

export const htmlPage = (shader: Shader) => {

  return /*html*/`
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
      ${shader.fx ? '<script src="./fxhash.min.js"></script>' : ''}
      <script type="module" src="index.js"></script>
    `;
}
const by = await Deno.readTextFile(`./site/lib/licenses/cc-by-4.0.md`);
const byNcNd = await Deno.readTextFile(`./site/lib/licenses/cc-by-nc-nd-4.0.md`);

const licenses: Record<string, string> = {
  "cc-by": by,
  "cc-by-nc-nd": byNcNd
}

export const license = (name: string) => licenses[name];


export const shaderGenerator = async function* (shader: Shader, rpath: string = ".") {

  // wgsl file
  yield {
    url: `${rpath}/../shaders/${shader.path}/${shader.id}.wgsl`,
    content: shader.wgsl,
  };
  // Definitions file
  yield {
    url: `${rpath}/../shaders/${shader.path}/${shader.id}.json`,
    content: `${JSON.stringify(reflect(shader.wgsl), null, 2)}`,
  };
  // html page
  yield {
    url: `${rpath}/../shaders/${shader.path}/`,
    title: shader.title,
    layout: "shaders.layout.ts",
    description: shader.description,
    content: htmlPage(shader),
  };
  // shader licence
  yield {
    url: `${rpath}/../shaders/${shader.path}/LICENSE.md`,
    content: license(shader.license),
  };
  // shader code
  yield {
    url: `${rpath}/../shaders/${shader.path}/index.ts`,
    content: script(shader, rpath),
  };

}