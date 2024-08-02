import { PSpec, Definitions, scaleAspect, square } from "../../lib/poiesis/index.ts";

export const wave = (code: string,defs: Definitions ) => {

    return (w:number, h: number): PSpec => {

        const size = scaleAspect(w,h,512);
        const current = Array.from({ length: size.x*size.y }, () => 0);
    
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
                    frequency: 11,
                    amplitude: 20,
                    osc: [ 
                        { amplitude: 3, frequency: 7, position: [size.x/2 ,size.y/2 + 100] },
                        { amplitude: 1, frequency: 5, position: [size.x/2 - 100,size.y/2 - 70] },
                        { amplitude: 2, frequency: 2, position: [size.x/2 + 100,size.y/2 - 70] }
                    ]
                }
            }),
            storages: [
                { name: "current", size: current.length, data: current } ,
                { name: "next", size: current.length }
            ],
            computes: [
                { name: "computeWave", workgroups:  [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
            ],

            bindings: [ [0,4,1,2], [0,4,2,1] ]
        }
    };
}
    