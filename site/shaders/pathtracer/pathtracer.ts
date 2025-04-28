import { PSpec, Definitions } from "../../lib/poiesis/index.ts";

export const pathtracer = async (code:string, defs:Definitions) => {

    const size = {x : 1024, y: 1024 }
    const empty = new ImageData(size.x, size.y);
    const emptyBitmap = await createImageBitmap(empty);

    const radians = (degrees:number):number => degrees * Math.PI / 180;

    const uniforms = { params: { samples: 2, depth: 4, fov: radians(60), lookFrom: [0,1.5,4], lookAt: [0,1.5,1], aperture: 0.05, clear: 0 } }

    const spec =  ():PSpec => {

        return {
            code: code,
            defs: defs,
            uniforms: () => uniforms,
            mouse: (x:number,y:number) => {  uniforms.params.lookFrom = [(x*5)-2.5,1.5 + (y*2.5) - 1.25,4]; },
            storages: [
                { name: "samples", size: size.x * size.y }
            ],
            textures: [
                { name: "image", data: emptyBitmap },
                { name: "buffer", data: emptyBitmap, storage: true }
            ],
            computes: [
                { name: "pathTracer", workgroups: [ Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "denoise", workgroups: [ Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
            ],
            bindings: [ [0,1,2,3,5,6], [0,1,3,2,5,6] ]
        }
    }

    return spec;
}