export interface WGPUState {
    canvas: HTMLCanvasElement;
    context: GPUCanvasContext;
    adapter: GPUAdapter;
    device: GPUDevice;
    clearValue?: GPUColor;
    geometry?: Geometry;
    uniforms?: Array<Uniform>;
    pipelines?: Pipelines;
    spec?: WGLSLSpec;
    storages?: Storages;
    clearColor?: {r:number,g:number,b:number,a:number};

    fpsListeners?: Array<FPSListener>;
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
    buffer: GPUBuffer;
    type: GPUBufferBindingType;
}

export interface Uniform extends Resource {
    uniValues: ArrayBuffer;
    uniViews: any;
}

export interface Storage extends Resource {
}

export interface ReadStorage  {
    srcBuffer: GPUBuffer;
    dstBuffer: GPUBuffer;
    size: number;
    name: string;
}

export interface VertexStorage {
    buffer: GPUBuffer;
}

export interface Storages {
    storages: Array<Storage>;
    readStorages: Array<ReadStorage>;
    vertexStorages: Array<VertexStorage>;
}

export interface Pipelines {
    render?: GPURenderPipeline;
    compute?: GPUComputePipeline;
    bindGroup: Array<GPUBindGroup>;
    workgroupCount?: Array<number>;
}

export interface Controls {
    play?: boolean;
    reset?: boolean;
    frames?: number;
}

export interface VAttr {
    data?: Array<number>;
    attributes: Array<string>;
    instances?: number;
}

export interface WGLSLSpec {
    shader: string;
    //geometry?: { vertices: number[], instances?: number};
    geometry?: { vertex: VAttr, instance?: VAttr };

    uniforms?: any;
    storage?: { name: string, size: number, data?: number[], read?:boolean, vertex?:boolean, }[];
    workgroupCount?: Array<number>;
    computeCount?: number;
    clearColor?: {r:number,g:number,b:number,a:number}
    bindings?: { groups: Array<Array<number>>, currentGroup: (frame:number) => number };
}

export interface FPSListener {
    onFPS: (fps: { fps: string, time: string}) => void;
}

export interface BufferListener {
    onRead: (buffer: Array<{ name: string, buffer: ArrayBuffer }>) => void;
}
