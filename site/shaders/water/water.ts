import { PSpec, Definitions, scaleAspect, quad } from "../../lib/poiesis/index.ts";

export const water = async (code:string, defs:Definitions) => {

    const spec = (w:number,h:number): PSpec => {
        const size = scaleAspect(w,h,256);
        const current = Array.from({ length: size.x*size.y }, () => 0);

        return {
            code: code,
            defs: defs,
            geometry: { ...quad(1.), instances: size.x * size.y },
            uniforms: () => ({
                uni: {
                    size: [size.x, size.y],
                    fcolor: [0,0,0],
                    bcolor: [255,255,255]
                }
            }),
            storages: [
                { name: "current", size: current.length, data: current } ,
                { name: "next", size: current.length },
            ],
            computes: [
                { name: "computeMain", workgroups:  [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
            ],
    
            bindings: [ [0,4,1,2], [0,4,2,1] ]
        }
    }

    return spec;
}    