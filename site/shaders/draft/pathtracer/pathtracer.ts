import { PSpec, Definitions } from "../../../lib/poiesis/index.ts";

export const pathtracer = async (code:string, defs:Definitions) => {

    const size = {x : 512, y: 512 }
    const empty = new ImageData(size.x, size.y);
    const emptyBitmap = await createImageBitmap(empty);

    const radians = (degrees:number):number => degrees * Math.PI / 180;

    const uniforms = { params: { samples: 1, depth:4, fov: radians(60), lookFrom: [0,2,5], lookAt: [0,1.5,1], aperture: 0.0 } }
    
    const spec =  (w:number, h: number):PSpec => {

        return {
            code: code,
            defs: defs,
            uniforms: (f:number) => uniforms,
            mouse: (x:number,y:number, frame:number) => {  uniforms.params.lookFrom = [(x*5.)-2.5,2. + (y*3.5) - 1.75,5];  },
            storages: [
                { name: "debug", size: 1, read: true },
                { name: "samples", size: size.x * size.y },
            ],
            textures: [
                { name: "image", data: emptyBitmap },
                { name: "buffer", data: emptyBitmap, storage: true }
            ],
            computes: [
                { name: "pathTracer", workgroups: [ Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "denoise", workgroups: [ Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] }
            ],
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4,5,6], [0,1,3,2,4,5,6] ]
        }
    }

    return spec;
}