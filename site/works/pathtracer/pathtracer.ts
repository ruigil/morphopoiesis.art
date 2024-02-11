import { PSpec, loadWGSL, loadJSON } from "../../lib/poiesis/index.ts";
import { scaleAspect } from "../../lib/poiesis/utils.ts";

export const pathtracer = async (wgsl:string, json:string) => {

    const code = await loadWGSL(wgsl);
    const defs = await loadJSON(json);

    const spec =  async (w:number, h: number):Promise<PSpec> => {
        const size = scaleAspect(w,h,256); 
        const empty = new ImageData(size.x, size.y);
        const emptyBitmap = await createImageBitmap(empty);

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

    return await spec;
}