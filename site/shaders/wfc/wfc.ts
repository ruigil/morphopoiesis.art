
import { PSpec, Definitions, scaleAspect, square } from "../../lib/poiesis/index.ts";

export const wfc = (code: string,defs: Definitions ) => {

    return (w:number, h: number): PSpec => {

        const size = scaleAspect(w,h,16);
        const current = Array.from({ length: size.x*size.y }, (_,i) => ({value: 0x7FF, entropy: 0xFFFF, adjency: 0xFFFF}));
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
            uniforms: () => ({
                uni: {
                    size: [size.x, size.y],
                }
            }),
            storages: [
                { name: "current", size: current.length, data: current } ,
                { name: "next", size: current.length, data:current },
                { name: "min_value", size: 1, data:[0xFFFF] },
            ],
            computes: [
                { name: "computeEntropy", workgroups:  [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeCandidates", workgroups:  [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeCollapse", workgroups:  [1, 1, 1] },
                { name: "computePropagation", workgroups:  [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
            ],

            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    };
}
    