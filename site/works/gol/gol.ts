import { PSpec, Definitions, square, scaleAspect } from "../libs/poiesis/index.ts";

export const gol = async (code:string, defs:Definitions) => {

    const spec = (w:number,h:number): PSpec => {
        const size = scaleAspect(w,h,128);
        const current = Array.from({ length: size.x*size.y }, () => Math.random() > 0.9 ? 1 : 0);

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
                    size: [size.x, size.y],
                    fcolor: [0,0,0],
                    bcolor: [255,255,255]
                }
            },
            storages: [
                { name: "current", size: current.length, data: current } ,
                { name: "next", size: current.length },
            ],
            computes: [
                { name: "computeMain", workgroups:  [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
            ],
    
            bindings: [ [0,4,1,2,3], [0,4,2,1,3] ]
        }
    }

    return spec;
}