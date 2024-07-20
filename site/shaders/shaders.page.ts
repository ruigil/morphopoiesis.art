import { shaderGenerator } from "../lib/generators.ts";


export default async function* (data: Lume.Data) {

  // export static shaders
  for (const s of data.shaders) {
    if (!s.dynamic) {
  
      s.wgsl = await Deno.readTextFile(`./site/shaders/${s.id}/${s.id}.wgsl`);
      
      yield* shaderGenerator(s)
    } 
  }
}