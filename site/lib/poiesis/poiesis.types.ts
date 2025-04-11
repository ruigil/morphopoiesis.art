export type PoiesisContext = {
  build: (a: PSpec) => PoiesisInstance
}

export type PoiesisInstance = {
  addBufferListeners: (listeners: BufferListener[]) => void
  run: (unis?: Record<string, unknown>, frame?: number) => Promise<void>
}

export type PoiesisState = {
  context: GPUCanvasContext;
  device: GPUDevice;
  geometry?: Geometry;
  uniforms?: Array<Uniform>;
  pipelines?: Pipelines;
  storages?: StorageTypes;
  clearColor?: { r: number, g: number, b: number, a: number };
  wgslSpec?: PSpec
  bufferListeners?: Array<BufferListener>;
}

export type Geometry = {
  vertexBuffer?: GPUBuffer
  vertexCount: number;
  vertexBufferLayout?: GPUVertexBufferLayout[];
  instances?: number;
  instanceBuffer?: GPUBuffer;
}

export type Resource = {
  binding: number;
  resource: GPUBufferBinding | GPUSampler | GPUTextureView | GPUExternalTexture;
  type: GPUBufferBindingType | "sampler" | "texture" | "external_texture" | "storage_texture";
}

export type Uniform = Resource & {
  name: string
  view: BufferView;
};

export type Storage = Resource;

export type Sampler = Resource

export type Texture = Resource & {
  video?: HTMLVideoElement;
}

export type ReadStorage = {
  name: string;
  listener?: BufferListener;
  srcBuffer: GPUBuffer;
  dstBuffer: GPUBuffer;
  view: BufferView;
}

export type VertexStorage = {
  buffer: GPUBuffer;
}

export type StorageTypes = {
  storages: Array<Storage>;
  readStorages: Array<ReadStorage>;
  vertexStorages: Array<VertexStorage>;
}

export type Compute = {
  pipeline: GPUComputePipeline;
  workgroups: [number, number, number];
  instances: number;
}

export type ComputeGroupPipeline = {
  computeGroup: Compute[];
  computeGroupCount: number;
}

export type Pipelines = {
  render?: GPURenderPipeline;
  compute?: ComputeGroupPipeline;
  bindings: (index: number) => GPUBindGroup;
}

export type BufferListener = {
  name: string,
  onRead: (view: BufferView) => void;
}

export type VAttr = {
  data?: Array<number>;
  attributes: Array<string>;
  instances?: number;
}


export type PSpec = {
  code: string;
  defs: Definitions;
  uniforms?: (frame: number) => Record<string, any>;
  mouse?: (x: number, y: number) => void;
  geometry?: { vertex: VAttr, instance?: VAttr };
  storages?: Array<{ name: string, size: number, data?: Array<any>, read?: boolean, vertex?: boolean, }>;
  samplers?: Array<{ name: string, magFilter: string, minFilter: string }>;
  textures?: Array<{ name: string, data: ImageBitmap | HTMLVideoElement | undefined, storage?: boolean }>;
  computes?: Array<{ name: string, workgroups: [number, number, number], instances?: number, constants?: unknown }>;
  computeGroupCount?: number;
  clearColor?: { r: number, g: number, b: number, a: number }
  bindings?: Array<Array<number>>;
  unipane?: { config: (pane: any, params: any) => void };
  // New properties for enhanced error handling
  label?: string;
  requirements?: {
    features?: string[];
    limits?: Record<string, number>;
  };
}


// controls for the draw loop
export type Controls = {
  play?: boolean;
  reset?: boolean;
  delta?: number;
}

// listener for the fps
export type FPSListener = {
  onFPS: (fps: { fps: string, time: string, frame: number }) => void;
}

export type SpecListener = {
  onSpec: (spec: PSpec) => void;
}

export type BaseVariable = {
  size: number;
  offset?: number;
  group?: number;
  binding?: number;
  access?: string;
}

// For primitive types (f32, i32, u32, etc.)
export type PrimitiveType = BaseVariable & {
  primitive: string;
}

// For template types (vec2, vec3, mat4, etc.)
export type TemplateType = BaseVariable & {
  template: {
    name: string;
    size: number;
    primitive: string;
  };
}

// For struct types
export type StructType = BaseVariable & {
  struct: {
    name: string;
    members: Record<string, VariableType>;
  };
}

// For array types
export type ArrayType = BaseVariable & {
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
export type Definitions = {
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
export type BufferView = {
  buffer: ArrayBuffer;
  set: (data: unknown) => void;
  get: () => unknown;
  update: (newBuffer: ArrayBuffer) => void;
}

export type TypedArray = Float32Array | Int32Array | Uint32Array | Uint8Array;
