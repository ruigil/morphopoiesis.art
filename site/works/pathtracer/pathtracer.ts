import { PSpec, loadWGSL, loadJSON } from "../../lib/poiesis/index.ts";

export const pathtracer = async (wgsl:string, json:string) => {

    const code = await loadWGSL(wgsl);
    const defs = await loadJSON(json);
    const size = 256; 
    const empty = new ImageData(size, size);
    const emptyBitmap = await createImageBitmap(empty);

    const spec = ():PSpec => {
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
                { name: "pathTracer", workgroups: [size / 8, size / 8, 1] }
            ],
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }

    return spec;
}