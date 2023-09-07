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
    Texture,
    BufferView
} from "./webgpu.interfaces.ts";
import { MemberInfo, TemplateType, Type, WgslReflect } from "./wgsl-reflect/index.ts";
import { square} from "./utils.ts";


export class WGPUContext {
    private state: WGPUState;

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
    
    constructor( state: WGPUState ) {
        this.state = {...state};
    }
    
    build( spec : () => WGPUSpec ): WGPUContext {
                
        const wgslDefs = (reflect: WgslReflect) => {
        
            const typedArrayName = (type: Type | null, isArray:boolean, isStruct:boolean): string => {
                //console.log(type, isArray, isStruct)
                    //@ts-ignore
                return isArray ? ( isStruct ? type.format.name : (type.format.name.startsWith('vec') ? type.format.format.name : type.format.name) ) : type instanceof TemplateType ? type.format.name : type.name
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
                    type: typedArrayName(m.type,m.isArray,m.isStruct),
                })).reduce( (acc:Record<string,any>, e:any) => { acc[e.name] = e; return acc; },{})
            };
            
        
            const defs = reflect.storage.map( s => reflect.getStorageBufferInfo(s)!)
                .concat(reflect.uniforms.map( u => reflect.getUniformBufferInfo(u)!))
                .map( b => ({
                    ...b,
                    members: members(b.members),
                    type:  typedArrayName(b.type,b.isArray,b.isStruct),
                }))
                .reduce( (acc:Record<string,any>, e:any) => { acc[e.name] = e; return acc; },{} )
            
            return defs;
        }
              
        const makeBufferView = (defs:any, size: number = 1): BufferView => {
        
            const buffer = defs.isArray ? new ArrayBuffer(defs.arrayStride * size) : new ArrayBuffer(defs.size);
        
            const ArrayType = (type:string) => {
                switch (type) {
                    case "f32": return Float32Array;
                    case "u32": return Uint32Array;
                }
                return Uint8Array;
            }
        
            const makeView = (isArray:boolean, isStruct: boolean, members:MemberInfo, offset: number, arrayStride:number, arraySize: number, byteSize: number, type: string) => {
        
                //console.log("ARGS:", isArray, isStruct, members, offset,  arrayStride, arraySize, size, type)
                //console.log("buffer",buffer)
                if (isArray) {
                    return (new Array(arraySize)).fill(0).map( (e, i):any => makeView(
                        false, 
                        isStruct, 
                        members, 
                        (i * arrayStride) + offset, // must accumulate offset for arrays in structs
                        arrayStride, 
                        arraySize, 
                        arrayStride, // arrayStride corresponds to the byteSize of the array elements 
                        type
                    ));
                }
                 else if (isStruct) {
                    const result:any = {}
                    for (const [key, value] of Object.entries(members)) {
                        //console.log("key",key)
                        result[key] = makeView(
                            value.isArray, 
                            value.isStruct, 
                            value.members, 
                            value.offset + offset,  
                            value.arrayStride, 
                            value.arrayCount, 
                            value.size, 
                            value.type
                        );
                    }    
                    return result;
                } else {
                    const AT = ArrayType(type);
                    return new AT(buffer, offset, byteSize / AT.BYTES_PER_ELEMENT);
                }
            }
            // make a view of the buffer, with the definitions passed in
            const view = makeView(
                defs.isArray,
                defs.isStruct,
                defs.members,
                0, // starting offset
                defs.arrayStride, 
                defs.arrayCount !=0 ? defs.arrayCount : size, // must specify size for dynamic arrays
                defs.size, // byteSize
                defs.type
            );
        
            //console.log("defs",defs)
            //console.log("view",view)
        
            const getViewValue = (isArray:boolean, isStruct: boolean, members: MemberInfo, view:any, size: number) => {
                //console.log("getViewValue", isArray, isStruct, members, view, size)
                if (isArray) {
                    return (new Array(size)).fill(0).map( (e, i):any => getViewValue(false, isStruct, members, view[i], size));
                } else if (isStruct) {
                    const result:any = {}
                    for (const [key, value] of Object.entries(members)) {
                        result[key] = getViewValue(value.isArray, value.isStruct, value.members, view[key], value.arrayCount);
                    }    
                    return result;
                } else {
                    return view.length > 1 ? Array.from(view) : view[0];
                }
            }
        
            const setViewValue = (isArray:boolean, isStruct: boolean, members: MemberInfo, view:any, size: number, data:any):any => {
                //console.log("setViewValue", isArray, isStruct, members, view, size, data)
                if (isArray) {
                    (new Array(size)).fill(0).map( (e, i):any => { if (data && data[i]) setViewValue(false, isStruct, members, view[i], size, data[i] ) } );
                } else if (isStruct) {
                    for (const [key, value] of Object.entries(members)) {
                        if (data[key]) setViewValue(value.isArray, value.isStruct, value.members, view[key], value.arrayCount, data[key]);
                    }  
                } else {
                    if (data) view.length > 1 ? view.set(data) : view.set([data]);
                }
            }
        
            const updateBuffer = (src: ArrayBuffer) => {
                new Uint8Array(buffer).set(new Uint8Array(src));
            }
        
            return {
                name: defs.name,
                buffer: buffer,
                set: (data:any) => setViewValue(defs.isArray, defs.isStruct, defs.members, view, size, data),
                get: () => getViewValue(defs.isArray, defs.isStruct, defs.members, view, size),
                update: (buffer: ArrayBuffer) => updateBuffer(buffer)
            };
        }

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

        const createUniforms = (spec: WGPUSpec, reflect: WgslReflect) : Uniform[] => {

            const uniforms = spec.uniforms || {};
            const uniRessource:Array<Uniform> = [];

            const defs = wgslDefs(reflect);

            // iteration over the uniforms
            for (let i = 0; i < reflect.uniforms.length; i++) {
                const name = reflect.uniforms[i].name;

                const uniformDef = defs[name];
                const uniformView = makeBufferView(uniformDef);
                //console.log("uniform",name)
                if (uniforms[name]) {
                    uniformView.set(uniforms[name]);
                }
                //console.log("get",uniformView.get())

                const uniformBuffer = this.state.device.createBuffer({
                    label: "uniforms",
                    size: uniformView.buffer.byteLength,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });
                this.state.device.queue.writeBuffer(uniformBuffer, 0, uniformView.buffer);

                uniRessource.push({
                    name: uniformDef.name,
                    view: uniformView,
                    resource: { buffer: uniformBuffer },
                    binding: uniformDef.binding,
                    type: "uniform"
                })
            }

            return uniRessource
        }

        const createStorage = (spec: WGPUSpec, reflect: WgslReflect) : Storages => {
            const stateStorage:Storage[] = new Array<Storage>();
            const readStorage:ReadStorage[] = new Array<ReadStorage>();
            const vertexStorage:VertexStorage[] = new Array<VertexStorage>();

            const storage = (name:string)=> {
                return spec.storages ? spec.storages.find((element) => element.name === name) : undefined;
            }

            const defs = wgslDefs(reflect);

            for(let i = 0; i < reflect.storage.length; i++) {
                const name = reflect.storage[i].node.name;
                const access = reflect.storage[i].node.access; 
                const storageSpec = storage(name);
                if (!storageSpec) throw new Error(`Storage spec for ${name} not found`);
                const storageDef = defs[name];
                const storageView = makeBufferView(storageDef,storageSpec.size);
                const storageBuffer = this.state.device.createBuffer({
                    label: `${name} storage buffer`,
                    size: storageView.buffer.byteLength, // number of bytes to allocate
                    usage:  GPUBufferUsage.STORAGE | 
                            GPUBufferUsage.COPY_DST | 
                            (storageSpec.read ? GPUBufferUsage.COPY_SRC : 0) | 
                            (storageSpec.vertex ? GPUBufferUsage.VERTEX : 0),
                });
                // if the buffer is marked as read, then we allocate a staging buffer to read the data
                if (storageSpec.read) {
                    readStorage.push({
                        srcBuffer: storageBuffer,
                        dstBuffer: this.state.device.createBuffer({
                            label: `${storageSpec.name} read buffer`,
                            size: storageView.buffer.byteLength,
                            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
                        }),
                        size: storageView.buffer.byteLength,
                        view: storageView
                    });
                }
                // if the storage buffer is marked as vertex, then we add it to the vertex storages
                if (storageSpec.vertex) {
                    vertexStorage.push({ buffer: storageBuffer });
                }

                if (storageSpec.data) {
                    storageView.set(storageSpec.data);
                }
                this.state.device.queue.writeBuffer(storageBuffer, 0, storageView.buffer);
                
                stateStorage.push({
                    binding: reflect.storage[i].binding,
                    resource: { buffer: storageBuffer },
                    type: access === "read_write" ? "storage" : "read-only-storage"  
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

    addBufferListener( listener: BufferListener ) {
            
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
                await Promise.all(buffers.map( buff => buff.dstBuffer.mapAsync(GPUMapMode.READ)));
                bufferListeners.forEach((listener) => {
                    const data = buffers.map(s=> {
                        s.view.update(s.dstBuffer!.getMappedRange());
                        return s.view;
                    });
                    listener.onRead( data );
                    buffers.forEach(s=> s.dstBuffer!.unmap() );
                });
            } 
        }

        const setUniforms = ( unis: any) => {
            uniforms?.forEach((uniform) => {
                if (unis[uniform.name]) {
                    //console.log("set",uniform.name, unis[uniform.name])
                    uniform.view.set(unis[uniform.name]);
                    //console.log(uniform.view.get())
                }
                // copy the values from JavaScript to the GPU
                device.queue.writeBuffer( (uniform.resource as GPUBufferBinding).buffer, 0, uniform.view.buffer);
            });
        }

        const bindGroup = (i:number) => wgslSpec!.bindings ? (i % wgslSpec!.bindings.length) : 0;
        
        setUniforms(unis);

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

        // compute pipelines
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

        // submit commands
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