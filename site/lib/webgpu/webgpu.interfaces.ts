export interface WGPUState {
    canvas: HTMLCanvasElement;
    context: GPUCanvasContext;
    adapter: GPUAdapter;
    device: GPUDevice;
    geometry?: Geometry;
    uniforms?: Array<Uniform>;
    pipelines?: Pipelines;
    storages?: Storages;
    clearColor?: {r:number,g:number,b:number,a:number};
    spec?: () => WGPUSpec;
    wgslSpec?: WGPUSpec

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
    size: number;
    view: BufferView;
}

export interface VertexStorage {
    buffer: GPUBuffer;
}

export interface Storages {
    storages: Array<Storage>;
    readStorages: Array<ReadStorage>;
    vertexStorages: Array<VertexStorage>;
}

export interface Compute {
    pipeline: GPUComputePipeline;
    workgroups: [number,number,number];
    instances: number;
}

export interface Pipelines {
    render?: GPURenderPipeline;
    compute: Compute[];
    computeGroupCount: number;
    bindings: (index:number) => GPUBindGroup;
}

export interface VAttr {
    data?: Array<number>;
    attributes: Array<string>;
    instances?: number;
}

export interface WGPUSpec {
    code: string;
    geometry?: { vertex: VAttr, instance?: VAttr };
    uniforms?: any;
    storages?: Array<{ name: string, size: number, data?: Array<any>, read?:boolean, vertex?:boolean, }>;
    samplers?: Array<{ name : string, magFilter: string, minFilter: string }>;
    textures?: Array<{ name : string, data: ImageBitmap | HTMLVideoElement | undefined}>;
    compute?: Array<{ name: string, workgroups: [number,number,number], instances?: number }>;
    computeGroupCount?: number;
    clearColor?: {r:number,g:number,b:number,a:number}
    bindings?: Array<Array<number>>;
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
