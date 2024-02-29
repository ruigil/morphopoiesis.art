const shader =  {
    "id": "",
    "path": "",
    "title": "",
    "description": "",
    "image": "",
    "tags": [],
    "license" : "cc-by",
    "sketch" : false,
    "debug" : true,
    "fx" : false
}

console.log("Please enter shader creation parameters...");

shader.id = prompt("Shader ID: ") || "null";
shader.path = prompt(`Shader Path [${shader.id}]:`) || shader.id;
shader.title = prompt(`Shader Title [${shader.id}]:`) || shader.id;
shader.description = prompt(`Shader Description [${shader.id}]: `) || shader.id;
shader.license = prompt(`Shader Licence [cc-by]: `) || "cc-by";
shader.debug = Boolean(prompt(`Debug [true]: `) || "true");
shader.sketch = Boolean(prompt(`Sketch [false]: `) || "false");
shader.fx = Boolean(prompt(`FXHASH [false]: `) || "false");

if (shader.id === "null") {
    console.log("Invalid ID");
    Deno.exit();
} else {
    const data = JSON.parse(await Deno.readTextFile(`./site/_data.json`));
    data.shaders.unshift(shader);
    const path = shader.path.split("/");
    
    const TsTemplate = `
import { PSpec, Definitions } from "../../${ path.map( (_,i) => i < path.length-1 ? '../' : '' ).join("") }lib/poiesis/index.ts";

export const ${shader.id} = async (code: string,defs: Definitions, fx:any ) => {

    return (): PSpec => ({ code: code, defs: defs });
}
    `
    const wgslTemplate = `
struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}

@group(0) @binding(0) var<uniform> sys: Sys;

@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f  {
    return vec4f(pos,0.,1.);
}

@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {        
    return vec4f(1.,1.,0., 1.);
}
    `
    
    const writeFile = (path: string, data: string): string => {
        try {
            Deno.writeTextFileSync(path, data );
            return "Written to " + path;
        } catch (e) {
            return e.message;
        }
    }
    
    Deno.mkdirSync(`./site/shaders/${shader.path}`, { recursive: true });
    console.log(writeFile(`./site/shaders/${shader.path}/${shader.id}.ts`, TsTemplate));
    console.log(writeFile(`./site/shaders/${shader.path}/${shader.id}.wgsl`, wgslTemplate));
    console.log(writeFile(`./site/_data.json`, JSON.stringify(data, null, 2)));
    
}
