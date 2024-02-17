import { PSpec, Definitions, square, scaleAspect } from "../libs/poiesis/index.ts";

export const dla = async (code:string,defs:Definitions) => {

    const spec = (w:number,h:number):PSpec => {
        const numWaterDrops = 70000;
        const size = scaleAspect(w,h,512);

        // initialize the water drops with random positions and velocities
        const waterDrops = Array.from({ length: numWaterDrops }, () => ({
            pos: [2 * Math.random() - 1, 2 * Math.random() - 1],
            vel: [2 * Math.random() - 1, 2 * Math.random() - 1],
        }))
        // initialize the ice with a few nucleation points
        const ice = Array.from({ length: size.x * size.y }, () => Math.random() < 0.00003 ? 1 : 0);

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
                params: {
                    size: [size.x, size.y],
                    drops: numWaterDrops,
                    fcolor: [0,196,255],
                    bcolor: [0,0,16]
                }
            },
            storages: [
                { name: "drops", size: numWaterDrops , data: waterDrops},
                { name: "iceA", size: size.x * size.y, data: ice} ,
                { name: "iceB", size: size.x * size.y, data: ice } 
            ],
            computes: [
                { name: "computeIce", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeDrops", workgroups: [Math.ceil(numWaterDrops / 64), 1, 1] }
            ],
            computeGroupCount: 16,
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }

    return spec;
}
