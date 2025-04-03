import { buffer } from "node:stream/consumers";
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
    PoiesisInstance,
    VariableType,
    ArrayType,
    TypedArray,
    StructType,
} from "./poiesis.interfaces.ts";

import { square } from "./utils/utils.ts";


export const Poiesis = async (canvas: HTMLCanvasElement) => {
    let state: PoiesisState;

    if (!canvas) {
        throw new Error("Canvas is not defined");
    }
    
    const context = canvas.getContext("webgpu") as GPUCanvasContext;
    if (!context) {
        throw new Error("WebGPU not supported on this browser.");
    }
    
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found. WebGPU may not be supported on this device/browser.");
    }

    //console.log(adapter.limits);
    const device = await adapter.requestDevice();
    if (!device) {
        throw new Error("No device found ! <br/>WebGPU is a new standard for graphics on the web.<br/>The standard is currently implemented only <a href='https://caniuse.com/webgpu'>on certain browsers</a>.<br/> For the full experience please use a supported browser. <br/>");
    }

    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
    });


    state = {
        context: context,
        device: device
    }
    
    const makeBufferView = (variable: VariableType, size: number = 1): BufferView =>  {
        
        // Create appropriate view object based on the structured definition
        const createView = (def: VariableType, baseOffset: number = 0): unknown => {
            // Handle primitive types
            if ('primitive' in def) {
                return createPrimitiveView(def.primitive, buffer, baseOffset, def.size);
            }
        
            // Handle template types (vec2, vec3, etc.)
            if ('template' in def) {
                return createPrimitiveView(def.template.primitive, buffer, baseOffset, def.template.size);
            }
            
            // Handle struct types
            if ('struct' in def) {
                return createStructView(def, baseOffset);
            }
            
            // Handle array types
            if ('array' in def) {
                return createArrayView(def, buffer, baseOffset, size);
            }
            
            // If we get here, we don't know how to handle this type
            console.error("Unknown type in makeBufferView", def);
            return null;
        }
    
        const getArrayType = (type:string) => {
            switch (type) {
                case 'f32': return Float32Array;
                case 'i32': return Int32Array;
                case 'u32': return Uint32Array;
                default: return Uint8Array;
            }
        }
        
        const createPrimitiveView = (type: string, buffer: ArrayBuffer, offset: number, size: number): TypedArray => {      
            const AT = getArrayType(type);
            return new AT(buffer, offset, size / AT.BYTES_PER_ELEMENT);
        }
                
        const createStructView = (def: StructType, baseOffset: number): Record<string, unknown> => {
            const result: Record<string, unknown> = {};
            
            // Create views for each member of the struct
            for (const [name, member] of Object.entries(def.struct.members)) {
                const memberOffset = baseOffset + (member.offset || 0);
                result[name] = createView(member, memberOffset);
            }
            
            return result;
        }
        
        const createArrayView = (def: ArrayType, buffer: ArrayBuffer, baseOffset: number, dynamicSize: number = 1): unknown[] | TypedArray => {
            const element = def.array.element;
            const count = def.array.count != 0 ? def.array.count : dynamicSize;
            const stride = def.array.stride || element.size;
            
            // If the array elements are primitives and we know the stride, we can optimize
            if ('primitive' in element && stride === element.size) {
                // For simple arrays of primitives, return a single typed array
                return createPrimitiveView(element.primitive, buffer, baseOffset, count * stride);
            }
            
            // For arrays of more complex types or with padding between elements
            const result = new Array(count);
            for (let i = 0; i < count; i++) {
                const elementOffset = baseOffset + (i * stride);
                result[i] = createView(element, elementOffset);
            }
            
            return result;
        }
                
        // Get function that retrieves values from the view
        const getValue = (viewObj: any, def: VariableType): unknown => {
            if (!viewObj) return null;
            
            // Handle primitive types
            if ('primitive' in def) {
                return viewObj.length > 1 ? Array.from(viewObj) : viewObj[0];
            }
            
            // Handle template types (vec2, vec3, etc.)
            if ('template' in def) {
                return Array.from(viewObj);
            }
            
            // Handle struct types
            if ('struct' in def) {
                const result: Record<string, unknown> = {};
                for (const [name, member] of Object.entries(def.struct.members)) {
                result[name] = getValue(viewObj[name], member);
                }
                return result;
            }
            
            // Handle array types
            if ('array' in def) {
                if (Array.isArray(viewObj)) {
                return viewObj.map((item) => getValue(item, def.array.element));
                } else {
                // It's a single typed array for primitive types
                return Array.from(viewObj);
                }
            }
            
            return null;
        }
        
        // Set function that applies values to the view
        const setValue = (viewObj: any, def: VariableType, data: unknown): void => {
            if (!viewObj || data === undefined) return;
            
            // Handle primitive types
            if ('primitive' in def) {
                if (Array.isArray(data) && viewObj.length > 1) {
                viewObj.set(data);
                } else {
                viewObj[0] = Number(data);
                }
                return;
            }
            
            // Handle template types (vec2, vec3, etc.)
            if ('template' in def) {
                if (Array.isArray(data)) {
                const length = Math.min(viewObj.length, data.length);
                for (let i = 0; i < length; i++) {
                    viewObj[i] = Number(data[i]);
                }
                }
                return;
            }
            
            // Handle struct types
            if ('struct' in def && typeof data === 'object' && data !== null) {
                for (const [name, member] of Object.entries(def.struct.members)) {
                if (name in data) {
                    setValue(viewObj[name], member, (data as Record<string, unknown>)[name]);
                }
                }
                return;
            }
            
            // Handle array types
            if ('array' in def && Array.isArray(data)) {
                if (Array.isArray(viewObj)) {
                const length = Math.min(viewObj.length, data.length);
                for (let i = 0; i < length; i++) {
                    setValue(viewObj[i], def.array.element, data[i]);
                }
                } else {
                // It's a single typed array for primitive types
                viewObj.set(data.slice(0, viewObj.length));
                }
                return;
            }
        }
        
        // Update function to replace the buffer content
        const updateBuffer = (newBuffer: ArrayBuffer): void => {
            const newData = new Uint8Array(newBuffer);
            const target = new Uint8Array(buffer);
            target.set(newData.slice(0, Math.min(newData.length, target.length)));
        }

        // Create the buffer based on the size information in the definition
        // if the size is zero is because is a dynamic array
        const totalSize = variable.size != 0 ? variable.size : ((variable as ArrayType).array.stride || 1) * size;
        
        const buffer = new ArrayBuffer(totalSize);
        // Main view object for the data
        const view = createView(variable);
        
        return {
            buffer,
            set: (data: unknown) => setValue(view, variable, data),
            get: () => getValue(view, variable),
            update: updateBuffer
        };
    }
  
    const createShaderModule = (spec: PSpec) => {
        if (!spec.code) throw new Error("Code is not defined in spec");

        return state.device.createShaderModule({
            label: "Custom shader",
            code: spec.code
        });
    }

    const createGeometry = (spec: PSpec): Geometry => {

        if (!spec.defs.entries?.vertex) return { vertexCount: 0 }

        const buffersLayout:GPUVertexBufferLayout[] = [];

        // iterate over the inputs of the vertex shader and create the vertex buffer layout with the attributes passed as parameters
        const makeLayout = ( step: GPUVertexStepMode, attrs: Array<string> ): GPUVertexBufferLayout => {
            
            const format = (type:string,size:number) => {
                return `${(type === 'f32' ? 'float32' : type === 'u32' ? 'uint32' : 'int32' )}x${ size/4 }`
            };
            
            // assume only one vertex shader in the module
            const inputs = spec.defs.entries?.vertex?.inputs;
            let stride = 0;
            const vattrs = inputs?.filter( (i:any) => attrs.includes(i.name) ).map( (i:any): GPUVertexAttribute => {                
                const attr = {
                    shaderLocation: i.location,
                    offset: stride,
                    format: format(i.type, i.size) as GPUVertexFormat,
                } 
                stride += i.size;
                return attr;                    
            });
            if ((!vattrs) || (vattrs.length == 0)) throw new Error(`Vertex attributes ${attrs} not found`);
            return {
                arrayStride: stride,
                stepMode: step,
                attributes: vattrs
            }
        }

        // there is always a vertex buffer with a default square template geometry
        const vertices = new Float32Array(spec.geometry && spec.geometry.vertex.data || square(1.) ) 
        buffersLayout.push(makeLayout("vertex",spec.geometry?.vertex.attributes || ["pos"]))
        const vertexBuffer = state.device.createBuffer({
            label: "Geometry vertices",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        state.device.queue.writeBuffer(vertexBuffer, 0, vertices);

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

                instancesBuffer = state.device.createBuffer({
                    label: "Geometry instance",
                    size: vertices.byteLength,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                });
                state.device.queue.writeBuffer(vertexBuffer, 0, vertices);     
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

        const uniforms = spec.uniforms ? spec.uniforms(0) : {};
        const uniRessource:Array<Uniform> = [];

        for (const [key, value] of Object.entries(spec.defs.uniforms)) {
            const uniformDef = value;
            const uniformView = makeBufferView(uniformDef);
            if (uniforms[key]) {
                uniformView.set(uniforms[key]);
            }

            const uniformBuffer = state.device.createBuffer({
                label: "uniforms",
                size: uniformView.buffer.byteLength,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            state.device.queue.writeBuffer(uniformBuffer, 0, uniformView.buffer);

            uniRessource.push({
                name: key,
                view: uniformView,
                resource: { buffer: uniformBuffer },
                binding: uniformDef?.binding || 0,
                type: "uniform"
            })
        };

        return uniRessource
    }

    const createStorage = (spec: PSpec) : StorageTypes => {
        const stateStorage:Storage[] = new Array<Storage>();
        const readStorage:ReadStorage[] = new Array<ReadStorage>();
        const vertexStorage:VertexStorage[] = new Array<VertexStorage>();
        const storages = spec.storages?.reduce( (acc,v) => { acc[v.name] = v; return acc;} , {} as Record<string,any>) || {};
        for (const [key,value] of Object.entries(spec.defs.storages)) {
            const storageDef = value;
            const storageSpec = storages[key];
            if (!storageSpec) throw new Error(`Storage spec for ${key} not found`);
            const storageView = makeBufferView(storageDef,storageSpec.size);
            const storageBuffer = state.device.createBuffer({
                label: `${key} storage buffer`,
                size: storageView.buffer.byteLength, // number of bytes to allocate
                usage:  GPUBufferUsage.STORAGE | 
                        GPUBufferUsage.COPY_DST | 
                        (storageSpec.read ? GPUBufferUsage.COPY_SRC : 0) | 
                        (storageSpec.vertex ? GPUBufferUsage.VERTEX : 0),
            });
            // if the buffer is marked as read, then we allocate a staging buffer to read the data
            if (storageSpec.read) {
                readStorage.push({
                    name: storageSpec.name,
                    srcBuffer: storageBuffer,
                    listener: undefined,
                    dstBuffer: state.device.createBuffer({
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
            state.device.queue.writeBuffer(storageBuffer, 0, storageView.buffer);
            stateStorage.push({
                binding: storageDef.binding || 0,
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
        if (!spec.defs.samplers) return [];
        const samplers = spec.defs.samplers.map( sd => ({
            binding: sd.binding,
            resource: state.device.createSampler({
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

            const texture = state.device.createTexture({
                label: l,
                size: { width: image.width, height: image.height },
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            });

            state.device.queue.copyExternalImageToTexture(
                { source: image },
                { texture: texture },
                [ image.width, image.height ]
            );

            return texture.createView( { format: "rgba8unorm" , label: l});
        }

        const textSpecs = spec.textures?.reduce( (acc,v) => { acc[v.name] = v; return acc;} , {} as Record<string,any>) || {};
        if (!spec.defs.textures) return [];
        const textures = spec.defs.textures.map( td => {
            const tex = textSpecs[td.name];
            if (!tex) throw new Error(`Texture spec for ${td.name} is undefined`);
            if (!tex.data) throw new Error(`Texture data for ${td.name} is undefined`);
            const resource:Texture = tex.data instanceof HTMLVideoElement ? 
                { 
                    binding: td.binding,
                    resource: state.device.importExternalTexture({ label: "external_texture", source : tex.data }),
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
        const bindGroupLayout = state.device.createBindGroupLayout({
            label: "Bind Group Layout",
            entries: entries
        });
        return bindGroupLayout;
    }

    const createBindings = (spec:PSpec, resources:Resource[], bindGroupLayout: GPUBindGroupLayout) => {
        // only have a single bind group for now
        const resbinding = new Array(spec.defs.bindGroupLength);
        resources.forEach( res => {
            resbinding[res.binding] = res;
        });

        // the spec of bindings is an array of arrays, where each array is a group of bindings
        // the definition of bindings in the spec doesnt have to match the order of the resources
        // that's why we need to reorder the resources to match the spec
        // when there are several groups, we take the first group as reference for the bindings
        // so [4,2,3,1] means binding 4 is first, binding 2 is second, etc.
        // when there are two groups, we use the first group as reference and the second group 
        // reorders the resources for the first group bindings
        const bindingsCount = resources.length;
        const bindingGroupsCount = spec.bindings?.length || 1;
        const bindingGroups = new Array<GPUBindGroup>(bindingGroupsCount);
        
        const externals = Array<{ idx: number, video: HTMLVideoElement}>(bindingGroupsCount);            
        const entries = Array<GPUBindGroupEntry[]>(bindingGroupsCount);
        
        for (let i = 0; i < bindingGroupsCount; i++) {
            entries[i] = [];
            for (let j = 0; j < bindingsCount; j++) {
                
                // if bindings are not defined, use the default order
                const index = spec.bindings ? spec.bindings[i][j] : j;
                if (index == undefined) throw new Error(`Binding ${j} was not found in group ${i}. Check your bindings spec.`);
                const res = resbinding[index];
                if (!res) throw new Error(`Binding ${index} defined in group ${i} not found`);

                entries[i].push({
                    // we need to use the first group to define the bindings reference
                    // we want to keep the binding order but change the resources order
                    binding: spec.bindings ? spec.bindings[0][j] : j, 
                    resource: res.resource
                })
                if (res.type === 'external_texture') {
                    // cannot have more than one external per group
                    externals[i] = { idx: j, video: (res as Texture).video! };
                };
            }

            bindingGroups[i] = state.device.createBindGroup({  
                label: `Bind Group ${i}`,
                layout: bindGroupLayout,
                entries: entries[i],
            })
        }
        return (index:number) => {
            // if the group has an external texture, we have to recreate the group binding every frame
            // importing the texture from the video
            
            if (externals[index]) {
                const { idx, video } = externals[index];
                entries[index][idx].resource = state.device.importExternalTexture({ source : video });
                return state.device.createBindGroup({
                    label: `Bind Group ${index}`,
                    layout: bindGroupLayout,
                    entries: entries[index],
                })
            }
            return bindingGroups[index]
        }            
    }

    const createPipelineLayout = (bindGroupLayout: GPUBindGroupLayout) => {
        return state.device.createPipelineLayout({
            label: "Pipeline Layout",
            bindGroupLayouts: [ bindGroupLayout ],
        });
    }

    const createComputePipelines = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout, spec: PSpec): ComputeGroupPipeline | undefined => {
        const pipelines: Compute[] = [];

        // we must have a computeGrouCount that is a multiple of the bindings groups
        // we must always end in the same binding group we started if we want to show the current state in the next iteration
        const computeGC = (spec: PSpec) => {
            const gc = spec.bindings ? spec.bindings.length : 1;
            const cgc = spec.computeGroupCount ?  spec.computeGroupCount : 1;
            return cgc > 1 ? cgc + (gc - ((cgc-2) % gc) - 1) : 1;
        }

        if (!spec.defs.entries?.computes) return undefined;

        const computes = spec.computes?.reduce( (acc,v) => { acc[v.name] = v; return acc;} , {} as Record<string,any>) || {};
        for( let i = 0; i< spec.defs.entries.computes.length; i++) {
            const entryPoint = spec.defs.entries.computes[i].name;
            const c = computes[entryPoint];
            if (!c) throw new Error(`Spec for compute ${entryPoint} not found!`);

            const pipeline = state.device.createComputePipeline({
                label: `${entryPoint}`,
                layout: pipelineLayout,
                compute: {
                  module: shaderModule,
                  entryPoint: entryPoint,
                  constants: c.constants || {}
                }
            });

            pipelines.push({
                pipeline: pipeline,
                workgroups: c.workgroups || [1,1,1],
                instances: c.instances || 1
            });
        }
        // sort the pipelines by the spec order.
        const sortPipelines = spec.computes ? spec.computes.map( sc => pipelines.find( p => p.pipeline.label == sc.name) ).filter( p => p != undefined) : Array<Compute>();
        //console.log(sortPipelines)
        return {
            computeGroup: sortPipelines,
            computeGroupCount: computeGC(spec)
        };
    }

    const createRenderPipeline = (shaderModule: GPUShaderModule, pipelineLayout:GPUPipelineLayout, spec: PSpec, vertexBufferLayout?:GPUVertexBufferLayout[]) => {            
             
        if ( spec.defs.entries?.vertex && !spec.defs.entries?.fragment) throw new Error("Vertex entrypoint exist but Fragment entry point is missing");
        if ( !spec.defs.entries?.vertex && spec.defs.entries?.fragment) throw new Error("Fragment entrypoint exist but Vertex entry point is missing");
        if ( !spec.defs.entries?.vertex || !spec.defs.entries?.fragment) return undefined;

        const vertexEntryPoint = spec.defs.entries.vertex.name;
        const fragmentEntryPoint = spec.defs.entries.fragment.name;

        return state.device.createRenderPipeline({
            label: "Render pipeline",
            layout: pipelineLayout,
            vertex: {
              module: shaderModule,
              entryPoint: vertexEntryPoint,
              buffers: vertexBufferLayout
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

    const build = ( wgslSpec : PSpec ): PoiesisInstance => {
        console.log("build")
        const shaderModule = createShaderModule(wgslSpec);
        console.log("module created")
        const geometry = createGeometry(wgslSpec);
        const uniforms = createUniforms(wgslSpec);
        const storages = createStorage(wgslSpec);
        const samplers = createSamplers(wgslSpec);
        const textures = createTextures(wgslSpec);

        const resources = [...uniforms, ...storages.storages, ...samplers, ...textures];
        
        const bindGroupLayout = createBindGroupLayout(resources);
        const pipelineLayout = createPipelineLayout(bindGroupLayout);
        const bindings = createBindings(wgslSpec, resources, bindGroupLayout);
        
        const renderPipeline = createRenderPipeline(shaderModule, pipelineLayout, wgslSpec, geometry.vertexBufferLayout);
        const computePipelines = createComputePipelines(shaderModule, pipelineLayout, wgslSpec);
                
        state = {
            ...state,
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
        };
        return { addBufferListeners, run }
    }

    const addBufferListeners = ( listeners: BufferListener[] ) => {
        state.storages?.readStorages.forEach( rs => rs.listener = listeners.find( l => l.name === rs.name ))
    }

    const run = async (unis?: Record<string, unknown>, frame: number = 0 ) => {
        const { storages, device, uniforms, pipelines, geometry, context, clearColor, wgslSpec } = state;

        const bindGroup = (i:number) => wgslSpec!.bindings ? (i % wgslSpec!.bindings.length) : 0;

        const setUniforms = ( unis: Record<string, unknown> | undefined) => {
            if (!unis) return;
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
                        //console.log(compute.pipeline.label)
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
                const tv = context.getCurrentTexture().createView();
                const pass = encoder.beginRenderPass({
                    colorAttachments: [{
                        view: tv,
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
            if (state.storages && state.storages.readStorages.length > 0) {
                const storages = state.storages.readStorages.filter( s => s.listener )
                
                await Promise.all(storages.map( b => b.dstBuffer.mapAsync(GPUMapMode.READ)))
                storages.forEach((storage) => {
                    storage.view.update(storage.dstBuffer.getMappedRange());
                    storage.listener!.onRead( storage.view );
                    storage.dstBuffer.unmap();                    
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

    return { build }

}

