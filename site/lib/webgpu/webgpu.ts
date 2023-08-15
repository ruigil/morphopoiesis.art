/// <reference types="./webgpu.d.ts" />

import { ArrayType, TemplateType, Type, WgslReflect } from "./wgsl_reflect.module.js";

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
    storages?: Array<Storage>;

    fpsListeners?: Array<FPSListener>;
    bufferListeners?: Array<BufferListener>;
}

interface Geometry {
    vertexBuffer: GPUBuffer;
    vertexCount: number;
    vertexBufferLayout?: GPUVertexBufferLayout[];
    instances?: number;
    instanceBuffers: GPUBuffer[];
}

interface Resource {
    binding: number;
    buffer: GPUBuffer;
    type: GPUBufferBindingType;
}

interface Uniform extends Resource {
    uniValues: ArrayBuffer;
    uniViews: any;
    //type: GPUBufferBindingType;

}

interface Storage extends Resource {
    //type: GPUBufferBindingType;
    readBuffer?: GPUBuffer;
    size: number;
    name: string;
    vertex: boolean;
}

interface Pipelines {
    render?: GPURenderPipeline;
    compute?: GPUComputePipeline;
    bindGroup: Array<GPUBindGroup>;
    workgroupCount?: Array<number>;
}

interface Controls {
    play?: boolean;
    reset?: boolean;
    frames?: number;
}

interface VAttr {
    data?: Array<number>;
    attributes: Array<string>;
    instances?: number;
}

interface WGLSLSpec {
    shader: string;
    //geometry?: { vertices: number[], instances?: number};
    geometry?: { vertex: VAttr, instance?: VAttr };

    uniforms?: any;
    storage?: { name: string, size: number, data?: number[], read?:boolean, vertex?:boolean, }[];
    workgroupCount?: Array<number>;
    computeCount?: number;
    bindings?: { groups: Array<Array<number>>, currentGroup: (frame:number) => number };
}

interface FPSListener {
    onFPS: (fps: { fps: string, time: string}) => void;
}

interface BufferListener {
    onRead: (buffer: Array<{ name: string, buffer: ArrayBuffer }>) => void;
}

export async function wgsl(name: string) {
    const response = await fetch(name);
    return response.text();
}

export class Utils {
    static square(x: number) {
        return [
        -x, -x, 
        x, -x,
        x,  x,
          
        -x, -x,
        x,  x,
        -x,  x,
        ]
    }
}

export class WGPU {
    canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async init() {
        if (!this.canvas) {
            throw new Error("Canvas is not defined");
        }
        const context = this.canvas.getContext("webgpu") as GPUCanvasContext;
        if (!context) {
            throw new Error("WebGPU not supported on this browser.");
        }
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          throw new Error("No appropriate GPUAdapter found.");
        }

        const device = await adapter.requestDevice();

        // limits
        //console.log("device", device)

        context.configure({
            device: device,
            format: navigator.gpu.getPreferredCanvasFormat(),
        });

        return new WGPUContext({
            canvas: this.canvas,
            context: context,
            adapter: adapter,
            device: device
        })
    }
}

export class WGPUContext {
    private state: WGPUState;
    private observer: ResizeObserver;
    private mouse: Array<number> = [0,0];
    private resolution: Array<number> = [0,0];

    constructor( state: WGPUState) {
        this.state = {...state};
        this.observer = new ResizeObserver((entries) => {
            this.state.canvas.width = entries[0].target.clientWidth;
            this.state.canvas.height = entries[0].target.clientWidth
            this.resolution[0] = entries[0].target.clientWidth;
            this.resolution[1] = entries[0].target.clientHeight;
        });
        this.observer.observe(this.state.canvas)
        this.state.canvas.addEventListener('mousemove', event => {
            this.mouse[0] = event.offsetX/this.state.canvas.clientWidth;
            this.mouse[1] = event.offsetY/this.state.canvas.clientHeight;
        });
    }
    
    private setUniforms( unis: any) {

        this.state.uniforms?.forEach((element,i) => {
            const uviews = element.uniViews;
            //console.log("unis", unis);
            // TODO: implement recursive structures instead of one level
            for (let key in unis) {
                if (!uviews[key]) continue;
                if (unis[key] instanceof Object){
                    for (let subkey in unis[key]) {
                        if (uviews[key][subkey]) {
                            unis[key][subkey][Symbol.iterator] ?
                            uviews[key][subkey].set([...unis[key][subkey]]) :
                            uviews[key][subkey].set([unis[key][subkey]]);
                        }
                    }
                } else {
                    unis[key][Symbol.iterator] ? 
                        uviews[key].set([...unis[key]]) : 
                        uviews[key].set([unis[key]]);
                }
            }
            // copy the values from JavaScript to the GPU
            this.state.device.queue.writeBuffer(
                element.buffer, 0, element.uniValues);
        });
    }

    build(wgslSpec : WGLSLSpec) {
                

        const createShaderModule = (spec: WGLSLSpec) => {
            if (!spec.shader) throw new Error("Shader is not defined");

            return this.state.device.createShaderModule({
                label: "Custom shader",
                code: spec.shader
            });
        }

        const createGeometry = (spec: WGLSLSpec) => {

            const buffersLayout:GPUVertexBufferLayout[] = [];

            // iterate over the inputs of the vertex shader and create the vertex buffer layout with the attributes passed as parameters
            const makeLayout = ( step: GPUVertexStepMode, attrs: Array<string> ):GPUVertexBufferLayout => {
                const type = (format:string,name:string) => `${(format == 'f32' ? 'float32' : 'int32')}x${ name == 'vec2' ? '2' : name == 'vec3' ? '3' : '4'}`;
                const inputs = reflect.entry?.vertex[0].inputs;
                let stride = 0;
                const battrs = inputs.filter( (i:any) => attrs.some( a => a === i.name) && i.locationType === 'location').map( (i:any): GPUVertexAttribute => {                
                    //console.log(i)
                    const attr = {
                        shaderLocation: i.location,
                        offset: stride,
                        format: type(i.type.format.name, i.type.name) as GPUVertexFormat,
                    } 
                    stride += (i.type.name == 'vec2' ? 2 : i.type.name == 'vec3' ? 3 : 4) * 4;
                    return attr;                    
                });
                return {
                    arrayStride: stride,
                    stepMode: step,
                    attributes: battrs
                }
            }

            const vertices = new Float32Array(spec.geometry && spec.geometry.vertex.data || Utils.square(1.) ) 
            // there is always a vertex buffer
            buffersLayout.push(makeLayout("vertex",spec.geometry?.vertex.attributes || ["pos"]))
            const vertexBuffer = this.state.device.createBuffer({
                label: "Geometry vertices",
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            this.state.device.queue.writeBuffer(vertexBuffer, 0, vertices);

            // if there is an instance buffer, create the buffer layout
            let instancesBuffer:Array<GPUBuffer> = [];
            if (spec.geometry && spec.geometry.instance) {
                buffersLayout.push(makeLayout("instance",spec.geometry?.instance.attributes))
                // if there is data create the vertex buffer
                if (spec.geometry.instance.data) {
                    const vertices = new Float32Array(spec.geometry && spec.geometry.instance.data )

                    instancesBuffer = [this.state.device.createBuffer({
                        label: "Geometry instance",
                        size: vertices.byteLength,
                        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                    })];
                    this.state.device.queue.writeBuffer(vertexBuffer, 0, vertices);     
                }
            }

            // this assumes that the vertex shader has a single input of type vec2f at location 0
            /*
            const vertexBufferLayout:GPUVertexBufferLayout = {
                arrayStride: 8,
                attributes: [{
                    format: "float32x2",
                    offset: 0,
                    shaderLocation: 0, // Position, see vertex shader
                }],
            };
            */
            console.log("buffers layouts",buffersLayout);
            const instancesCount = spec.geometry && (spec.geometry.vertex.instances || spec.geometry.instance?.instances) || 1;
            console.log(instancesCount);
            return {
                vertices: vertices,
                vertexBuffer: vertexBuffer,
                vertexCount: vertices.length / 2,
                vertexBufferLayout: buffersLayout,
                instances: instancesCount,
                instanceBuffers: instancesBuffer
            }
        }

        const createUniforms = (spec: WGLSLSpec) => {

            const isFloat = (type: string) => { return type.endsWith('f') || type.startsWith('f') }

            const uniforms = spec.uniforms || {};
            const uniformsBinding:Array<Uniform> = [];
            // iteration over the uniforms
            for (let i = 0; i < reflect.uniforms.length; i++) {
                const info = reflect.getUniformBufferInfo(reflect.uniforms[i]) as any;
                if (!info) throw new Error("Uniform not found");

                //console.log("info",info);
                const uniformArray = new ArrayBuffer(info!.size);
                const uniformViews:any = {};


                if (info.members) {
                    uniformViews[info.name] = {};
                    const uni = uniforms[info.name] || {};
                    for (let i=0; i< info!.members.length; i++) {
                        const member = info.members[i];
                        const size = member.size / 4;
                        const value = uni[member.name] || Array(size).fill(0);
                        const type = member.type.name;
                        //console.log("member", member.name, "type", type, "size", size, "value", value)
                        const offset = member.offset;
                        uniformViews[info.name][member.name] = isFloat(type) ? new Float32Array(uniformArray, offset, size) : new Uint32Array(uniformArray, offset, size);
                        value[Symbol.iterator] ? 
                            uniformViews[info.name][member.name].set(value) : 
                            uniformViews[info.name][member.name].set([value]);
                    }
                } else {
                    const size = info!.size / 4;
                    const value = uniforms[info.name] || Array(size).fill(0);
                    const type = info.type.name;
                    const offset = 0;
                    uniformViews[info.name] = isFloat(type) ? new Float32Array(uniformArray, offset, size) : new Uint32Array(uniformArray, offset, size);
                    uniformViews[info.name].set(value);
                }
                
                
                const uniformBuffer = this.state.device.createBuffer({
                    label: "uniforms",
                    size: uniformArray.byteLength,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });
                this.state.device.queue.writeBuffer(uniformBuffer, 0, uniformArray);
                uniformsBinding.push({
                    uniValues: uniformArray,
                    uniViews: uniformViews,
                    buffer: uniformBuffer,
                    binding: reflect.uniforms[i].binding,
                    type: "uniform"
                })
            }

            //console.log("uniforms",uniformsBinding);

            return uniformsBinding
        }

        const createStorage = (spec: WGLSLSpec) => {
            const stateStorage:Storage[] = new Array<Storage>();

            const storage = (name:string)=> {
                return spec.storage ? spec.storage.find((element) => element.name === name) : undefined;
            }
            const sizeFormat = (type: Type) : {size: number, format: string} => {
                const formats:Record<string,number> = {
                    f32: 4,
                    u32: 4,
                    i32: 4,
                }
                const sformats:Record<string,string> = {
                    f32: 'float',
                    u32: 'uint',
                    i32: 'int',
                }
                const sizes:Record<string,number> = {
                    vec2: 2,
                    vec3: 4, // is it ?
                    vec4: 4,
                }

                //console.log(type)
                if (type instanceof TemplateType) {
                    //console.log("type", type.name, "format",type.format.name)
                    return { size: formats[type.format.name] * sizes[type.name], format: sformats[type.format.name] };    
                }
                if (type instanceof ArrayType) {
                    //console.log("type", type.name, "format",type.format.name)
                    if (type.format.name.endsWith('32')) return { size: formats[type.format.name], format: sformats[type.format.name] };
                    return sizeFormat(type.format);  
                }

                const struct = reflect.structs.find( e => e.name == type.name);
                //console.log("format", type.name, "struct", struct)

                const sum = struct.members.reduce((acc:number, curr:any) => { 
                    return acc + sizeFormat(curr.type).size 
                }, 0);
                //console.log("sum",sum)                
                return { size: sum, format: 'float' } // float ?
            }

            for(let i = 0; i < reflect.storage.length; i++) {
                const node = reflect.storage[i].node;
                //console.log("node",node);
                const sto = storage(node.name);
                if (!sto) throw new Error(`Storage spec for ${node.name} not found`);
                const size = sto.size;
                // gives a byte size and format for the type present in the storage buffer
                const sf = sizeFormat(node.type);
                console.log(node.name, size, sf.size, sf.format)
                const storageBuffer = this.state.device.createBuffer({
                    label: "Storage Buffer",
                    size: size * sf.size,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | (sto.read ? GPUBufferUsage.COPY_SRC : 0) | ((sto.vertex ? GPUBufferUsage.VERTEX : 0)),
                });
                const readBuffer = sto.read ? this.state.device.createBuffer({
                        label: sto.name + " Read Buffer",
                        size: size * sf.size,
                        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
                }) : undefined;
                
                const s = size * (sf.size/4);
                const data = sto.data ? sto.data : new Array(s).fill(0);
                const stArray = sf.format === 'float' ? new Float32Array(s) : sf.format === 'uint' ? new Uint32Array(s) : new Int32Array(s);                
                stArray.set(data);
                this.state.device.queue.writeBuffer(storageBuffer, 0, stArray);
                
                stateStorage.push({
                    binding: reflect.storage[i].binding,
                    buffer: storageBuffer,
                    readBuffer: readBuffer,
                    size: size * sf.size, // for read buffer copy size
                    name: node.name, // for notifying listeners of read 
                    vertex: sto.vertex || false,
                    type: node.access === "read_write" ? "storage" :"read-only-storage"  
                });

            }
            return stateStorage;
        }

        const createBindGroupLayout = (resources: Resource[]) => {
            const entries:Array<GPUBindGroupLayoutEntry> = [];

            resources.forEach((element,i) => {
                let visibility = 0;
                switch (element.type) {
                    case "uniform": visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE; break;
                    case "storage": visibility = GPUShaderStage.COMPUTE; break;
                    case "read-only-storage": visibility = GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE; break;
                }

                entries.push({
                    binding: element.binding,
                    visibility: visibility,
                    buffer: { type: element.type }
                }); 
            });
            //console.log("entries",entries)
            // Create the bind group layout and pipeline layout.
            // this is needed because we use two different piplines and they must share the same layout
            // to be able to reuse the same variables and uniforms
            const bindGroupLayout = this.state.device.createBindGroupLayout({
                label: "Bind Group Layout",
                entries: entries
            });
            return bindGroupLayout;
        }

        const createBindGroups = (spec:WGLSLSpec, resources:Resource[]) => {
            // there is something wrong with the bindgroups. Thex should be create based on the bindings defined in the shader
            const buffers = new Array<any>(reflect.getBindGroups()[0].length)
            //console.log("length ",reflect.getBindGroups()[0].length)
            //console.log("resources",resources)
            resources.forEach((element,i) => {
                buffers[element.binding] = element.buffer;
            });

            const bindingsCount = resources.length;
            const bindingGroupsCount = spec.bindings?.groups?.length || 1;
            const bindingGroups = new Array<GPUBindGroup>(bindingGroupsCount);
            for (let i = 0; i < bindingGroupsCount; i++) {
                const entries:Array<GPUBindGroupEntry> = [];
                for (let j = 0; j < bindingsCount; j++) {
                    // if bindings are not defined, use the default order
                    const buff = buffers[spec.bindings?.groups[i][j] || j];
                    if (!buff) throw new Error("Binding defined in groups not found");
                    entries.push({
                        binding: resources[j].binding,
                        resource: { buffer: buff } 
                    })
                }
                bindingGroups[i] = this.state.device.createBindGroup({  
                    label: `Bind Group ${i}`,
                    layout: bindGroupLayout,
                    entries: entries,  
                })
            }
            return bindingGroups;
        }

        const createPipelineLayout = (bindGroupLayout: GPUBindGroupLayout) => {
            return this.state.device.createPipelineLayout({
                label: "Pipeline Layout",
                bindGroupLayouts: [ bindGroupLayout ],
            });
        }

        const createComputePipeline = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout) => {
            const entryPoint = reflect.entry?.compute[0]?.node?.name;
            
            return entryPoint ? this.state.device.createComputePipeline({
                label: "Compute pipeline",
                layout: pipelineLayout,
                compute: {
                  module: shaderModule,
                  entryPoint: entryPoint,
                }
            }) : undefined;
        }

        const createRenderPipeline = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout) => {
            const vertexEntryPoint = reflect.entry?.vertex[0].node.name;
            const fragmentEntryPoint = reflect.entry?.fragment[0].node.name;
            return this.state.device.createRenderPipeline({
                label: "Render pipeline",
                layout: pipelineLayout,
                vertex: {
                  module: shaderModule,
                  entryPoint: vertexEntryPoint,
                  buffers: geometry.vertexBufferLayout
                },
                fragment: {
                  module: shaderModule,
                  entryPoint: fragmentEntryPoint,
                  targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                  }]
                }
            });
        }

        const reflect = new WgslReflect(wgslSpec.shader);

        const shaderModule = createShaderModule(wgslSpec);
        const geometry = createGeometry(wgslSpec);
        const uniforms = createUniforms(wgslSpec);
        const storages = createStorage(wgslSpec);
        // we assume that instance buffers are in the same order as the bind groups
        geometry.instanceBuffers = storages.filter(s => s.vertex).map( s => s.buffer )

        const resources = [...uniforms, ...storages];
        
        const bindGroupLayout = createBindGroupLayout(resources);
        const bindGroups = createBindGroups(wgslSpec, resources);

        const pipelineLayout = createPipelineLayout(bindGroupLayout);

        const compute = (reflect.entry?.compute && reflect.entry?.compute.length > 0 ) 
            
        if ((compute) && (!wgslSpec.workgroupCount))
            throw new Error("You have a compute shader but 'workgroupCount' is not defined.");

        const computePipeline = compute ? 
            createComputePipeline(shaderModule, pipelineLayout) : 
            undefined;

        const render = 
            reflect.entry?.vertex && 
            reflect.entry?.fragment && 
            reflect.entry?.vertex.length > 0 && 
            reflect.entry?.fragment.length > 0;  
        
        const renderPipeline  =  render ?
            createRenderPipeline(shaderModule, pipelineLayout):
            undefined;
      
        return new WGPUContext({
            ...this.state,
            pipelines: {
                render: renderPipeline,
                compute: computePipeline,
                bindGroup: bindGroups,
                workgroupCount: wgslSpec.workgroupCount
            },
            geometry: geometry,
            uniforms: uniforms,
            storages: storages,
            spec: wgslSpec
        });
    }

    addFPSListener(listener: FPSListener) {
            
        const ls = this.state.fpsListeners ? [...this.state.fpsListeners, listener] : [listener];
        return new WGPUContext({
            ...this.state,
            fpsListeners: ls
        });
    }

    addBufferListener(listener: BufferListener) {
            
        const bls = this.state.bufferListeners ? [...this.state.bufferListeners, listener] : [listener];
        return new WGPUContext({
            ...this.state,
            bufferListeners: bls
        });
    }

    draw(unis?:any, controls?: Controls ){
        let frame = 0;
        let start = performance.now();
        let intid = 0;
        let elapsed = 0;
        let idle = 0;
        const crtl = controls || { play: true, reset: false, frames: 0 };

        const renderDescriptor:GPURenderPassDescriptor = {
            colorAttachments: [{
                view: this.state.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: {r: 0.0, g: 0.0, b: 0.4, a: 1.0},
                storeOp: "store",
             }]
        }
        const fps = () => {
            this.state.fpsListeners && 
            this.state.fpsListeners.forEach((listener) => {  
                listener.onFPS({ fps: (frame / elapsed).toFixed(2), time: elapsed.toFixed(1)} );
            });
        }

        const readBuffers = async ()=>{
            if (this.state.bufferListeners) {
                const buffers = this.state.storages?.filter((element) => element.readBuffer);
                if (!buffers || buffers.length == 0) return;
                await Promise.all(buffers.map( buff => buff.readBuffer?.mapAsync(GPUMapMode.READ)));
                this.state.bufferListeners.forEach((listener) => {
                    const data = buffers.map(s=> ({ name: s.name, buffer: new Float32Array(s.readBuffer!.getMappedRange())}));
                    listener.onRead( data );
                    buffers.forEach(s=> s.readBuffer!.unmap() );
                });
            } 
        }
        const render = async () => {
            if (crtl.reset) {
                frame = 0;
                start = performance.now();
                elapsed = 0;
                idle = 0;
                crtl.frames = 1;
            }
            if (crtl.play && !intid) {
                intid = setInterval(() => fps(), 1000);
            }
            if (!crtl.play && intid) {
                clearInterval(intid);
                intid = 0;
            }
            // && ((frame % 61) === 0)
            if (((crtl.play) || (crtl.frames! > 0)) ) {
                const bindGroup = this.state.spec?.bindings ? this.state.spec.bindings.currentGroup(frame) : 0;

                const encoder = this.state.device.createCommandEncoder();
                //console.log(unis)
                this.setUniforms({ sys: { frame: frame, time: elapsed, mouse: this.mouse, resolution: this.resolution }, ...unis });
     
                if (this.state.pipelines!.render) {
                    // @ts-ignore
                    renderDescriptor.colorAttachments[0].view = this.state.context.getCurrentTexture().createView();
                    const pass = encoder.beginRenderPass(renderDescriptor);
                    
                    pass.setPipeline(this.state.pipelines!.render);
                    pass.setVertexBuffer(0, this.state.geometry!.vertexBuffer);
                    this.state.geometry!.instanceBuffers.length > 0 && pass.setVertexBuffer(1, this.state.geometry!.instanceBuffers[bindGroup])
                    elapsed = ((performance.now() - start) / 1000) - idle;
            
         
                    pass.setBindGroup(0, this.state.pipelines!.bindGroup[bindGroup]);
                    pass.draw(this.state.geometry!.vertexCount, this.state.geometry!.instances || 1 );
        
                    pass.end();    
                }
                
                if (this.state.pipelines!.compute) {
                    for (let i = 0; i < (this.state.spec?.computeCount || 1); i++) {
                        const bg = this.state.spec?.bindings ? this.state.spec.bindings.currentGroup(frame + i) : 0
                        const computePass = encoder.beginComputePass();
                        computePass.setPipeline(this.state.pipelines!.compute);
                        computePass.setBindGroup(0, this.state.pipelines!.bindGroup[bg]);
            
                        const wgc = this.state.pipelines?.workgroupCount || [1,1,1];
                        computePass.dispatchWorkgroups(wgc[0], wgc[1], wgc[2]);
            
                        computePass.end();    
                    }
                }

                if (this.state.storages) {
                    this.state.storages.forEach((element,i) => {
                        if (element.readBuffer) {
                            //console.log(element.size)
                            encoder.copyBufferToBuffer(element.buffer, 0, element.readBuffer, 0, element.size);
                        }
                    });
                }
    
                this.state.device.queue.submit([encoder.finish()]);

                await readBuffers();

                if ((crtl.frames! > 0) && (crtl.reset)) {
                    crtl.reset = false;
                    crtl.frames = 0;
                }
                if ((crtl.frames!!=0) && ( frame > crtl.frames! )) crtl.play = false;
            
            } else {
                idle = ((performance.now()- start)/1000) - elapsed;
            }
            frame++; 
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }
}