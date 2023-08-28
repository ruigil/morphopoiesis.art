import { WGPUSpec } from "../../../lib/webgpu/webgpu.interfaces.ts";
import { WGPUContext, Utils } from "../../../lib/webgpu/webgpu.ts";

export const rd = async () => {

    const code = await Utils.loadWGSL(`/assets/shaders/reaction-diffusion/reaction-diffusion.wgsl`);

    const spec =  () : WGPUSpec => {
        const size = 512;
        const current = Array(size * size * 2).fill(0).map((v,i) => i % 2 == 0 ? 1 : (Math.random() > 0.01 ? 0 : 1) );
        return {
            code: code,
            geometry: {
                vertex: {
                    data: Utils.square(1.),
                    attributes: ["pos"],
                    instances: size * size    
                }
            },
            uniforms: {
                uni: {
                    size: [size, size]
                }
            },
            storage: [
                { name: "current", size: size * size, data: current } ,
                { name: "next", size: size * size}, 
            ],
            compute: [
                { name: "computeMain", workgroups:  [size / 8, size / 8, 1], instances: 32 },
            ],
            bindings: {
                groups: [ [0,4,1,2,3], [0,4,2,1,3] ],
                currentGroup: (frame:number) => frame % 2,
            }      
        }
    }

    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

    const context = await WGPUContext.init(canvas!);

    return context.build(spec);
}