import { WgslReflect, TemplateInfo, ArrayInfo, TypeInfo, MemberInfo, StructInfo, VariableInfo } from "./site/lib/poiesis/wgsl-reflect/index.ts"
//import { reflect } from "./site/lib/generators.ts"
//import { VariableInfo } from "./site/lib/poiesis/wgsl-reflect2/wgsl_reflect.ts";
//const wgsl = await Deno.readTextFile("./site/shaders/boids/boids.wgsl");
//const wgsl = await Deno.readTextFile("./site/shaders/dla/dla.wgsl");
//const wgsl = await Deno.readTextFile("./site/shaders/webcam/webcam.wgsl");
//const wgsl = await Deno.readTextFile("./site/shaders/fluid/fluid.wgsl");
//const wgsl = await Deno.readTextFile("./site/shaders/rd/rd.wgsl");
const wgsl = await Deno.readTextFile("./site/shaders/pathtracer/pathtracer.wgsl");
//const wgsl = await Deno.readTextFile("./site/shaders/physarum/physarum.wgsl");
//const wgsl = await Deno.readTextFile("./site/shaders/wave/wave.wgsl");
//const wgsl = await Deno.readTextFile("./test.wgsl");

// Type definitions for structured shader reflection

// Base interface for all structured types
interface BaseVariable {
  size: number;
  offset?: number;
  group?: number;
  binding?: number;
  access?: string;
}


// For primitive types (f32, i32, u32, etc.)
interface PrimitiveType extends BaseVariable {
  primitive: string;
}

// For template types (vec2, vec3, mat4, etc.)
interface TemplateType extends BaseVariable {
  template: {
    name: string;
    size: number;
    primitive: string;
  };
}

// For struct types
interface StructType extends BaseVariable {
  struct: {
    name: string;
    members: Record<string, VariableType>;
  };
}

// For array types
interface ArrayType extends BaseVariable {
  array: {
    count: number;
    stride?: number;
    element: VariableType;
  };
}

// Union type for all structured types
type VariableType = PrimitiveType | TemplateType | StructType | ArrayType;

// Union type for top-level variables
type Variable = BaseVariable & VariableType;

// Type for the entire reflection result
interface Definition {
  uniforms: Record<string, Variable>;
  storages: Record<string, Variable>;
  textures?: Array<{ name: string; group: number; binding: number }>;
  samplers?: Array<{ name: string; group: number; binding: number }>;
  entries?: {
    vertex?: {
      name: string;
      inputs: { name: string; location: string | number; type: string; size: number }[];
    };
    fragment?: {
      name: string;
    };
    compute?: { name: string }[];
  };
  bindGroupLength?: number;
}

// Now update our buffer view interface to use these types
interface BufferView {
  buffer: ArrayBuffer;
  set: (data: unknown) => void;
  get: () => unknown;
  update: (newBuffer: ArrayBuffer) => void;
}

type TypedArray = Float32Array | Int32Array | Uint32Array | Uint8Array;  

const reflect2 = new WgslReflect(wgsl);

const makeBufferView = (variable: VariableType, size: number = 1): BufferView =>  {
  // Create the buffer based on the size information in the definition
  // Just use the size property directly from the structured definition
  // if the size is zero is because is a dynamic array
  const totalSize = variable.size != 0 ? variable.size : ((variable as ArrayType).array.stride || 1) * size;
  console.log("totalSize", totalSize)
  
  const buffer = new ArrayBuffer(totalSize);
  
  // Create appropriate view object based on the structured definition
  const createView = (def: VariableType, baseOffset: number = 0): unknown => {
    // Handle primitive types
    if ('primitive' in def) {
      return createPrimitiveView(def.primitive, buffer, baseOffset, def.size);
    }
    
    // Handle template types (vec2, vec3, etc.)
    if ('template' in def) {
      return createTemplateView(def.template, buffer, baseOffset);
    }
    
    // Handle struct types
    if ('struct' in def) {
      return createStructView(def, baseOffset);
    }
    
    // Handle array types
    if ('array' in def) {
      return createArrayView(def, buffer, baseOffset, size);
    }
    
    // If we get here, we don't know how to handle this type
    console.error("Unknown type in makeBufferView", def);
    return null;
  }

  const getArrayType = (type:string) => {
    switch (type) {
      case 'f32': return Float32Array;
      case 'i32': return Int32Array;
      case 'u32': return Uint32Array;
      default: return Uint8Array;
    }
  }
  
  const createPrimitiveView = (type: string, buffer: ArrayBuffer, offset: number, size: number): TypedArray => {      
    console.log("primitive size", size)
    const AT = getArrayType(type);
    return new AT(buffer, offset, size / AT.BYTES_PER_ELEMENT);
  }
  
  const createTemplateView = (template: TemplateType['template'], buffer: ArrayBuffer, offset: number): TypedArray => {
    // For templates like vec2, vec3, vec4, return appropriate typed array
    const AT = getArrayType(template.primitive);
    return new AT(buffer, offset, template.size / AT.BYTES_PER_ELEMENT);
  }
  
  const createStructView = (def: StructType, baseOffset: number): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    
    // Create views for each member of the struct
    for (const [name, member] of Object.entries(def.struct.members)) {
      const memberOffset = baseOffset + (member.offset || 0);
      result[name] = createView(member, memberOffset);
    }
    
    return result;
  }
  
  const createArrayView = (def: ArrayType, buffer: ArrayBuffer, baseOffset: number, dynamicSize: number = 1): unknown[] | TypedArray => {
    const element = def.array.element;
    const count = def.array.count != 0 ? def.array.count : dynamicSize;
    const stride = def.array.stride || element.size;
    
    // If the array elements are primitives and we know the stride, we can optimize
    if ('primitive' in element && stride === element.size) {
      // For simple arrays of primitives, return a single typed array
      return createPrimitiveView(element.primitive, buffer, baseOffset, count * stride);
    }
    
    // For arrays of more complex types or with padding between elements
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
      const elementOffset = baseOffset + (i * stride);
      result[i] = createView(element, elementOffset);
    }
    
    return result;
  }
  
  // Main view object for the data
  const view = createView(variable);

  console.log(view);
  
  // Get function that retrieves values from the view
  const getValue = (viewObj: any, def: VariableType): unknown => {
    if (!viewObj) return null;
    
    // Handle primitive types
    if ('primitive' in def) {
      return viewObj.length > 1 ? Array.from(viewObj) : viewObj[0];
    }
    
    // Handle template types (vec2, vec3, etc.)
    if ('template' in def) {
      return Array.from(viewObj);
    }
    
    // Handle struct types
    if ('struct' in def) {
      const result: Record<string, unknown> = {};
      for (const [name, member] of Object.entries(def.struct.members)) {
        result[name] = getValue(viewObj[name], member);
      }
      return result;
    }
    
    // Handle array types
    if ('array' in def) {
      if (Array.isArray(viewObj)) {
        return viewObj.map((item) => getValue(item, def.array.element));
      } else {
        // It's a single typed array for primitive types
        return Array.from(viewObj);
      }
    }
    
    return null;
  }
  
  // Set function that applies values to the view
  const setValue = (viewObj: any, def: VariableType, data: unknown): void => {
    if (!viewObj || data === undefined) return;
    
    // Handle primitive types
    if ('primitive' in def) {
      if (Array.isArray(data) && viewObj.length > 1) {
        viewObj.set(data);
      } else {
        viewObj[0] = Number(data);
      }
      return;
    }
    
    // Handle template types (vec2, vec3, etc.)
    if ('template' in def) {
      if (Array.isArray(data)) {
        const length = Math.min(viewObj.length, data.length);
        for (let i = 0; i < length; i++) {
          viewObj[i] = Number(data[i]);
        }
      }
      return;
    }
    
    // Handle struct types
    if ('struct' in def && typeof data === 'object' && data !== null) {
      for (const [name, member] of Object.entries(def.struct.members)) {
        if (name in data) {
          setValue(viewObj[name], member, (data as Record<string, unknown>)[name]);
        }
      }
      return;
    }
    
    // Handle array types
    if ('array' in def && Array.isArray(data)) {
      if (Array.isArray(viewObj)) {
        const length = Math.min(viewObj.length, data.length);
        for (let i = 0; i < length; i++) {
          setValue(viewObj[i], def.array.element, data[i]);
        }
      } else {
        // It's a single typed array for primitive types
        viewObj.set(data.slice(0, viewObj.length));
      }
      return;
    }
  }
  
  // Update function to replace the buffer content
  const updateBuffer = (newBuffer: ArrayBuffer): void => {
    const newData = new Uint8Array(newBuffer);
    const target = new Uint8Array(buffer);
    target.set(newData.slice(0, Math.min(newData.length, target.length)));
  }
  
  return {
    buffer,
    set: (data: unknown) => setValue(view, variable, data),
    get: () => getValue(view, variable),
    update: updateBuffer
  };
}

  
const makeDefinitions = (uniforms: VariableInfo[]): Record<string, Variable> => {
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
      let innerElementSize: number;

      /*
      if (elementSize && typeInfo.count > 0) {
        // If we know the outer element size and count, we can derive inner element size
        innerElementSize = elementSize / typeInfo.count;
      } else {
        // Otherwise use a default size based on the inner element type
        innerElementSize = 4; // Default to size of primitive types
      }
      */
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
    } else {
      // It's a primitive type
      return {
        ...baseInfo,
        primitive: variableInfo.type.name
      } as PrimitiveType;
    }
  }
    
  for (const uniform of uniforms) {
    result[uniform.name] = makeDefinitionType(uniform) as Variable;
  }
  
  return result;
}
  
  



// Example usage with types

const uniformVariables = makeDefinitions(reflect2.uniforms);
const storageVariables = makeDefinitions(reflect2.storage.filter( s => s.resourceType === 1));
console.log(reflect2.storage)
//const uniBuffer = makeBufferView(uniformVariables.uni);
const sysBuffer = makeBufferView(uniformVariables.sys);

//const currentBuffer = makeBufferView(storageVariables.current, 16);

//console.log(JSON.stringify(uniformVariables, null, 2));
//console.log(JSON.stringify(storageVariables, null, 2));
// TypeScript will know the structure and provide appropriate intellisense
/*uniBuffer.set({
  frame:2,
  size: [800, 600],
  amplitude: 1.0,
  frequency: 2.0,
  samples: [1.0, 2.2, 3.0],
  colors: [
    [1.2, 0, 0, 1],
    [0, 1.2, 0, 1],
    [0, 0, 1, 1.2]
  ],
  osc: [
    { power: 1.0, position: [100, 200] },
    { power: 2.0, position: [300, 400] },
    { power: 3.0, position: [500, 600] }
  ],
  cube: [
    [[1.2,0.1],[0.1,1.2]],
    [[1.3,0.1],[0.1,1.3]],
    [[1.4,0.1],[0.1,1.4]]
  ]
});
*/
sysBuffer.set({
  frame:2,
  mouse: [0.2, 0.3, 0.4, 0.5],
  resolution: [800,600],
});

//currentBuffer.set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);

//const values = uniBuffer.get();
//console.log(values);

const valuesSys = sysBuffer.get();
//console.log(valuesSys);

//const valuesCurrent = currentBuffer.get();
//console.log(valuesCurrent);

//console.log(r)
const samplers = reflect2.samplers.map( s => ({ name: s.name, group: s.group, binding: s.binding }))
const textures = reflect2.textures.map( t => ({ name: t.name, group: t.group, binding: t.binding }))
                .concat( reflect2.storage.filter( s => s.resourceType === 4).map( t => ({ name: t.name, group: t.group, binding: t.binding })))
console.log("texture",textures)

    const primitiveTypeName = (type: TypeInfo | null): string => {
        if (type instanceof ArrayInfo) return primitiveTypeName(type.format);
        if (type instanceof TemplateInfo) return primitiveTypeName(type.format);
        return type!.name;
    }
    const sizeType = (type: TypeInfo | null, size:number = 0): number => {
        if (type instanceof ArrayInfo) return sizeType(type.format, type.count);
        if (type instanceof TemplateInfo) return sizeType(type.format, type.name === 'vec4' ? 4 : type.name === 'vec3' ?  3 : type.name === 'vec2' ? 2 : 1 );
        // we assume only the primitives types u32, i32 and f32, so all 4 bytes 
        return size * 4;
    }

const entries = {
    ...(reflect2.entry.vertex[0] ? 
    {
        vertex: {
        name: reflect2.entry.vertex[0].name,
        inputs: reflect2.entry.vertex[0].inputs.map( i => 
            ({ name: i.name, location: i.location,  type: primitiveTypeName(i.type), size: sizeType(i.type)}))
        }
    } : undefined),
    ...(reflect2.entry.fragment[0] ? {
        fragment: {
            name: reflect2.entry.fragment[0].name
        },
    } : undefined),
    ...(reflect2.entry.compute ? {
        compute:  reflect2.entry.compute.map( c => ({ name: c.name }))
    } : undefined)
}

//const entries = {}

const result:Definition = {
    samplers: samplers,
    textures: textures,
    entries: entries,
    uniforms: uniformVariables,
    storages: storageVariables,
    bindGroupLength: reflect2.getBindGroups()[0].length  
}

//console.log(JSON.stringify(result, null, 2));

