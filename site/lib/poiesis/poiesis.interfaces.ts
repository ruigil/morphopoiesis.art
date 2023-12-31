export interface PoiesisState {
    canvas: HTMLCanvasElement;
    context: GPUCanvasContext;
    adapter: GPUAdapter;
    device: GPUDevice;
    geometry?: Geometry;
    uniforms?: Array<Uniform>;
    pipelines?: Pipelines;
    storages?: StorageTypes;
    clearColor?: {r:number,g:number,b:number,a:number};
    spec?: () => PSpec;
    wgslSpec?: PSpec
    bufferListeners?: Array<BufferListener>;
}

export interface Geometry {
    vertexBuffer: GPUBuffer;
    vertexCount: number;
    vertexBufferLayout?: GPUVertexBufferLayout[];
    instances?: number;
    instanceBuffer?: GPUBuffer | undefined;
}

export interface Resource {
    binding: number;
    resource: GPUBufferBinding | GPUSampler | GPUTextureView | GPUExternalTexture;
    type: GPUBufferBindingType | "sampler" | "texture" | "external_texture";
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

export interface BufferView {
    name: string;
    buffer: ArrayBuffer;
    set: (data:any) => void;
    get: () => any;
    update: (buffer: ArrayBuffer) => void;
}

export interface BufferListener {
    onRead: (buffer: Array<BufferView>) => void;
}

export interface VAttr {
    data?: Array<number>;
    attributes: Array<string>;
    instances?: number;
}

export interface PSpec {
    code: string;
    uniforms?: any;
    geometry?: { vertex: VAttr, instance?: VAttr };
    storages?: Array<{ name: string, size: number, data?: Array<any>, read?:boolean, vertex?:boolean, }>;
    samplers?: Array<{ name : string, magFilter: string, minFilter: string }>;
    textures?: Array<{ name : string, data: ImageBitmap | HTMLVideoElement | undefined}>;
    computes?: Array<{ name: string, workgroups: [number,number,number], instances?: number }>;
    computeGroupCount?: number;
    clearColor?: { r:number, g:number, b:number, a:number}
    bindings?: Array<Array<number>>;
}


// controls for the draw loop
export interface Controls {
    play?: boolean;
    reset?: boolean;
    delta?: number;
}

// listener for the fps
export interface FPSListener {
    onFPS: (fps: { fps: string, time: string}) => void;
}
