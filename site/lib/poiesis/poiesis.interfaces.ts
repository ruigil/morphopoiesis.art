import { Buffer } from "node:buffer";

export interface PoiesisContext {
    build: (a: PSpec) => PoiesisInstance
}

export interface PoiesisInstance {
    addBufferListeners: (listeners: BufferListener[]) => void
    run: (unis?: Record<string,unknown>, frame?:number) => Promise<void>
}

export interface PoiesisState {
    context: GPUCanvasContext;
    device: GPUDevice;
    geometry?: Geometry;
    uniforms?: Array<Uniform>;
    pipelines?: Pipelines;
    storages?: StorageTypes;
    clearColor?: {r:number,g:number,b:number,a:number};
    wgslSpec?: PSpec
    bufferListeners?: Array<BufferListener>;
}

export interface Geometry {
    vertexBuffer?: GPUBuffer 
    vertexCount: number;
    vertexBufferLayout?: GPUVertexBufferLayout[];
    instances?: number;
    instanceBuffer?: GPUBuffer;
}

export interface Resource {
    binding: number;
    resource: GPUBufferBinding | GPUSampler | GPUTextureView | GPUExternalTexture;
    type: GPUBufferBindingType | "sampler" | "texture" | "external_texture" | "storage_texture";
}

export interface Uniform extends Resource {
    name: string
    view: BufferView;
}

export interface Storage extends Resource {
}

export interface Sampler extends Resource {
}

export interface Texture extends Resource {
    video?: HTMLVideoElement;
}

export interface ReadStorage  {
    name: string;
    listener?: BufferListener;
    srcBuffer: GPUBuffer;
    dstBuffer: GPUBuffer;
    view: BufferView;
}

export interface VertexStorage {
    buffer: GPUBuffer;
}

export interface StorageTypes {
    storages: Array<Storage>;
    readStorages: Array<ReadStorage>;
    vertexStorages: Array<VertexStorage>;
}

export interface Compute {
    pipeline: GPUComputePipeline;
    workgroups: [number,number,number];
    instances: number;
}

export interface ComputeGroupPipeline {
    computeGroup: Compute[];
    computeGroupCount: number;
}

export interface Pipelines {
    render?: GPURenderPipeline;
    compute?: ComputeGroupPipeline;
    bindings: (index:number) => GPUBindGroup;
}

export interface BufferListener {
    name: string,
    onRead: (view: BufferView) => void;
}

export interface VAttr {
    data?: Array<number>;
    attributes: Array<string>;
    instances?: number;
}


export interface PSpec {
    code: string;
    defs: Definitions;
    uniforms?: (f:number) => Record<string,any>;
    mouse?: (x:number,y:number,frame:number) => void;
    geometry?: { vertex: VAttr, instance?: VAttr };
    storages?: Array<{ name: string, size: number, data?: Array<any>, read?:boolean, vertex?:boolean, }>;
    samplers?: Array<{ name : string, magFilter: string, minFilter: string }>;
    textures?: Array<{ name : string, data: ImageBitmap | HTMLVideoElement | undefined, storage?: boolean}>;
    computes?: Array<{ name: string, workgroups: [number,number,number], instances?: number, constants: unknown }>;
    computeGroupCount?: number;
    clearColor?: { r:number, g:number, b:number, a:number }
    bindings?: Array<Array<number>>;
    unipane?: { get: () => unknown, map: (u:unknown) => unknown };
}


// controls for the draw loop
export interface Controls {
    play?: boolean;
    reset?: boolean;
    delta?: number;
}

// listener for the fps
export interface FPSListener {
    onFPS: (fps: { fps: string, time: string, frame: number}) => void;
}

export interface BaseVariable {
    size: number;
    offset?: number;
    group?: number;
    binding?: number;
    access?: string;
}
  
  
  // For primitive types (f32, i32, u32, etc.)
export interface PrimitiveType extends BaseVariable {
    primitive: string;
}
  
  // For template types (vec2, vec3, mat4, etc.)
export interface TemplateType extends BaseVariable {
    template: {
      name: string;
      size: number;
      primitive: string;
    };
}
  
  // For struct types
export interface StructType extends BaseVariable {
    struct: {
      name: string;
      members: Record<string, VariableType>;
    };
}
  
  // For array types
export interface ArrayType extends BaseVariable {
    array: {
      count: number;
      stride?: number;
      element: VariableType;
    };
}
  
  // Union type for all structured types
export type VariableType = PrimitiveType | TemplateType | StructType | ArrayType;
  
  // Union type for top-level variables
export type Variable = BaseVariable & VariableType;
  
  // Type for the entire reflection result
export interface Definitions {
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
      computes?: { name: string }[];
    };
    bindGroupLength?: number;
  }
  
  // Now update our buffer view interface to use these types
export interface BufferView {
    buffer: ArrayBuffer;
    set: (data: unknown) => void;
    get: () => unknown;
    update: (newBuffer: ArrayBuffer) => void;
  }
  
export type TypedArray = Float32Array | Int32Array | Uint32Array | Uint8Array;  
  