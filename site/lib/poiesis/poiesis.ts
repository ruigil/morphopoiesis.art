// <reference types="./webgpu.d.ts" />
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
    BufferInfo
} from "./poiesis.interfaces.ts";
import { square } from "./utils/utils.ts";


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

        //console.log(adapter.limits);

        const device = await adapter.requestDevice();

        context.configure({
            device: device,
            format: navigator.gpu.getPreferredCanvasFormat(),
        });


        return new PContext({
            context: context,
            device: device
        })
    }
    
    private constructor( state: PoiesisState ) {
        this.state = {...state};
    }
    
    build( wgslSpec : PSpec ): PContext {

        const makeBufferView = (defs:BufferInfo, size: number = 1): BufferView => {
            const buffer = defs.isArray ? new ArrayBuffer(defs.arrayStride * size) :  new ArrayBuffer(defs.size);
        
            const ArrayType = (type:string) => {
                switch (type) {
                    case "f32": return Float32Array;
                    case "u32": return Uint32Array;
                    case "i32": return Int32Array;
                }
                return Uint8Array;
            }

            const makeView = (def:BufferInfo):any => {
                if (def.isArray) {
                    return Array.from({ length:def.arrayCount },(e:BufferInfo, i:number ) => makeView({
                        ...def,
                        isArray: false,
                        offset: (i * def.arrayStride) + def.offset, // must accumulate offset for arrays in structs
                        size: def.size // corresponds to the byteSize of the array elements
                    }));
                } else if (def.isStruct) {
                    return Object.fromEntries(
                        Object.entries(def.members).map( ([key,value]) => 
                            [key, makeView({ ...value, offset: value.offset + def.offset })] 
                        )
                    );
                } else {
                    const AT = ArrayType(def.type);
                    return new AT(buffer, def.offset, def.size / AT.BYTES_PER_ELEMENT);
                }
            }
        

            const getViewValue = (defs:BufferInfo, view:any, size: number):any => {
                if (defs.isArray) {
                    return Array.from( {length: size }, (e, i):any => getViewValue({...defs, isArray:false}, view[i], size));
                } else if (defs.isStruct) {
                    return Object.fromEntries(
                        Object.entries(defs.members).map( ([key,value]) => 
                            [key, getViewValue(value, view[key], value.arrayCount)] 
                        )
                    )
                } else {
                    return view.length > 1 ? Array.from(view) : view[0];
                }
            }

            const setViewValue = (defs:BufferInfo, view:any, size: number, data:any) => {
                if (defs.isArray) {
                    Array.from({ length: size }, (e, i):any => { if (data && data[i]) setViewValue({...defs, isArray: false}, view[i], size, data[i] ) } );
                } else if (defs.isStruct) {
                    Object.entries(defs.members).map( ([key,value]) => {
                        if (data[key]) setViewValue(value, view[key], value.arrayCount, data[key]);
                    });
                } else {
                    data && view.length > 1 ? view.set(data) : view.set([data]);
                }
            }
                
            const updateBuffer = (src: ArrayBuffer) => {
                new Uint8Array(buffer).set(new Uint8Array(src));
            }

            // must specify size for dynamic arrays
            const view = makeView({...defs, offset: 0, arrayCount: defs.arrayCount !=0 ? defs.arrayCount : size });

            return {
                name: defs.name,
                buffer: buffer,
                set: (data:any) => setViewValue(defs, view, size, data),
                get: () => getViewValue(defs, view, size),
                update: (buffer: ArrayBuffer) => updateBuffer(buffer)
            } as BufferView;
        }

        const createShaderModule = (spec: PSpec) => {
            if (!spec.code) throw new Error("Code is not defined in spec");

            return this.state.device.createShaderModule({
                label: "Custom shader",
                code: spec.code
            });
        }

        const createGeometry = (spec: PSpec): Geometry => {

            const buffersLayout:GPUVertexBufferLayout[] = [];

            // iterate over the inputs of the vertex shader and create the vertex buffer layout with the attributes passed as parameters
            const makeLayout = ( step: GPUVertexStepMode, attrs: Array<string> ): GPUVertexBufferLayout => {
                
                const format = (type:string,size:number) => {
                    return `${(type == 'f32' ? 'float32' : 'u32' ? 'uint32' : 'int32' )}x${ size/4 }`
                };
                
                // assume only one vertex shader in the module
                const inputs = spec.defs.entries.vertex.inputs;
                let stride = 0;
                const vattrs = inputs.filter( (i:any) => attrs.includes(i.name) ).map( (i:any): GPUVertexAttribute => {                
                    const attr = {
                        shaderLocation: i.location,
                        offset: stride,
                        format: format(i.type, i.size) as GPUVertexFormat,
                    } 
                    stride += i.size;
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
                // the instance data is separate from the vertex data
                // the process iterates each vertex, for every instance
                // we can specify data for each vertex or for each instance.
                if (spec.geometry.instance.data) {
                    // TODO: this is expecting an array buffer format and the rest of the spec is expecting a json object
                    // this is only for instance initialization data, because if we want to change the instance data we must do that
                    // in a compute shader with vertexStorage and a ping pong mechanism
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

            return {
                vertexBuffer: vertexBuffer,
                vertexCount: vertices.length / 2, // only works for 2d?
                vertexBufferLayout: buffersLayout,
                instances: instancesCount,
                instanceBuffer: instancesBuffer
            }
        }

        const createUniforms = (spec: PSpec) : Uniform[] => {

            const uniforms = spec.uniforms ? spec.uniforms(0,[0,0,0,0]) : {};
            const uniRessource:Array<Uniform> = [];

            for (const [key, value] of Object.entries(spec.defs.uniforms as Record<string,BufferInfo>)) {
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
            };

            return uniRessource
        }

        const createStorage = (spec: PSpec) : StorageTypes => {
            const stateStorage:Storage[] = new Array<Storage>();
            const readStorage:ReadStorage[] = new Array<ReadStorage>();
            const vertexStorage:VertexStorage[] = new Array<VertexStorage>();

            const storage = (name:string)=> {
                return spec.storages ? spec.storages.find((element) => element.name === name) : undefined;
            }

            for (const [key,value] of Object.entries(spec.defs.storages)) {
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

            return {
                storages: stateStorage,
                readStorages: readStorage,
                vertexStorages: vertexStorage
            }
        }

        const createSamplers = (spec: PSpec) => {
            // TODO: add sampler spec
            const samplers = spec.defs.samplers.map( sd => ({
                binding: sd.binding,
                resource: this.state.device.createSampler({
                    label: sd.name,
                    magFilter: 'linear',
                    minFilter: 'linear',
                }),
                type: 'sampler'
            }) as Resource);
            return samplers;
        }

        const createTextures = (spec: PSpec) => {

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

            const textures = spec.defs.textures.map( td => {
                const tex = spec.textures ? spec.textures.find( e => e.name === td.name) : undefined;
                if (!tex) throw new Error(`Texture spec for ${td.name} is undefined`);
                if (!tex.data) throw new Error(`Texture data for ${td.name} is undefined`);
                const resource:Texture = tex.data instanceof HTMLVideoElement ? 
                    { 
                        binding: td.binding,
                        resource: this.state.device.importExternalTexture({ source : tex.data }),
                        type: 'external_texture',
                        video: tex.data
                    }:
                    { 
                        binding: td.binding,
                        resource: texture(tex.data, tex.storage ? 'storage_texture': 'texture'),
                        type: tex.storage ? 'storage_texture': 'texture'
                    };
                return resource;
            });
         
            return textures;
        }

        const createBindGroupLayout = (resources: Resource[]) => {
            const entries:Array<GPUBindGroupLayoutEntry> = [];

            resources.forEach( res => {
                switch (res.type) {
                    case "uniform": 
                        entries.push({ 
                            binding: res.binding,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, 
                            buffer: { type: res.type }
                        }); break;;
                    case "storage": 
                        entries.push({ 
                            binding: res.binding,
                            visibility: GPUShaderStage.COMPUTE, 
                            buffer: { type: res.type }
                        }); break;;
                    case "read-only-storage": 
                        entries.push({ 
                            binding: res.binding,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, 
                            buffer: { type: res.type }
                        }); break;;
                    case "sampler": 
                        entries.push({ 
                            binding: res.binding,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, 
                            sampler: { type: "filtering" }
                        }); break;;
                    case "texture":
                        entries.push({ 
                            binding: res.binding,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, 
                            texture: { viewDimension: "2d" }
                        }); break;;
                    case "storage_texture":
                        entries.push({ 
                            binding: res.binding,
                            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, 
                            storageTexture: { viewDimension: "2d", format: "rgba8unorm" },
                        }); break;;
                    case "external_texture": 
                        entries.push({ 
                            binding: res.binding,
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

        const createBindings = (spec:PSpec, resources:Resource[], bindGroupLayout: GPUBindGroupLayout) => {
            // only have a single bind group for now
            const resbinding = new Array(spec.defs.bindGroupLength);
    
            resources.forEach( res => {
                resbinding[res.binding] = res.resource;
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
                    if (index == undefined) throw new Error(`Binding ${j} was not found in group ${i}. Check your bindings spec.`);
                    const res = resbinding[index];
                    if (!res) throw new Error(`Binding ${index} defined in group ${i} not found`);

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

        const createComputePipelines = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout, spec: PSpec): ComputeGroupPipeline => {
            const pipelines: Compute[] = [];

            // we must have a computeGrouCount that is a multiple of the bindings groups
            // we must always end in the same binding group we started if we want to show the current state in the next iteration
            const computeGC = (spec: PSpec) => {
                const gc = spec.bindings ? spec.bindings.length : 1;
                const cgc = spec.computeGroupCount ?  spec.computeGroupCount : 1;
                return cgc > 1 ? cgc + (gc - ((cgc-2) % gc) - 1) : 1;
            }

            const compute = (name: string)  => spec.computes ? spec.computes.find( e => e.name === name) : undefined;

            for( let i = 0; i< spec.defs.entries.computes.length; i++) {
                const entryPoint = spec.defs.entries.computes[i].name;
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
                computeGroupCount: computeGC(spec)
            };
        }

        const createRenderPipeline = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout, spec: PSpec) => {            
                 
            if ( !spec.defs.entries.vertex || !spec.defs.entries.fragment) return undefined;

            const vertexEntryPoint = spec.defs.entries.vertex.name;
            const fragmentEntryPoint = spec.defs.entries.fragment.name;

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

        const shaderModule = createShaderModule(wgslSpec);
        const geometry = createGeometry(wgslSpec);
        const uniforms = createUniforms(wgslSpec);
        const storages = createStorage(wgslSpec);
        const samplers = createSamplers(wgslSpec);
        const textures = createTextures(wgslSpec);

        const resources = [...uniforms, ...storages.storages, ...samplers, ...textures];
        
        const bindGroupLayout = createBindGroupLayout(resources);
        const pipelineLayout = createPipelineLayout(bindGroupLayout);
        const bindings = createBindings(wgslSpec, resources, bindGroupLayout);
        
        const renderPipeline = createRenderPipeline(shaderModule, pipelineLayout, wgslSpec);
        const computePipelines = createComputePipelines(shaderModule, pipelineLayout, wgslSpec);
        
        
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
        });
    }

    addBufferListener( listener: BufferListener ) {        
        
        return new PContext({
            ...this.state,
            bufferListeners: [listener]
        });
    }

    async frame(frame: number = 0, unis?: any) {
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
                // you cant' have a writing and reading storage vertex at the same time in the vertex shader
                if (storages && storages.vertexStorages.length > 0) {
                    pass.setVertexBuffer(1, storages.vertexStorages[bindGroup(frame)].buffer)
                } else if (geometry?.instanceBuffer) {
                     pass.setVertexBuffer(1, geometry.instanceBuffer)
                }
                
                pass.setBindGroup(0, pipelines.bindings(bindGroup(frame)));
                if (geometry) pass.draw(geometry.vertexCount, geometry.instances || 1 );
    
                pass.end();    
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
                // unmap pending maps if we are resseting 
                //buffers.forEach(s => s.dstBuffer.unmap() );
                await Promise.all(buffers.map( buff => buff.dstBuffer.mapAsync(GPUMapMode.READ) ))
                bufferListeners.forEach((listener) => {
                    const data = buffers.map(s=> {
                        s.view.update(s.dstBuffer.getMappedRange());
                        return s.view;
                    });
                    listener.onRead( data );
                    buffers.forEach(s=> s.dstBuffer.unmap() );
                });    
            } 
        }
 
        // update uniforms
        setUniforms(unis);

        // submit commands
        submitCommands();

        // read buffers into staging buffers
        await readBuffers();

    }

}

