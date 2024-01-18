/// <reference types="./webgpu.d.ts" />
import { 
    BufferListener,
    Geometry, 
    ReadStorage, 
    Resource, 
    Uniform, 
    VertexStorage, 
    PSpec, 
    PoiesisState, 
    StorageTypes, 
    Storage, 
    Compute, 
    Texture,
    BufferView,
    ComputeGroupPipeline,
    Controls,
    FPSListener
} from "./poiesis.interfaces.ts";
import { ArrayType, MemberInfo, TemplateType, Type, WgslReflect } from "./wgsl-reflect/index.ts";
import { square} from "./utils.ts";


export class PContext {
    private state: PoiesisState;

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

        return new PContext({
            canvas: canvas,
            context: context,
            adapter: adapter,
            device: device
        })
    }
    
    private constructor( state: PoiesisState ) {
        this.state = {...state};
    }
    
    build( spec : () => PSpec ): PContext {

        const wgslDefs = (reflect: WgslReflect) => {
        
            const typedArrayName = (type: Type | null): string => {
                if (type instanceof ArrayType) return typedArrayName(type.format);
                if (type instanceof TemplateType) return typedArrayName(type.format);
                return type!.name;
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
                    type: typedArrayName(m.type),
                })).reduce( (acc:Record<string,any>, e:any) => { acc[e.name] = e; return acc; },{})
            };
            
            // transformation of the reflect data into a more usable format for buffers
            // This will be used to create the buffer views
            const defs = reflect.storage.map( s => ({ access: s.node.access, ...reflect.getStorageBufferInfo(s)! }) )
                .map( s => ({...s, category: "storage"})) 
                .concat(reflect.uniforms.map( u => reflect.getUniformBufferInfo(u)!)
                .map( u => ({...u, category: "uniform", access: "read_write"})))
                .map( b => ({
                    ...b,
                    members: members(b.members),
                    type:  typedArrayName(b.type),
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
                    case "i32": return Int32Array;
                }
                return Uint8Array;
            }
        
            const makeView = (isArray:boolean, isStruct: boolean, members:MemberInfo, offset: number, arrayStride:number, arraySize: number, byteSize: number, type: string) => {
        
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
                
            const getViewValue = (isArray:boolean, isStruct: boolean, members: MemberInfo, view:any, size: number) => {
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
                if (isArray) {
                    (new Array(size)).fill(0).map( (e, i):any => { if (data && data[i]) setViewValue(false, isStruct, members, view[i], size, data[i] ) } );
                } else if (isStruct) {
                    for (const [key, value] of Object.entries(members)) {
                        if (data[key]) setViewValue(value.isArray, value.isStruct, value.members, view[key], value.arrayCount, data[key]);
                    }  
                } else {
                    data && view.length > 1 ? view.set(data) : view.set([data]);
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

        const createShaderModule = (spec: PSpec) => {
            if (!spec.code) throw new Error("Code is not defined in spec");

            return this.state.device.createShaderModule({
                label: "Custom shader",
                code: spec.code
            });
        }

        const createGeometry = (spec: PSpec, reflect: WgslReflect): Geometry => {

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

        const createUniforms = (spec: PSpec, defs: Record<string,any>) : Uniform[] => {

            const uniforms = spec.uniforms || {};
            const uniRessource:Array<Uniform> = [];

            for (const [key, value] of Object.entries(defs)) {
                if (value.category === "uniform") {
                    const uniformDef = value;
                    const uniformView = makeBufferView(uniformDef);
                    if (uniforms[key]) {
                        uniformView.set(uniforms[key]);
                    }

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
            };

            return uniRessource
        }

        const createStorage = (spec: PSpec, defs: Record<string,any>) : StorageTypes => {
            const stateStorage:Storage[] = new Array<Storage>();
            const readStorage:ReadStorage[] = new Array<ReadStorage>();
            const vertexStorage:VertexStorage[] = new Array<VertexStorage>();

            const storage = (name:string)=> {
                return spec.storages ? spec.storages.find((element) => element.name === name) : undefined;
            }

            for (const [key,value] of Object.entries(defs)) {
                if (value.category === "storage") {
                    const storageDef = value;
                    const storageSpec = storage(key);
                    if (!storageSpec) throw new Error(`Storage spec for ${key} not found`);
                    const storageView = makeBufferView(storageDef,storageSpec.size);
                    const storageBuffer = this.state.device.createBuffer({
                        label: `${storageDef.name} storage buffer`,
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
                        binding: storageDef.binding,
                        resource: { buffer: storageBuffer },
                        type: storageDef.access === "read_write" ? "storage" : "read-only-storage"  
                    });
                }
            }

            return {
                storages: stateStorage,
                readStorages: readStorage,
                vertexStorages: vertexStorage
            }
        }

        const createSamplers = (spec: PSpec, reflect: WgslReflect) => {

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

        const createTextures = (spec: PSpec, reflect: WgslReflect) => {

            const texture = ( image: ImageBitmap, l: string ) => {

                const texture = this.state.device.createTexture({
                    label: l,
                    size: { width: image.width, height: image.height },
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
                });

                this.state.device.queue.copyExternalImageToTexture(
                    { source: image },
                    { texture: texture },
                    [ image.width, image.height ]
                );

                return texture.createView( { format: "rgba8unorm" , label: l});
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
                        resource: texture(tex.data, tex.storage ? 'storage_texture': 'texture'),
                        type: tex.storage ? 'storage_texture': 'texture'
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
                    case "storage_texture":
                        entries.push({ 
                            binding: element.binding,
                            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, 
                            storageTexture: { viewDimension: "2d", format: "rgba8unorm" }
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

        const createBindings = (spec:PSpec, resources:Resource[], bindGroupLayout: GPUBindGroupLayout, reflect:WgslReflect) => {
            // only have a single bind group for now
            const resbinding = new Array(reflect.getBindGroups()[0].length);
    
            resources.forEach((element: Resource) => {
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
                    if (!res) throw new Error(`Binding ${index} defined in groups not found`);

                    entries[i].push({
                        // we need to use the first group to define the bindings reference
                        // this will fail if one binding group and bindings not sequential
                        // we want to keep the binding order but change the resources order
                        binding: spec.bindings ? spec.bindings[0][j] : j, 
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

        const createComputePipelines = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout, reflect: WgslReflect, wgslSpec: PSpec): ComputeGroupPipeline => {
            const pipelines: Compute[] = [];

            // we must have a computeGrouCount that is a multiple of the bindings groups
            // we must always end in the same binding group we started if we want to show the current state in the next iteration
            const computeGC = (spec: PSpec) => {
                const gc = spec.bindings ? spec.bindings.length : 1;
                const cgc = spec.computeGroupCount ?  spec.computeGroupCount : 1;
                return cgc > 1 ? cgc + (gc - ((cgc-2) % gc) - 1) : 1;
            }

            const compute = (name: string)  => wgslSpec.computes ? wgslSpec.computes.find( e => e.name === name) : undefined;

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

                pipelines.push({
                    pipeline: pipeline,
                    workgroups: c.workgroups || [1,1,1],
                    instances: c.instances || 1
                });
            }

            return {
                computeGroup: pipelines,
                computeGroupCount: computeGC(wgslSpec)
            };
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
        //console.log(reflect)
        const defs = wgslDefs(reflect);

        const shaderModule = createShaderModule(wgslSpec);
        const geometry = createGeometry(wgslSpec, reflect);
        const uniforms = createUniforms(wgslSpec, defs);
        const storages = createStorage(wgslSpec, defs);
        const samplers = createSamplers(wgslSpec, reflect);
        const textures = createTextures(wgslSpec, reflect);

        const resources = [...uniforms, ...storages.storages, ...samplers, ...textures];
        
        const bindGroupLayout = createBindGroupLayout(resources);
        const pipelineLayout = createPipelineLayout(bindGroupLayout);
        const bindings = createBindings(wgslSpec, resources, bindGroupLayout, reflect);
        
        const renderPipeline = createRenderPipeline(shaderModule, pipelineLayout, reflect);
        const computePipelines = createComputePipelines(shaderModule, pipelineLayout, reflect, wgslSpec);
        
        
        return new PContext({
            ...this.state,
            geometry: geometry,
            uniforms: uniforms,
            storages: storages,
            pipelines: {
                render: renderPipeline,
                compute: computePipelines,
                bindings: bindings,
            },
            clearColor: wgslSpec.clearColor || {r:0,g:0,b:0,a:1},
            wgslSpec: wgslSpec,
            spec: spec,
        });
    }

    addBufferListener( listener: BufferListener ) {        
        const bls = this.state.bufferListeners ? [...this.state.bufferListeners, listener] : [listener];
        
        return new PContext({
            ...this.state,
            bufferListeners: bls
        });
    }

    reset() {
        this.state =  this.build(this.state.spec!).state;
    }

    async frame(frame: number, unis?: any) {
        const { bufferListeners, storages, device, uniforms, pipelines, geometry, context, clearColor, wgslSpec } = this.state;

        const bindGroup = (i:number) => wgslSpec!.bindings ? (i % wgslSpec!.bindings.length) : 0;

        const setUniforms = ( unis: any) => {
            uniforms?.forEach((uniform) => {
                if (unis[uniform.name]) {
                    uniform.view.set(unis[uniform.name]);
                    // copy the values from JavaScript to the GPU
                    device.queue.writeBuffer( (uniform.resource as GPUBufferBinding).buffer, 0, uniform.view.buffer);
                }
            });
        }
         
        const submitCommands = () => {
            const encoder = device.createCommandEncoder();

            // render pipeline
            if (pipelines?.render) {
                const pass = encoder.beginRenderPass({
                    colorAttachments: [{
                        view: context.getCurrentTexture().createView(),
                        loadOp: "clear",
                        clearValue: clearColor,
                        storeOp: "store",
                     }]
                });
                
                pass.setPipeline(pipelines.render);
                if (geometry?.vertexBuffer) pass.setVertexBuffer(0, geometry.vertexBuffer);
    
                // we must always have two vertex buffers when instancing from storage, because
                // you cant' have a writing and reading storage vertex at the same time.
                if (storages && storages.vertexStorages.length > 0) {
                    pass.setVertexBuffer(1, storages.vertexStorages[bindGroup(frame)].buffer)
                } else if (geometry?.instanceBuffer) {
                     pass.setVertexBuffer(1, geometry.instanceBuffer)
                }
                
                pass.setBindGroup(0, pipelines.bindings(bindGroup(frame)));
                if (geometry) pass.draw(geometry.vertexCount, geometry.instances || 1 );
    
                pass.end();    
            }
    
            // compute pipelines
            if (pipelines?.compute) {
                const computePass = encoder.beginComputePass();

                for( let cg = 0; cg < pipelines.compute.computeGroupCount; cg++) {
                    const bg = bindGroup(frame + cg)

                    for (let c = 0; c < pipelines.compute.computeGroup.length; c++) {
                        const compute = pipelines.compute.computeGroup[c];
                        computePass.setPipeline(compute.pipeline);

                        for (let i = 0; i < compute.instances ; i++) {
                            const g = bindGroup(bg + i )
                            computePass.setBindGroup(0, pipelines.bindings(g));
                            computePass.dispatchWorkgroups(...compute.workgroups);
                        }
                    }    
                }

                computePass.end();    
            }
            
            // copy read buffers
            if (storages && storages.readStorages.length > 0) {
                storages.readStorages.forEach((storage) => {
                    encoder.copyBufferToBuffer(storage.srcBuffer, 0, storage.dstBuffer, 0, storage.view.buffer.byteLength);
                });
            } 
    
            // submit commands
            device.queue.submit([encoder.finish()]);    
        }

        const readBuffers = async () => {
            if (bufferListeners) {
                const buffers = storages?.readStorages || [];
                if (buffers.length == 0) return;
                await Promise.all(buffers.map( buff => buff.dstBuffer.mapAsync(GPUMapMode.READ)))
                bufferListeners.forEach((listener) => {
                    const data = buffers.map(s=> {
                        s.view.update(s.dstBuffer!.getMappedRange());
                        return s.view;
                    });
                    listener.onRead( data );
                    buffers.forEach(s=> s.dstBuffer.unmap() );
                });    
            } 
        }
 
        // update uniforms
        setUniforms(unis);

        // read buffers into staging buffers
        await readBuffers();

        // submit commands
        submitCommands();

    }


    animate(unis?:any, controls?: Controls, fpsListener?: FPSListener) {
        let frame = 0;
        let intid = 0;
        let elapsed = 0;
        let idle = 0;
        let start = performance.now();
    
        const canvas = this.state.canvas;
        const crtl = controls || { play: true, reset: false, delta: 0 };
    
        const mouse: Array<number> = [0,0,0,0];
        const resolution: Array<number> = [0,0];
        const aspectRatio: Array<number> = [1,1];
    
        const observer = new ResizeObserver((entries) => {
            canvas.width = entries[0].target.clientWidth * devicePixelRatio;
            canvas.height = entries[0].target.clientWidth * devicePixelRatio;
            //this.state.canvas.width = entries[0].devicePixelContentBoxSize[0].inlineSize;
            //this.state.canvas.height = entries[0].devicePixelContentBoxSize[0].blockSize;
            resolution[0] = entries[0].target.clientWidth;
            resolution[1] = entries[0].target.clientHeight;
            const factor = resolution[0] > resolution[1] ? resolution[0] : resolution[1];
            aspectRatio[0] = resolution[0] / factor;
            aspectRatio[1] = resolution[1] / factor;
        });
    
        observer.observe(canvas)
        canvas.addEventListener('mousemove', (event:MouseEvent) => {
            mouse[2] = mouse[0]; // last position x
            mouse[3] = mouse[1]; // last position y
            mouse[0] = event.offsetX/canvas.clientWidth;
            mouse[1] = event.offsetY/canvas.clientHeight;
        });
    
        const fps = () => {
            fpsListener && fpsListener.onFPS({ fps: (frame / elapsed).toFixed(2), time: elapsed.toFixed(1)} );
        }
    
        const render = async () => {
            if (crtl.reset) {
                frame = 0;
                elapsed = 0;
                idle = 0;
                this.reset();
                start = performance.now();
            }
    
            if (crtl.play && !intid) {
                intid = setInterval(() => fps(), 1000);
            }
    
            if (!crtl.play && intid) {
                clearInterval(intid);
                intid = 0;
            }
    
            if ( crtl.play || crtl.reset ) {
                if (crtl.reset) crtl.reset = false; 
        
                await this.frame(frame, { 
                    sys: { 
                        frame: frame, 
                        time: elapsed, 
                        mouse: mouse, 
                        resolution: resolution,
                        aspect: aspectRatio 
                    }, ...unis });
    
                elapsed = ((performance.now() - start) / 1000) - idle;
    
                frame++;        
    
            } else {
                idle = ((performance.now()- start)/1000) - elapsed;
            }
    
            if (crtl.delta != 0) setTimeout(()=>requestAnimationFrame(render), crtl.delta);
            else requestAnimationFrame(render);
        }
    
        requestAnimationFrame(render);
    }
    
}

