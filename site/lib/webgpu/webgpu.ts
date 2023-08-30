/// <reference types="./webgpu.d.ts" />
import { 
    BufferListener,
    Geometry, 
    ReadStorage, 
    Resource, 
    Uniform, 
    VertexStorage, 
    WGPUSpec, 
    WGPUState, 
    Storages, 
    Storage, 
    Compute, 
    Texture
} from "./webgpu.interfaces.ts";
import { ArrayType, TemplateType, Type, WgslReflect } from "./wgsl-reflect/index.ts";
import { square } from "./utils.ts";


export class WGPUContext {
    private state: WGPUState;
    
    constructor( state: WGPUState) {
        this.state = {...state};
    }

    static async init(canvas: HTMLCanvasElement) {
        if (!canvas) {
            throw new Error("Canvas is not defined");
        }
        const context = canvas.getContext("webgpu") as GPUCanvasContext;
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
            canvas: canvas,
            context: context,
            adapter: adapter,
            device: device
        })
    }
    

    build( spec : () => WGPUSpec): WGPUContext {
                

        const createShaderModule = (spec: WGPUSpec) => {
            if (!spec.code) throw new Error("Code is not defined in spec");

            return this.state.device.createShaderModule({
                label: "Custom shader",
                code: spec.code
            });
        }

        const createGeometry = (spec: WGPUSpec, reflect: WgslReflect): Geometry => {

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
            const vertices = new Float32Array(spec.geometry && spec.geometry.vertex.data || square(1.) ) 
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
            if (!type) throw new Error("Type is not defined");
            if (type instanceof ArrayType) return sizeFormat(type.format!)
            if (type instanceof TemplateType) return { size: reflect.getTypeInfo(type)!.size, format: type.format!.name }
            const struct = reflect.structs.find( e => e.name == type.name);
            if (struct) {
               // the size of struct takes into account alignment but the format must take into account members.
               // it is not the case and will fail when not f32
               return { size: reflect.getTypeInfo(type)!.size, format: 'f32'}    
            }
            if (type.name.startsWith('vec') && type.name.endsWith('f')) return { size: parseInt(type.name.substring(3,4)) * 4, format: 'f32' } 
            if (type.name.startsWith('vec') && type.name.endsWith('u')) return { size: parseInt(type.name.substring(3,4)) * 4, format: 'u32' } 
            if (type.name.startsWith('vec') && type.name.endsWith('i')) return { size: parseInt(type.name.substring(3,4)) * 4, format: 'i32' } 

            return { size: 4, format: type.name }
        }

        const createUniforms = (spec: WGPUSpec, reflect: WgslReflect) : Uniform[] => {

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
                    resource: { buffer: uniformBuffer },
                    binding: reflect.uniforms[i].binding,
                    type: "uniform"
                })
            }

            //console.log("uniforms",uniformsBinding);

            return uniformsBinding
        }

        const createStorage = (spec: WGPUSpec, reflect: WgslReflect) : Storages => {
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
                const sf = sizeFormat(node.type!);
                
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
                    resource: { buffer: storageBuffer },
                    type: node.access === "read_write" ? "storage" : "read-only-storage"  
                });

            }
            return {
                storages: stateStorage,
                readStorages: readStorage,
                vertexStorages: vertexStorage
            }
        }

        const createSamplers = (spec: WGPUSpec, reflect: WgslReflect) => {

            // TODO: add sampler spec
            const samplers = reflect.samplers.map((element,i):Resource => ({
                binding: element.binding,
                resource: this.state.device.createSampler({
                    label: element.name,
                    magFilter: 'linear',
                    minFilter: 'linear',
                }),
                type: 'sampler'
            }));
            return samplers;
        }

        const createTextures = (spec: WGPUSpec, reflect: WgslReflect) => {

            const texture = ( image: ImageBitmap ) => {

                const texture = this.state.device.createTexture({
                    label: "",
                    size: { width: image.width, height: image.height },
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
                });

                this.state.device.queue.copyExternalImageToTexture(
                    { source: image },
                    { texture: texture },
                    [ image.width, image.height ]
                );

                return texture.createView();
            }

            const textures = reflect.textures.map((element,i): Texture => {
                const tex = spec.textures ? spec.textures.find( e => e.name === element.name) : undefined;
                if (!tex) throw new Error(`Texture spec for ${element.name} is undefined`);
                if (!tex.data) throw new Error(`Texture data for ${element.name} is undefined`);
                const resource:Texture = tex.data instanceof HTMLVideoElement ? 
                    { 
                        binding: element.binding,
                        resource: this.state.device.importExternalTexture({ source : tex.data }),
                        type: 'external_texture',
                        video: tex.data
                    }:
                    { 
                        binding: element.binding,
                        resource: texture(tex.data),
                        type: 'texture'
                    };
                return resource;
            });
         
            return textures;
        }

        const createBindGroupLayout = (resources: Resource[]) => {
            const entries:Array<GPUBindGroupLayoutEntry> = [];

            resources.forEach((element,i) => {
                switch (element.type) {
                    case "uniform": 
                        entries.push({ 
                            binding: element.binding,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, 
                            buffer: { type: element.type }
                        }); break;;
                    case "storage": 
                        entries.push({ 
                            binding: element.binding,
                            visibility: GPUShaderStage.COMPUTE, 
                            buffer: { type: element.type }
                        }); break;;
                    case "read-only-storage": 
                        entries.push({ 
                            binding: element.binding,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, 
                            buffer: { type: element.type }
                        }); break;;
                    case "sampler": 
                        entries.push({ 
                            binding: element.binding,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, 
                            sampler: { type: "filtering" }
                        }); break;;
                    case "texture":
                        entries.push({ 
                            binding: element.binding,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, 
                            texture: { viewDimension: "2d" }
                        }); break;;
                    case "external_texture": 
                        entries.push({ 
                            binding: element.binding,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, 
                            externalTexture: { viewDimension: "2d" }
                        }); break;;
                
                }

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

        const createBindings = (spec:WGPUSpec, resources:Resource[], bindGroupLayout: GPUBindGroupLayout, reflect:WgslReflect) => {
            // only have a single bind group for now
            const resbinding = new Array<any>(reflect.getBindGroups()[0].length);
    
            resources.forEach((element,i) => {
                resbinding[element.binding] = element.resource;
            });
    
            // the definition of bindgroups in the spec doesnt have to match the order of the resources
            const bindingsCount = resources.length;
            const bindingGroupsCount = spec.bindings?.length || 1;
            const bindingGroups = new Array<GPUBindGroup>(bindingGroupsCount);
            
            const externals = new Array<{ idx: number, video: HTMLVideoElement}>(bindingGroupsCount);            
            const entries = new Array<GPUBindGroupEntry[]>(bindingGroupsCount);
            
            for (let i = 0; i < bindingGroupsCount; i++) {
                entries[i] = [] 

                for (let j = 0; j < bindingsCount; j++) {
                    // if bindings are not defined, use the default order
                    const index = spec.bindings ? spec.bindings[i][j] : j;
                    const res = resbinding[index];
                    if (!res) throw new Error("Binding defined in groups not found");

                    entries[i].push({
                        binding: resources[j].binding,
                        resource: res 
                    })
                    if (resources[j].type === 'external_texture') {
                        externals[i] = { idx: j, video: (resources[j] as Texture).video! };
                    };
                }

                bindingGroups[i] = this.state.device.createBindGroup({  
                    label: `Bind Group ${i}`,
                    layout: bindGroupLayout,
                    entries: entries[i],
                })
            }
            
            return (index:number) => {
                // if the group has an external texture, we have to recreate the group every frame
                // importing the texture from the video
                if (externals[index]) {
                    const { idx, video } = externals[index];
                    entries[index][idx].resource = this.state.device.importExternalTexture({ source : video })
                    return this.state.device.createBindGroup({
                        label: `Bind Group ${index}`,
                        layout: bindGroupLayout,
                        entries: entries[index],
                    })
                }
                return bindingGroups[index]
            }            
        }
    
        const createPipelineLayout = (bindGroupLayout: GPUBindGroupLayout) => {
            return this.state.device.createPipelineLayout({
                label: "Pipeline Layout",
                bindGroupLayouts: [ bindGroupLayout ],
            });
        }

        const createComputePipelines = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout, reflect: WgslReflect, wgslSpec: WGPUSpec): Compute[] => {
            const result: Compute[] = [];

            const compute = (name: string)  => wgslSpec.compute ? wgslSpec.compute.find( e => e.name === name) : undefined;

            for( let i = 0; i< reflect.entry!.compute.length; i++) {
                const entryPoint = reflect.entry?.compute[i].node.name;
                const c = compute(entryPoint);
                if (!c) throw new Error(`Spec for compute ${entryPoint} not found!`);
                const pipeline = this.state.device.createComputePipeline({
                    label: `${entryPoint} compute pipeline`,
                    layout: pipelineLayout,
                    compute: {
                      module: shaderModule,
                      entryPoint: entryPoint,
                    }
                });
                result.push({
                    pipeline: pipeline,
                    workgroups: c.workgroups || [1,1,1],
                    instances: c.instances || 1
                });
            }

            return result;
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

        const wgslSpec = spec();
        const reflect = new WgslReflect(wgslSpec.code);
        //console.log("reflect",reflect)

        const shaderModule = createShaderModule(wgslSpec);
        const geometry = createGeometry(wgslSpec, reflect);
        const uniforms = createUniforms(wgslSpec, reflect);
        const storages = createStorage(wgslSpec, reflect);
        const samplers = createSamplers(wgslSpec, reflect);
        const textures = createTextures(wgslSpec, reflect);

        const resources = [...uniforms, ...storages.storages, ...samplers, ...textures];
        
        const bindGroupLayout = createBindGroupLayout(resources);
        
        const bindings = createBindings(wgslSpec, resources, bindGroupLayout, reflect);

        const pipelineLayout = createPipelineLayout(bindGroupLayout);
        
        const renderPipeline = createRenderPipeline(shaderModule, pipelineLayout, reflect);

        const computePipelines = createComputePipelines(shaderModule, pipelineLayout, reflect, wgslSpec);
        
        // we must have a computeGrouCount that is a multiple of the bindings groups
        // we must always end in the same binding group we started if we want to show the current state in the next iteration
        const computeGC = (spec: WGPUSpec) => {
            const gc = wgslSpec?.bindings ? wgslSpec.bindings.length : 1;
            const cgc = wgslSpec?.computeGroupCount ?  wgslSpec.computeGroupCount : 1;
            return cgc > 1 ? cgc + (gc - ((cgc-2) % gc) - 1) : 1;
        }

        return new WGPUContext({
            ...this.state,
            pipelines: {
                render: renderPipeline,
                compute: computePipelines,
                computeGroupCount: computeGC(wgslSpec),
                bindings: bindings,
            },
            geometry: geometry,
            uniforms: uniforms,
            storages: storages,
            clearColor: wgslSpec.clearColor || {r:0,g:0,b:0,a:1},
            wgslSpec: wgslSpec,
            spec: spec,
        });
    }

    addBufferListener(listener: BufferListener) {
            
        const bls = this.state.bufferListeners ? [...this.state.bufferListeners, listener] : [listener];
        return new WGPUContext({
            ...this.state,
            bufferListeners: bls
        });
    }

    async frame(frame: number, unis?: any) {
        const { bufferListeners, storages, device, uniforms, pipelines, geometry, context, clearColor, wgslSpec } = this.state;

        const readBuffers = async () => {
            if (bufferListeners) {
                const buffers = storages?.readStorages || [];
                if (buffers.length == 0) return;
                const p = await Promise.all(buffers.map( buff => buff.dstBuffer.mapAsync(GPUMapMode.READ)));
                bufferListeners.forEach((listener) => {
                    // TODO: buffers can be other types than float32
                    const data = buffers.map(s=> ({ name: s.name, buffer: new Float32Array(s.dstBuffer!.getMappedRange())}));
                    listener.onRead( data );
                    buffers.forEach(s=> s.dstBuffer!.unmap() );
                });
            } 
        }

        const setUniforms = ( unis: any) => {
            uniforms?.forEach((element,i) => {
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
                device.queue.writeBuffer( (element.resource as GPUBufferBinding).buffer, 0, element.uniValues);
            });
        }
        
        setUniforms(unis);

        const bindGroup = (i:number) => wgslSpec!.bindings ? (i % wgslSpec!.bindings.length) : 0;

        const encoder = device.createCommandEncoder();

        // render pipeline
        if (pipelines!.render) {
            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    loadOp: "clear",
                    clearValue: clearColor,
                    storeOp: "store",
                 }]
            });
            
            pass.setPipeline(pipelines!.render);
            pass.setVertexBuffer(0, geometry!.vertexBuffer);

            // we must always have two vertex buffers when instancing from storage, because
            // you cant' have a writing and reading storage vertex at the same time.
            if (storages && storages.vertexStorages.length > 0) {
                pass.setVertexBuffer(1, storages.vertexStorages[bindGroup(frame)].buffer)
            } else if (geometry!.instanceBuffer) {
                pass.setVertexBuffer(1, geometry!.instanceBuffer)
            }
            
            pass.setBindGroup(0, pipelines!.bindings(bindGroup(frame)));
            pass.draw(geometry!.vertexCount, geometry!.instances || 1 );

            pass.end();    
        }

        const computePass = encoder.beginComputePass();
        for( let i = 0; i < pipelines!.computeGroupCount; i++) {
            const bg = bindGroup(frame + i)
            for (let c = 0; c < pipelines!.compute.length; c++) {
                const compute = pipelines!.compute[c];
                computePass.setPipeline(compute.pipeline);
                for (let i = 0; i < compute.instances ; i++) {
                    computePass.setBindGroup(0, pipelines!.bindings(bg));
                    computePass.dispatchWorkgroups(...compute.workgroups);
                }
            }    
        }
        computePass.end(); 
        
        // copy read buffers
        if (storages && storages.readStorages.length > 0) {
            storages.readStorages.forEach((element,i) => {
                encoder.copyBufferToBuffer(element.srcBuffer, 0, element.dstBuffer, 0, element.size);
            });
        } 

        device.queue.submit([encoder.finish()]);

        // read buffers into staging buffers
        await readBuffers();
    }

    getCanvas() {
        return this.state.canvas;
    }

    reset() {
        return this.build(this.state.spec!)
    }
}