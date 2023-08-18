/// <reference types="./webgpu.d.ts" />

import { BufferListener, Controls, FPSListener, Geometry, ReadStorage, Resource, Uniform, VertexStorage, WGLSLSpec, WGPUState, Storages, Storage } from "./webgpu.interfaces.ts";
import { ArrayType, TemplateType, Type, WgslReflect } from "./wgsl_reflect.module.js";


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
    static triangle(x: number) {
        return [
        -x, -x, 
        x, -x,
        0,  x,
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
    private aspectRatio: Array<number> = [1,1];

    constructor( state: WGPUState) {
        this.state = {...state};
        const devicePixelRatio = window.devicePixelRatio || 1;
        this.observer = new ResizeObserver((entries) => {
            this.state.canvas.width = entries[0].target.clientWidth * devicePixelRatio;
            this.state.canvas.height = entries[0].target.clientWidth * devicePixelRatio;
            //this.state.canvas.width = entries[0].devicePixelContentBoxSize[0].inlineSize;
            //this.state.canvas.height = entries[0].devicePixelContentBoxSize[0].blockSize;
            this.resolution[0] = entries[0].target.clientWidth;
            this.resolution[1] = entries[0].target.clientHeight;
            const factor = this.resolution[0] > this.resolution[1] ? this.resolution[0] : this.resolution[1];
            this.aspectRatio[0] = this.resolution[0] / factor;
            this.aspectRatio[1] = this.resolution[1] / factor;
        });
        this.observer.observe(this.state.canvas)
        this.state.canvas.addEventListener('mousemove', event => {
            this.mouse[0] = event.offsetX/this.state.canvas.clientWidth;
            this.mouse[1] = event.offsetY/this.state.canvas.clientHeight;
        });
    }
    

    build(wgslSpec : WGLSLSpec): WGPUContext {
                

        const createShaderModule = (spec: WGLSLSpec) => {
            if (!spec.shader) throw new Error("Shader is not defined");

            return this.state.device.createShaderModule({
                label: "Custom shader",
                code: spec.shader
            });
        }

        const createGeometry = (spec: WGLSLSpec, reflect: WgslReflect): Geometry => {

            const buffersLayout:GPUVertexBufferLayout[] = [];

            // iterate over the inputs of the vertex shader and create the vertex buffer layout with the attributes passed as parameters
            const makeLayout = ( step: GPUVertexStepMode, attrs: Array<string> ):GPUVertexBufferLayout => {
                
                // only does float32 and uint32
                const type = (format:string,name:string) => `${(format == 'f32' ? 'float32' : 'uint32')}${ name == 'vec2' ? 'x2' : name == 'vec3' ? 'x3' : name == 'vec4' ? 'x4' : ''}`;
                
                // assume only one vertex shader in the module
                const inputs = reflect.entry?.vertex[0].inputs;
                let stride = 0;
                const vattrs = inputs.filter( (i:any) => attrs.some( a => a === i.name) && i.locationType === 'location').map( (i:any): GPUVertexAttribute => {                
                    const attr = {
                        shaderLocation: i.location,
                        offset: stride,
                        format: type(i.type.format.name, i.type.name) as GPUVertexFormat,
                    } 
                    stride += (i.type.name == 'vec2' ? 2 : i.type.name == 'vec3' ? 3 : i.type.name == 'vec4' ? 4 : 1) * 4;
                    return attr;                    
                });
                if (vattrs.length == 0) throw new Error(`Vertex attributes ${attrs} not found`);
                return {
                    arrayStride: stride,
                    stepMode: step,
                    attributes: vattrs
                }
            }

            // there is always a vertex buffer with a default square template geometry
            const vertices = new Float32Array(spec.geometry && spec.geometry.vertex.data || Utils.square(1.) ) 
            buffersLayout.push(makeLayout("vertex",spec.geometry?.vertex.attributes || ["pos"]))
            const vertexBuffer = this.state.device.createBuffer({
                label: "Geometry vertices",
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            this.state.device.queue.writeBuffer(vertexBuffer, 0, vertices);

            // if there is an instance buffer, create the buffer layout
            let instancesBuffer = undefined;
            if (spec.geometry && spec.geometry.instance) {
                buffersLayout.push(makeLayout("instance",spec.geometry?.instance.attributes))
                // if there is data create the vertex buffer
                if (spec.geometry.instance.data) {
                    const vertices = new Float32Array(spec.geometry && spec.geometry.instance.data )

                    instancesBuffer = this.state.device.createBuffer({
                        label: "Geometry instance",
                        size: vertices.byteLength,
                        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                    });
                    this.state.device.queue.writeBuffer(vertexBuffer, 0, vertices);     
                }
            }

            const instancesCount = spec.geometry && (spec.geometry.vertex.instances || spec.geometry.instance?.instances || 1);
            //console.log("buffers layouts",buffersLayout);
            //console.log(instancesCount);
            return {
                vertexBuffer: vertexBuffer,
                vertexCount: vertices.length / 2, // only works for the square?
                vertexBufferLayout: buffersLayout,
                instances: instancesCount,
                instanceBuffer: instancesBuffer
            }
        }

        const sizeFormat = (type: Type): {size: number, format: string} => {
            if (type instanceof ArrayType) return sizeFormat(type.format)
            if (type instanceof TemplateType) return { size: reflect.getTypeInfo(type)!.size, format: type.format.name }
            const struct = reflect.structs.find( e => e.name == type.name);
            if (struct) {
                return struct.members.reduce((acc:any, curr:any) => { 
                    const sf = sizeFormat(curr.type);
                    return { size : acc.size + sf.size, format: sf.format }  
                }, {size: 0, format: ''});    
            }
            if (type.name.startsWith('vec') && type.name.endsWith('f')) return { size: parseInt(type.name.substring(3,4)) * 4, format: 'f32' } 
            if (type.name.startsWith('vec') && type.name.endsWith('u')) return { size: parseInt(type.name.substring(3,4)) * 4, format: 'u32' } 
            if (type.name.startsWith('vec') && type.name.endsWith('i')) return { size: parseInt(type.name.substring(3,4)) * 4, format: 'i32' } 

            return { size: 4, format: type.name }
        }

        const createUniforms = (spec: WGLSLSpec, reflect: WgslReflect) : Uniform[] => {

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
                        //console.log(member)
                        const size = member.size / 4;
                        const value = uni[member.name] || Array(size).fill(0);
                        const sf = sizeFormat(member.type);
                        //console.log("member", member.name, "type", type, "size", size, "value", value)
                        //console.log("iterator", value[Symbol.iterator])
                        const offset = member.offset;
                        uniformViews[info.name][member.name] = 
                            sf.format === 'f32' ? new Float32Array(uniformArray, offset, size) : 
                            sf.format === 'u32' ? new Uint32Array(uniformArray, offset, size) : 
                            new Int32Array(uniformArray, offset, size);

                        value[Symbol.iterator] ? 
                            uniformViews[info.name][member.name].set(value) : 
                            uniformViews[info.name][member.name].set([value]);
                    }
                } else {
                    const size = info!.size / 4;
                    const value = uniforms[info.name] || Array(size).fill(0);
                    const sf = sizeFormat(info.type);
                    const offset = 0;
                    uniformViews[info.name] = 
                        sf.format === 'f32' ? new Float32Array(uniformArray, offset, size) : 
                        sf.format === 'u32' ? new Uint32Array(uniformArray, offset, size) : 
                        new Int32Array(uniformArray, offset, size);
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

        const createStorage = (spec: WGLSLSpec, reflect: WgslReflect) : Storages => {
            const stateStorage:Storage[] = new Array<Storage>();
            const readStorage:ReadStorage[] = new Array<ReadStorage>();
            const vertexStorage:VertexStorage[] = new Array<VertexStorage>();

            const storage = (name:string)=> {
                return spec.storage ? spec.storage.find((element) => element.name === name) : undefined;
            }

            for(let i = 0; i < reflect.storage.length; i++) {
                const node = reflect.storage[i].node;
                const sto = storage(node.name);
                if (!sto) throw new Error(`Storage spec for ${node.name} not found`);
                const size = sto.size;
                // gives a byte size and format for the type present in the storage buffer
                // we need this to allocate the right size given the type of the buffer
                // so we can copy the data from the spec to the buffer
                //const sf = sizeFormat(node.type);
                const sf = sizeFormat(node.type);
                //console.log(node.name,sf);
                
                //console.log(node.name, size, sf.size, sf.format)
                const storageBuffer = this.state.device.createBuffer({
                    label: `${sto.name} storage buffer`,
                    size: size * sf.size, // number of bytes to allocate
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | (sto.read ? GPUBufferUsage.COPY_SRC : 0) | ((sto.vertex ? GPUBufferUsage.VERTEX : 0)),
                });

                // if the buffer is marked as read, then we allocate a staging buffer to read the data
                if (sto.read) {
                    const readBuffer = this.state.device.createBuffer({
                        label: `${sto.name} read buffer`,
                        size: size * sf.size,
                        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
                    });
                    readStorage.push({
                        srcBuffer: storageBuffer,
                        dstBuffer: readBuffer,
                        size: size * sf.size,
                        name: sto.name,
                    });
                }
                // if the storage buffer is marked as vertex, then we add it to the vertex storages
                if (sto.vertex) {
                    vertexStorage.push({ buffer: storageBuffer });
                }
                
                const s = size * (sf.size/4); // divided by 4 because we are using 32 bits
                const data = sto.data ? sto.data : new Array(s).fill(0);
                const stArray = sf.format === 'f32' ? new Float32Array(s) : sf.format === 'u32' ? new Uint32Array(s) : new Int32Array(s);                
                stArray.set(data);
                this.state.device.queue.writeBuffer(storageBuffer, 0, stArray);
                
                stateStorage.push({
                    binding: reflect.storage[i].binding,
                    buffer: storageBuffer,
                    type: node.access === "read_write" ? "storage" : "read-only-storage"  
                });

            }
            return {
                storages: stateStorage,
                readStorages: readStorage,
                vertexStorages: vertexStorage
            }
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

        const createComputePipeline = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout, reflect: WgslReflect) => {
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

        const createRenderPipeline = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout, reflect: WgslReflect) => {            
            const render = 
                reflect.entry?.vertex && 
                reflect.entry?.fragment && 
                reflect.entry?.vertex.length > 0 && 
                reflect.entry?.fragment.length > 0;  

            if (!render) return undefined;

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
        const geometry = createGeometry(wgslSpec, reflect);
        const uniforms = createUniforms(wgslSpec, reflect);
        const storages = createStorage(wgslSpec, reflect);

        const resources = [...uniforms, ...storages.storages];
        
        const bindGroupLayout = createBindGroupLayout(resources);
        const bindGroups = createBindGroups(wgslSpec, resources);

        const pipelineLayout = createPipelineLayout(bindGroupLayout);
        
        const renderPipeline = createRenderPipeline(shaderModule, pipelineLayout, reflect);

        const computePipeline = createComputePipeline(shaderModule, pipelineLayout, reflect);
        if (computePipeline && !wgslSpec.workgroupCount)
            throw new Error("You have a compute shader but 'workgroupCount' is not defined.");
            
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

        const fps = () => {
            this.state.fpsListeners && 
            this.state.fpsListeners.forEach((listener) => {  
                listener.onFPS({ fps: (frame / elapsed).toFixed(2), time: elapsed.toFixed(1)} );
            });
        }

        const readBuffers = async ()=>{
            if (this.state.bufferListeners) {
                const buffers = this.state.storages?.readStorages || [];
                if (buffers.length == 0) return;
                await Promise.all(buffers.map( buff => buff.dstBuffer.mapAsync(GPUMapMode.READ)));
                this.state.bufferListeners.forEach((listener) => {
                    const data = buffers.map(s=> ({ name: s.name, buffer: new Float32Array(s.dstBuffer!.getMappedRange())}));
                    listener.onRead( data );
                    buffers.forEach(s=> s.dstBuffer!.unmap() );
                });
            } 
        }

        const setUniforms = ( unis: any) => {

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

            if ( crtl.play || crtl.frames! > 0 ) {
                const bindGroup = this.state.spec?.bindings ? this.state.spec.bindings.currentGroup(frame) : 0;

                const encoder = this.state.device.createCommandEncoder();

                setUniforms({ 
                    sys: { 
                        frame: frame, 
                        time: elapsed, 
                        mouse: this.mouse, 
                        resolution: this.resolution,
                        aspect: this.aspectRatio 
                    }, ...unis });
     
                // render pipeline
                if (this.state.pipelines?.render) {
                    const pass = encoder.beginRenderPass({
                        colorAttachments: [{
                            view: this.state.context.getCurrentTexture().createView(),
                            loadOp: "clear",
                            clearValue: {r: 1.0, g: 1.0, b: 1., a: 1.0},
                            storeOp: "store",
                         }]
                    });
                    
                    pass.setPipeline(this.state.pipelines!.render);
                    pass.setVertexBuffer(0, this.state.geometry!.vertexBuffer);

                    if (this.state.storages && this.state.storages.vertexStorages.length > 0) {
                        pass.setVertexBuffer(1, this.state.storages.vertexStorages[bindGroup].buffer)
                    } else if (this.state.geometry?.instanceBuffer) {
                        pass.setVertexBuffer(1, this.state.geometry?.instanceBuffer)
                    }
                    
                    elapsed = ((performance.now() - start) / 1000) - idle;
            
                    pass.setBindGroup(0, this.state.pipelines!.bindGroup[bindGroup]);
                    pass.draw(this.state.geometry!.vertexCount, this.state.geometry!.instances || 1 );
        
                    pass.end();    
                }
                
                // compute pipeline
                if (this.state.pipelines?.compute) {
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

                // copy read buffers
                if (this.state.storages && this.state.storages.readStorages.length > 0) {
                    this.state.storages.readStorages.forEach((element,i) => {
                        encoder.copyBufferToBuffer(element.srcBuffer, 0, element.dstBuffer, 0, element.size);
                    });
                } 
    
                this.state.device.queue.submit([encoder.finish()]);

                // read buffers into staging buffers
                await readBuffers();

                if (crtl.frames! > 0 && crtl.reset) {
                    crtl.reset = false;
                    crtl.frames = 0;
                }
                if (crtl.frames! !=0 &&  frame > crtl.frames! ) crtl.play = false;
            
            } else {
                idle = ((performance.now()- start)/1000) - elapsed;
            }
            frame++; 
            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
    }
}