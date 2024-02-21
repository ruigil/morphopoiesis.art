
import { PSpec, Definitions, scaleAspect, square } from "../../lib/poiesis/index.ts";


export const ligrowth = async (code: string,defs: Definitions, fx:any ) => {

    const spec = (w:number,h:number):PSpec => {
        const numWaterDrops = 40000;
        const size = scaleAspect(w,h,512);

        // initialize the water drops with random positions and velocities
        const waterDrops = Array.from({ length: numWaterDrops }, () => ({
            pos: [ 1.5 * Math.random() - .75,   1.5 * Math.random() - .75],
            vel: [ 2 * Math.random() - 1,  2 * Math.random() - 1],
        }))
        const circle = (i:number) => {
            const x = i % size.x - size.x / 2;
            const y = Math.floor(i / size.x) - size.y / 2;
            return Math.abs((x * x + y * y)  -  (128*128)) < 10 ;
        }
        const line = (i:number) => {
            const x = i % size.x - size.x / 2;
            const y = Math.floor(i / size.x) - size .y / 2;
            return Math.abs(y) < 1 ;
        }
        // initialize the ice with a few nucleation points
        //const ice = Array.from({ length: size.x * size.y }, () => Math.random() < 0.003 ? 1 : 0);
        const ice = Array.from({ length: size.x * size.y }, (_,i:number) =>  0);

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
                    mode: 0,
                }
            },
            storages: [
                { name: "drops", size: numWaterDrops , data: waterDrops},
                { name: "iceA", size: size.x * size.y, data: ice} ,
                { name: "iceB", size: size.x * size.y, data: ice },
                { name: "debug", size: 1, read: true }
            ],
            computes: [
                { name: "initializeSeeds", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeIce", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeDrops", workgroups: [Math.ceil(numWaterDrops / 64), 1, 1] },
            ],
            computeGroupCount: 16,
            bindings: [ [0,1,2,3,4,5], [0,1,3,2,4,5] ]
        }
    }

    return spec;
}
    