import { PSpec, Definitions } from "../../../lib/poiesis/index.ts";

export const pathtracer = async (code:string, defs:Definitions) => {

    const size = {x : 512, y: 512 } 
    const empty = new ImageData(size.x, size.y);
    const emptyBitmap = await createImageBitmap(empty);

    const spec =  (w:number, h: number):PSpec => {

        return {
            code: code,
            defs: defs,
            storages: [
                { name: "debug", size: 1, read: true }
            ],
            textures: [
                { name: "tex", data: emptyBitmap },
                { name: "buffer", data: emptyBitmap, storage: true }
            ],
            computes: [
                { name: "pathTracer", workgroups: [ Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] }
            ],
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }

    return spec;
}