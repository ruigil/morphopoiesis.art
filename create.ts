const shader =  {
    "id": "",
    "path": "",
    "title": "",
    "description": "",
    "tags": [],
    "license" : "cc-by",
    "sketch" : false,
    "dynamic" : false,
    "debug" : true,
    "fx" : false
}

console.log("Please enter shader creation parameters...");

shader.id = prompt("Shader ID: ") || "null";
shader.path = prompt(`Shader Path [${shader.id}]:`) || shader.id;
shader.title = prompt(`Shader Title [${shader.id}]:`) || shader.id;
shader.description = prompt(`Shader Description [${shader.id}]: `) || shader.id;
shader.license = prompt(`Shader Licence [cc-by]: `) || "cc-by";
shader.debug = Boolean(prompt(`Debug [true]: `) == "");
shader.dynamic = Boolean(prompt(`Dynamic [false]: `) !== "");
shader.sketch = Boolean(prompt(`Sketch [false]: `) != "");
shader.fx = Boolean(prompt(`FXHASH [false]: `) != "");

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

    const wgslDynamicTemplate = `
import { shaderGenerator } from "../../../lib/generators.ts";

const wgslCode = () => {
    return ` + "`" + wgslTemplate + "`" + `
}

export default async function* (data: Lume.Data) {
    const s = data.shaders.find( (s:any) => s.id === "${shader.id}" );
    s.wgsl = wgslCode();
    yield* shaderGenerator(s,'../..');
}`

    const writeFile = (path: string, data: string): string => {
        try {
            Deno.writeTextFileSync(path, data );
            return "Written to " + path;
        } catch (e:any) {
            return e.message;
        }
    }
    
    Deno.mkdirSync(`./site/shaders/${shader.path}`, { recursive: true });
    console.log(writeFile(`./site/shaders/${shader.path}/${shader.id}.ts`, TsTemplate));
    if (!shader.dynamic) 
        console.log(writeFile(`./site/shaders/${shader.path}/${shader.id}.wgsl`, wgslTemplate));
    else
        console.log(writeFile(`./site/shaders/${shader.path}/${shader.id}.page.ts`, wgslDynamicTemplate));
    console.log(writeFile(`./site/_data.json`, JSON.stringify(data, null, 2)));    
}
