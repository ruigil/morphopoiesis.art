import { PSpec, loadWGSL, loadJSON, square, scaleAspect } from "../../lib/poiesis/index.ts";

export const rd = async (wgsl:string, json:string) => {

    const code = await loadWGSL(wgsl);
    const defs = await loadJSON(json);

    const spec =  (w:number,h:number) : PSpec => {
        const size = scaleAspect(w,h,512);
        const current = Array(size.x * size.y).fill([0,0]).map((v,i) => [ 1 , (Math.random() > 0.001 ? 0 : 1) ] );

        return {
            code: code,
            defs: defs,
            geometry: {
                vertex: {
                    data: square(1.),
                    attributes: ["pos"],
                    instances: size.x * size.y    
                }
            },
            uniforms: {
                uni: {
                    size: [size.x, size.y]
                }
            },
            storages: [
                { name: "current", size: size.x * size.y, data: current } ,
                { name: "next", size: size.x * size.y}
            ],
            computes: [
                { name: "computeMain", workgroups:  [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
            ],
            computeGroupCount: 32,
            bindings: [ [0,4,1,2], [0,4,2,1] ]
        }
    }

    return spec
}