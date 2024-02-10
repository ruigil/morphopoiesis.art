import { PSpec, loadWGSL, loadJSON, square, scaleAspect } from "../../lib/poiesis/index.ts";


export const gol = async (wgsl:string, json:string) => {

    const code = await loadWGSL(wgsl);
    const defs = await loadJSON(json);


    const spec = (w:number,h:number): PSpec => {
        const size = scaleAspect(w,h,128);
        console.log("size" , size);
        const current = Array(size.x*size.y).fill(0).map(() => Math.random() > 0.9 ? 1 : 0);

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