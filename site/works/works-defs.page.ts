import { ArrayType, MemberInfo, TemplateType, Type, WgslReflect } from "../lib/poiesis/wgsl-reflect/index.ts";
import { BufferInfo } from "../lib/poiesis/poiesis.interfaces.ts";
import { Definitions } from "../lib/poiesis/index.ts";

const reflect = async (shader: any, data: Lume.Data) => {

  const primitiveTypeName = (type: Type | null): string => {
    if (type instanceof ArrayType) return primitiveTypeName(type.format);
    if (type instanceof TemplateType) return primitiveTypeName(type.format);
    return type!.name;
  }
  const sizeType = (type: Type | null, size:number = 0): number => {
    if (type instanceof ArrayType) return sizeType(type.format, type.count);
    if (type instanceof TemplateType) return sizeType(type.format, type.name === 'vec4' ? 4 : type.name === 'vec3' ?  3 : type.name === 'vec2' ? 2 : 1 );
    // we assume only the primitives types u32, i32 and f32, so all 4 bytes 
    //return type!.name === 'f32' ? size * 4 : size * 4;
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

  const wgslCode = await Deno.readTextFile(`./site/works/${shader.id}/${shader.id}.wgsl`);
  const reflect = new WgslReflect(wgslCode);

  const storages = reflect.storage
  .map( s => ({ 
    ...reflect.getStorageBufferInfo(s)!,
    access: s.node.access, 
  } ))
  .map( b => ({
    ...b,
    align: undefined,
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

export default async function* (data: Lume.Data) {

  for (const s of data.shaders) {
    yield {
      url: `./${s.id}/${s.id}.json`,
      title: s.title,
      description: s.description,
      content: `${await reflect(s, data)}`,
    };
  }
}