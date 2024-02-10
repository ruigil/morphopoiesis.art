import { PSpec, loadWGSL, loadJSON, square, scaleAspect } from "../../lib/poiesis/index.ts";

export const dla = async (wgsl:string,json:string) => {

    const code = await loadWGSL(wgsl);
    const defs = await loadJSON(json);

    const spec = (w:number,h:number):PSpec => {
        const numParticles = 40000;
        const size = scaleAspect(w,h,512);

        const particles = Array(numParticles).fill({}).map(() => ({
            pos: [2 * Math.random() - 1, 2 * Math.random() - 1],
            vel: [2 * Math.random() - 1, 2 * Math.random() - 1],
        }))
        // initialize the ice with a few nucleation points
        const ice = Array(size.x * size.y).fill(0).map(() => Math.random() < 0.00001 ? 1 : 0);

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
                    drops: numParticles,
                    fcolor: [0,255,255],
                    bcolor: [0,0,0]
                }
            },
            storages: [
                { name: "drops", size: numParticles , data: particles} ,
                { name: "iceA", size: size.x * size.y, data: ice} ,
                { name: "iceB", size: size.x * size.y, data: ice } 
            ],
            computes: [
                { name: "computeIce", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeDrops", workgroups: [Math.ceil(numParticles / 64), 1, 1] }
            ],
            computeGroupCount: 5,
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }

    return spec;
}
