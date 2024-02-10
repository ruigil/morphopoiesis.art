import { ArrayType, MemberInfo, TemplateType, Type, WgslReflect } from "../lib/poiesis/wgsl-reflect/index.ts";

const reflect = async (shader: any, data: Lume.Data) => {

  const wgslDefs = (reflect: WgslReflect) => {
        
    const typedArrayName = (type: Type | null): string => {
        if (type instanceof ArrayType) return typedArrayName(type.format);
        if (type instanceof TemplateType) return typedArrayName(type.format);
        return type!.name;
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
            type: typedArrayName(m.type),
        })).reduce( (acc:Record<string,any>, e:any) => { acc[e.name] = e; return acc; },{})
    };
    
    // transformation of the reflect data into a more usable format for buffers
    // This will be used to create the buffer views
    const defs = reflect.storage.map( s => ({ access: s.node.access, ...reflect.getStorageBufferInfo(s)! }) )
        .map( s => ({...s, category: "storage"})) 
        .concat(reflect.uniforms.map( u => reflect.getUniformBufferInfo(u)!)
        .map( u => ({...u, category: "uniform", access: "read_write"})))
        .map( b => ({
            ...b,
            members: members(b.members),
            type:  typedArrayName(b.type),
        }))
        .reduce( (acc:Record<string,any>, e:any) => { acc[e.name] = e; return acc; },{} )
    
    return defs;
  }

  const wgslCode = await Deno.readTextFile(`./site/works/${shader.id}/${shader.id}.wgsl`);

  const reflect = new WgslReflect(wgslCode);
  //console.log(reflect)
  const defs = wgslDefs(reflect);
  //console.log(defs)

  const response = {
    reflect: {...reflect, functions: undefined, ast: undefined },
    bindGroupLength: reflect.getBindGroups()[0].length, // the length of the first one
    bindings: defs
  }


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