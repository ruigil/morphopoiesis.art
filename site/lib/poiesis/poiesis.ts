import {
    BufferListener,
    Geometry,
    Resource,
    Uniform,
    PSpec,
    PoiesisState,
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
    RenderPipeline,
    PoiesisGPU,
    StorageListener,
} from "./poiesis.types.ts";

import {
    ErrorManager,
    initializeWebGPU,
    PoiesisError,
    validateShaderRequirements,
    createShaderModuleWithErrorHandling
} from "./error/index.ts";

import { quad } from "./index.ts";

const makeBufferView = (variable: VariableType, size: number = 1): BufferView => {

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

    const getArrayType = (type: string) => {
        switch (type) {
            case 'f32': return Float32Array;
            case 'i32': return Int32Array;
            case 'u32': return Uint32Array;
            default: return Uint8Array;
        }
    }

    const createPrimitiveView = (type: string, buffer: ArrayBuffer, offset: number, size: number): TypedArray => {
        const AT = getArrayType(type);
        return new AT(buffer).subarray(offset / AT.BYTES_PER_ELEMENT, (offset + size) / AT.BYTES_PER_ELEMENT);
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

const createShaderModule = (device: GPUDevice,spec: PSpec) => {
    if (!spec.code) throw new Error("Code is not defined in spec");
    // Check if the shader has specific requirements
    if (spec.requirements) {
        validateShaderRequirements(
            device,
            spec.requirements.features || [],
            spec.requirements.limits || {}
        );
    }

    return createShaderModuleWithErrorHandling(device, spec.code);
}

const makeVertexBufferLayout = (inputs:any): GPUVertexBufferLayout => {
    /*
        Note: We assume that vertex information can be passed in geometry, 
        but instance information must me passed in storages and referenced with instance index.
        There is no 'instance' step in buffer layouts.
    */

    const format = (type: string, size: number) => {
        return `${(type === 'f32' ? 'float32' : type === 'u32' ? 'uint32' : 'int32')}x${size / 4}`
    };

    let stride = 0;
    const vattrs = inputs.map((i: any): GPUVertexAttribute => {
        const attr = {
            shaderLocation: i.location,
            offset: stride,
            format: format(i.type, i.size) as GPUVertexFormat,
        }
        stride += i.size;
        return attr;
    });

    return {
        arrayStride: stride,
        stepMode: "vertex",
        attributes: vattrs
    }    
}

const createGeometry = (device: GPUDevice, spec: PSpec): Geometry => {

    // if there is no vertex shader, there will be no rendering pipeline
    if (!spec.defs.entries?.vertex) return { vertices: 0, instances: 0 };

    // if we have a vertex shader but no geometry, we need to create a default geometry
    // we use a quad to fill the whole screen to give the fragment shader soemthing to draw on.
    const geometry = spec.geometry ? spec.geometry : { ...quad(1.), instances: 1 };
    
    const result:Geometry = { vertices: geometry.vertices, instances: geometry.instances || 1 }

    if (geometry.data) {
        const data = geometry.data 
        const vertexBuffer = device.createBuffer({
            label: "Geometry vertices",
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(vertexBuffer, 0, data);
        const inputs = spec.defs.entries?.vertex?.inputs?.filter((i: any) => i.size !== 0);
    
        result.vertexBuffer = vertexBuffer;
        result.vertexBufferLayout = inputs.length > 0 ? [ makeVertexBufferLayout(inputs) ] : [];

    }

    if (geometry.index) {
        const data = geometry.index; 
        const indexBuffer = device.createBuffer({
            label: "Geometry indices",
            size: data.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(indexBuffer, 0, data);

        result.indexBuffer = indexBuffer;        
    }

    return result;
}

const createUniforms = (device: GPUDevice, spec: PSpec): Uniform[] => {

    const specUniforms = spec.uniforms ? spec.uniforms(0) : {};

    const uniforms = Object.entries(spec.defs.uniforms).map(([key, definition]) => {
        const uniformView = makeBufferView(definition);

        if (specUniforms[key]) {
            uniformView.set(specUniforms[key]);
        }

        const uniformBuffer = device.createBuffer({
            label: "uniforms",
            size: uniformView.buffer.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(uniformBuffer, 0, uniformView.buffer);

        return {
            name: key,
            buffer: uniformBuffer,
            view: uniformView,
            resource: { buffer: uniformBuffer },
            binding: definition.binding || 0,
            type: "uniform"
        } as Uniform;
    });

    return uniforms
}

const createStorage = (device: GPUDevice, spec: PSpec): Storage[] => {

    const storagesSpec = spec.storages?.reduce((acc, v) => { acc[v.name] = v; return acc; }, {} as Record<string, any>) || {};

    const storages = Object.entries(spec.defs.storages).map(([key, storageDefinition]) => {
        
        const storageSpec = storagesSpec[key];
        if (!storageSpec) throw new Error(`Storage specification for ${key} not found`);
        
        const storageView = makeBufferView(storageDefinition, storageSpec.size);
        
        const storageBuffer = device.createBuffer({
            label: `${key} storage buffer`,
            size: storageView.buffer.byteLength, // number of bytes to allocate
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | (storageSpec.read ? GPUBufferUsage.COPY_SRC : 0) 
        });

        if (storageSpec.data) {
            storageView.set(storageSpec.data);
        }
        device.queue.writeBuffer(storageBuffer, 0, storageView.buffer);

        // if the buffer is marked as read, then we allocate a staging buffer to read the data
        const makeReadBuffer = () => ({
            name: storageSpec.name,
            srcBuffer: storageBuffer,
            listener: undefined,
            dstBuffer: device.createBuffer({
                label: `${storageSpec.name} read buffer`,
                size: storageView.buffer.byteLength,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            }),
            view: storageView
        });

        return {
            binding: storageDefinition.binding!, // a storage is a definition that must always have a binding
            buffer: storageBuffer,
            resource: { buffer: storageBuffer },
            type: storageDefinition.access === "read_write" ? "storage" : "read-only-storage",
            read: storageSpec.read && makeReadBuffer() 
        } as Storage;
    });

    return storages
}

const createSamplers = (device: GPUDevice, spec: PSpec):Resource[] => {
    // TODO: add sampler spec
    if (!spec.defs.samplers) return [];
    return spec.defs.samplers.map(sdef => ({
        binding: sdef.binding,
        resource: device.createSampler({
            label: sdef.name,
            magFilter: 'linear',
            minFilter: 'linear',
        }),
        type: 'sampler'
    }));
}

const createTextures = (device: GPUDevice, spec: PSpec):Texture[] => {

    const makeTexture = (image: ImageBitmap, format: GPUTextureFormat) => {

        const texture = device.createTexture({
            label: "texture",
            size: { width: image.width, height: image.height },
            format: format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        });

        device.queue.copyExternalImageToTexture(
            { source: image },
            { texture: texture },
            [image.width, image.height]
        );

        return texture;
    }

    const textSpecs = spec.textures?.reduce((acc, v) => { acc[v.name] = v; return acc; }, {} as Record<string, any>) || {};
    if (!spec.defs.textures) return [];
    
    const textures = spec.defs.textures.map(td => {
        const tex = textSpecs[td.name];
        if (!tex) throw new Error(`Texture spec for ${td.name} is undefined`);
        if (!tex.data) throw new Error(`Texture data for ${td.name} is undefined`);
        const video = tex.data instanceof HTMLVideoElement;
        if (video) {
            return {
                binding: td.binding,
                resource: device.importExternalTexture({ label: "external_texture", source: tex.data }),
                type: 'external_texture',
                video: tex.data
            }
        } else {
            const format = "rgba8unorm";
            const texture = makeTexture(tex.data, format);
            const type = tex.storage ? 'storage_texture' : 'texture';
            return {
                binding: td.binding,
                texture: texture,
                resource: texture.createView({ format: format, label: type }),
                type: type
            };
        }
    });

    return textures as Texture[];
}

const createBindGroupLayout = (device: GPUDevice, resources: Resource[]) => {
    //const entries: Array<GPUBindGroupLayoutEntry> = [];

    const entries: GPUBindGroupLayoutEntry[] = resources.map(res => {
        switch (res.type) {
            case "uniform":
                return {
                    binding: res.binding,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: res.type }
                };
            case "storage":
                return {
                    binding: res.binding,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: res.type }
                };
            case "read-only-storage":
                return {
                    binding: res.binding,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                    buffer: { type: res.type }
                }; 
            case "sampler":
                return {
                    binding: res.binding,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    sampler: { type: "filtering" }
                };
            case "texture":
                return {
                    binding: res.binding,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    texture: { viewDimension: "2d" }
                };
            case "storage_texture":
                return {
                    binding: res.binding,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    storageTexture: { viewDimension: "2d", format: "rgba8unorm" },
                };
            case "external_texture":
                return {
                    binding: res.binding,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    externalTexture: { viewDimension: "2d" }
                };
        }
    });

    // Create the bind group layout to be able to reuse the same variables and uniforms
    return device.createBindGroupLayout({
        label: "Bind Group Layout",
        entries: entries
    });
}

const createBindings = (device: GPUDevice, spec: PSpec, resources: Resource[], bindGroupLayout: GPUBindGroupLayout) => {
    // only have a single bind group for now
    const resbinding = new Array(spec.defs.bindGroupLength);
    resources.forEach(res => {
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

    const externals = Array<{ idx: number, video: HTMLVideoElement }>(bindingGroupsCount);
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

        bindingGroups[i] = device.createBindGroup({
            label: `Bind Group ${i}`,
            layout: bindGroupLayout,
            entries: entries[i],
        })
    }
    return (index: number) => {
        // if the group has an external texture, we have to recreate the group binding every frame
        // importing the texture from the video

        if (externals[index]) {
            const { idx, video } = externals[index];
            entries[index][idx].resource = device.importExternalTexture({ source: video });
            return device.createBindGroup({
                label: `Bind Group ${index}`,
                layout: bindGroupLayout,
                entries: entries[index],
            })
        }
        return bindingGroups[index]
    }
}

const createPipelineLayout = (device: GPUDevice, bindGroupLayout: GPUBindGroupLayout) => {
    return device.createPipelineLayout({
        label: "Pipeline Layout",
        bindGroupLayouts: [bindGroupLayout],
    });
}

const createComputePipelines = (device: GPUDevice, shaderModule: GPUShaderModule, pipelineLayout: GPUPipelineLayout, spec: PSpec): ComputeGroupPipeline | undefined => {
    const pipelines: Compute[] = [];

    // we must have a computeGrouCount that is a multiple of the bindings groups
    // we must always end in the same binding group we started if we want to show the current state in the next iteration
    const computeGC = (spec: PSpec) => {
        const gc = spec.bindings ? spec.bindings.length : 1;
        const cgc = spec.computeGroupCount ? spec.computeGroupCount : 1;
        return cgc > 1 ? cgc + (gc - ((cgc - 2) % gc) - 1) : 1;
    }

    if (!spec.defs.entries?.computes) return undefined;

    const computes = spec.computes?.reduce((acc, v) => { acc[v.name] = v; return acc; }, {} as Record<string, any>) || {};
    for (let i = 0; i < spec.defs.entries.computes.length; i++) {
        const entryPoint = spec.defs.entries.computes[i].name;
        const c = computes[entryPoint];
        if (!c) throw new Error(`Spec for compute ${entryPoint} not found!`);

        const pipeline = device.createComputePipeline({
            label: entryPoint,
            layout: pipelineLayout,
            compute: {
                module: shaderModule,
                entryPoint: entryPoint,
                constants: c.constants || {}
            }
        });



        pipelines.push({
            pipeline: pipeline,
            workgroups: c.workgroups || [1, 1, 1],
            instances: c.instances || 1
        });
    }
    // sort the pipelines by the spec order.
    const sortPipelines = spec.computes ? spec.computes.map(sc => pipelines.find(p => p.pipeline.label == sc.name)).filter(p => p != undefined) : Array<Compute>();
    return {
        computeGroup: sortPipelines,
        computeGroupCount: computeGC(spec)
    };
}

const createRenderPipeline = (device: GPUDevice, context: GPUCanvasContext | undefined, shaderModule: GPUShaderModule, pipelineLayout: GPUPipelineLayout, spec: PSpec, vertexBufferLayout?: GPUVertexBufferLayout[]): RenderPipeline | undefined => {

    if (!context) return undefined;
    if (!spec.defs.entries?.vertex || !spec.defs.entries?.fragment) return undefined;
    if (spec.defs.entries?.vertex && !spec.defs.entries?.fragment) throw new Error("Vertex entrypoint exist but Fragment entry point is missing");
    if (!spec.defs.entries?.vertex && spec.defs.entries?.fragment) throw new Error("Fragment entrypoint exist but Vertex entry point is missing");

    const vertexEntryPoint = spec.defs.entries.vertex.name;
    const fragmentEntryPoint = spec.defs.entries.fragment.name;

    const pipeline = device.createRenderPipeline({
        label: "Render pipeline",
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: vertexEntryPoint,
            buffers: vertexBufferLayout,
        },
        fragment: {
            module: shaderModule,
            entryPoint: fragmentEntryPoint,
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat()
            }]
        },

        primitive:{
            cullMode: 'back'
        },
        ...( spec.geometry?.depth ? { depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            }}: undefined),
    });
    const canvasTexture = context.getCurrentTexture(); 
    

    // if we need depth caculation in the geometry
    const depth = spec.geometry?.depth

    // because in each resize we reset, the depth texture will be recreated
    // but in a situation where we dont reset we have to listen to resizes to recreate the depth texture...
    const depthTexture =  depth ? device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    }): undefined

    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [{
            view: {} as any,
            loadOp: "clear",
            storeOp: "store",
            clearValue: spec.clearColor,
        }],
        // if we need depth caculation in the geometry
    ...( depth ? { 
        depthStencilAttachment: {
            view: depthTexture!.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        }} 
        : undefined )
    }

    return {
        pipeline: pipeline,
        descriptor: renderPassDescriptor,
        depthTexture: depthTexture
    }
}

const createCanvasContext = (device: GPUDevice, canvas: HTMLCanvasElement | undefined ): GPUCanvasContext | undefined => {
  
  if (!canvas) return undefined;
    canvas.width = Math.max(1, Math.min(canvas.width, device.limits.maxTextureDimension2D));
  canvas.height = Math.max(1, Math.min(canvas.height, device.limits.maxTextureDimension2D));

  // Get the WebGPU context
  const context = canvas.getContext('webgpu');
  if (!context) {
    const error: PoiesisError = {
      type: 'initialization',
      message: 'Failed to get WebGPU context from canvas',
      suggestion: 'Make sure the canvas element is properly initialized',
      fatal: true
    };
    ErrorManager.error(error);
    throw new Error('Failed to get WebGPU context from canvas');
  }

  // Configure the context
  const preferredFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: preferredFormat,
    alphaMode: 'premultiplied'
  });
  return context
}

export const Poiesis = async ():Promise<PoiesisGPU> => {

    let { device, features, limits } = await initializeWebGPU();
    let state:PoiesisState;

    const build = (wgslSpec: PSpec, canvas?: HTMLCanvasElement): PoiesisInstance => {
        const canvasContext = createCanvasContext(device, canvas);
        const shaderModule = createShaderModule(device, wgslSpec);
        const geometry = createGeometry(device, wgslSpec);
        const uniforms = createUniforms(device, wgslSpec);
        const storages = createStorage(device, wgslSpec);
        const samplers = createSamplers(device, wgslSpec);
        const textures = createTextures(device, wgslSpec);

        const resources = [...uniforms, ...storages, ...samplers, ...textures];

        const bindGroupLayout = createBindGroupLayout(device, resources);
        const pipelineLayout = createPipelineLayout(device, bindGroupLayout);
        const bindings = createBindings(device, wgslSpec, resources, bindGroupLayout);

        const renderPipeline = createRenderPipeline(device, canvasContext, shaderModule, pipelineLayout, wgslSpec, geometry.vertexBufferLayout);
        const computePipelines = createComputePipelines(device, shaderModule, pipelineLayout, wgslSpec);

        state = {
            context: canvasContext,
            geometry: geometry,
            uniforms: uniforms,
            storages: storages,
            textures: textures,
            pipelines: {
                render: renderPipeline,
                compute: computePipelines,
                bindings: bindings,
            },
            clearColor: wgslSpec.clearColor || { r: 0, g: 0, b: 0, a: 1 },
            wgslSpec: wgslSpec,
        };
        return { addBufferListeners, run, destroy }
    }

    const destroy = async () => {
        device.destroy();
        const adapter = await navigator.gpu.requestAdapter();
        device = await adapter!.requestDevice();
        
        // Add device lost handler
        device.lost.then((info:any) => {
            if (info.reason === 'destroyed') {
                return;
            }
            const error: PoiesisError = {
                type: 'runtime',
                message: `WebGPU device was lost: ${info.message}`,
                suggestion: 'Try refreshing the page or updating your graphics drivers',
                details: `Reason: ${info.reason}`,
                fatal: true
            };
            ErrorManager.error(error);
            throw new Error(`WebGPU device was lost: ${info.message}`);
        });
    }

    const addBufferListeners = (listeners: BufferListener[]) => {
        state.storageListeners = listeners.map( listener => {
            const storage = state.storages?.filter(s => s.read).find(s => s.read?.name === listener.name);
            return { ...listener, storage } as StorageListener
        }).filter( sl => sl.storage != undefined);
    }

    const run = async (unis?: Record<string, unknown>, frame: number = 0) => {
        const { storageListeners, uniforms, pipelines, geometry, context, wgslSpec } = state;

        const bindGroup = (i: number) => wgslSpec!.bindings ? (i % wgslSpec!.bindings.length) : 0;

        const setUniforms = (unis: Record<string, unknown> | undefined) => {
            if (!unis) return;
            uniforms?.forEach((uniform) => {
                if (unis[uniform.name]) {
                    uniform.view.set(unis[uniform.name]);
                    // copy the values from JavaScript to the GPU
                    device.queue.writeBuffer((uniform.resource as GPUBufferBinding).buffer, 0, uniform.view.buffer);
                }
            });
        }

        const submitCommands = () => {
            const encoder = device.createCommandEncoder();

            // compute pipelines
            if (pipelines?.compute) {
                const computePass = encoder.beginComputePass();

                for (let cg = 0; cg < pipelines.compute.computeGroupCount; cg++) {
                    // The computeGroupCount property is used to run a iteration of all the computes
                    // definined in the spec for each render view. It is the number of times 
                    // all the computes defined will be executed before calling the vertex and fragment shader once.
                    // we switch the bindings so it that it can ping-pong between buffers for each compute group
                    // the bindings will end at the same state as if the compute group would be runned once.
                    // so if we specify 2 compute group counts, it will actually rune 3 times to finish with the
                    // bindinds in the same state, 1,3,5,7 for 2 binding, 1,4,7,10 for 3 bindings, etc..
                    const bg = bindGroup(frame + cg)

                    for (let c = 0; c < pipelines.compute.computeGroup.length; c++) {
                        const compute = pipelines.compute.computeGroup[c];
                        computePass.setPipeline(compute.pipeline);
                        for (let i = 0; i < compute.instances; i++) {
                            // for each instance we dont switch the bindings, because it is 
                            // meant to be used in the same compute group.
                            computePass.setBindGroup(0, pipelines.bindings(bg));
                            computePass.dispatchWorkgroups(...compute.workgroups);
                        }
                    }
                }

                computePass.end();
            }

            // render pipeline
            if (pipelines?.render) {

                const colorAttach = pipelines.render.descriptor.colorAttachments as GPURenderPassColorAttachment[]                                
                // if we have a render pipline we alread made sure we have a context to draw.
                colorAttach[0].view = context!.getCurrentTexture().createView();

                const pass = encoder.beginRenderPass(pipelines.render.descriptor);
                pass.setPipeline(pipelines.render.pipeline);
                pass.setBindGroup(0, pipelines.bindings(bindGroup(frame)));
                
                if (geometry) {
                    const { vertexBuffer, indexBuffer, vertices, instances } = geometry;

                    if (vertexBuffer) pass.setVertexBuffer(0, vertexBuffer);
                    if (indexBuffer) {
                        pass.setIndexBuffer(indexBuffer,'uint32');
                        pass.drawIndexed(vertices, instances );
                    } else pass.draw(vertices , instances);
                }

                pass.end();
            }


            // copy read buffers
            if (storageListeners) {
                storageListeners.forEach(sl => {
                    const storage = sl.storage.read!;
                    encoder.copyBufferToBuffer(storage.srcBuffer, 0, storage.dstBuffer, 0, storage.view.buffer.byteLength);
                });
            }

            // submit commands
            device.queue.submit([encoder.finish()]);
        }

        const readBuffers = async () => {
            if (storageListeners) {
                // await for map async for all read storages that have a listener to be able to read them
                await Promise.all(storageListeners.map(sl => sl.storage.read!.dstBuffer.mapAsync(GPUMapMode.READ)))
                // notify listeners with the view content of the storage
                storageListeners.forEach((listener) => {
                    const storage = listener.storage.read!;
                    storage.view.update(storage.dstBuffer.getMappedRange());
                    listener.onRead(storage.view);
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

    return { build, features, limits }
}
