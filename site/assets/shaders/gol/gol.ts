import { PSpec } from "../../../lib/poiesis/poiesis.interfaces.ts";
import { loadWGSL, square } from "../../../lib/poiesis/utils.ts";

export const gol = async () => {

    const code = await loadWGSL(`/assets/shaders/gol/gol.wgsl`);

    const spec = (): PSpec => {
        const size = 128;
        const current = Array(size*size).fill(0).map(() => Math.random() > 0.5 ? 1 : 0);

        return {
            code: code,
            geometry: {
                vertex: {
                    data: square(1.),
                    attributes: ["pos"],
                    instances: size * size    
                }
            },
            uniforms: {
                uni: {
                    size: [size, size],
                    fcolor: [0,0,0],
                    bcolor: [255,255,255]
                }
            },
            storages: [
                { name: "current", size: current.length, data: current } ,
                { name: "next", size: size * size } 
            ],
            computes: [
                { name: "computeMain", workgroups:  [size / 8, size / 8, 1] },
            ],
    
            bindings: [ [0,4,1,2], [0,4,2,1] ]
        }
    }

    return spec;
}