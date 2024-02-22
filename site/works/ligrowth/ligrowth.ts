
import { random } from "../../../../../.cache/deno/npm/registry.npmjs.org/nanoid/3.3.7/index.d.ts";
import { PSpec, Definitions, scaleAspect, square } from "../../lib/poiesis/index.ts";


export const ligrowth = async (code: string,defs: Definitions, fx:any ) => {

    const spec = (w:number,h:number):PSpec => {
        const numWaterDrops = 40000;
        const size = scaleAspect(w,h,512);
        const aspect = { x: size.x / Math.min(size.x, size.y), y: size.y / Math.min(size.x, size.y) }

        // initialize the water drops with random positions and velocities
        const waterDrops = Array.from({ length: numWaterDrops }, () => {
            const angle = Math.random() * Math.PI * 2;
            const radius = { x: Math.random() * (.8/aspect.x) , y: Math.random() * (.8/aspect.y) };
            return {
                pos: [ 1.5 * Math.random() - .75, 1.5 * Math.random() - .75 ],
                vel: [2 * Math.random() - 1., 2 * Math.random() - 1]
            }
        });
        // initialize the ice with a few nucleation points
        //const ice = Array.from({ length: size.x * size.y }, () => Math.random() < 0.003 ? 1 : 0);
        // initialization is done in the shader, because of 2d utils libs
        const ice = Array.from({ length: size.x * size.y }, (_,i:number) =>  0);
        const stringToSeed = (str:string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              let char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash |= 0;  // Convert to 32bit integer
            }
            return hash;
        }
          
        const seededRandom = (count: number) => {
        console.log("fxhash --- ",fx.hash)
        let seed = stringToSeed(fx.hash);
        const rand = [];
        for (let i = 0; i < count; i++) {
            let x = Math.sin(seed++) * 10000;
            rand.push(x - Math.floor(x));
            seed++;
        }
        rand[3] = Math.floor(rand[3] * 9);
        return rand;
        }
        
        let mode = fx ? seededRandom(4) : [.4,.2,.1,3];
          
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
                    mode: mode
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
    