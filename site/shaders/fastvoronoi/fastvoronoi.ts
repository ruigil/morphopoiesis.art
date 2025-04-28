import { PSpec, Definitions, scaleAspect, quad } from "../../lib/poiesis/index.ts";

export const fastvoronoi = (code:string, defs:Definitions) => {

    const spec = (w:number,h:number):PSpec => {
        const numSeeds = 23;
        const size = scaleAspect(w,h,512); 

        const aspect = { x: size.x / Math.min(size.x, size.y), y: size.y / Math.min(size.x, size.y) }
        const seeds = Array.from({ length: numSeeds }, () => {
            const angle = Math.random() * Math.PI * 2;
            const radius = { x: Math.random() * (.5/aspect.x) , y: Math.random() * (.5/aspect.y) };
            return {
                pos: [Math.cos(angle) * radius.x, Math.sin(angle) * radius.y],
                vel: [Math.random() - .5, Math.random() - .5],
                kind: Math.floor(Math.random() * 4)
            }
        });

        const steps = Math.ceil(Math.log2(Math.max(size.x,size.y))) ;
        const stepSize = Math.pow(2.,steps);
        const instances =   ((steps) + (steps %2)) + 3

        return {
            code: code,
            defs: defs,
            geometry: { ...quad(1), instances: size.x * size.y },
            uniforms: () => ({
                params: {
                    size: [size.x, size.y],
                    seeds: numSeeds,
                    steps:  stepSize
                }
            }),
            storages: [
                { name: "seeds", size: numSeeds , data: seeds } ,
                { name: "cellCurrent", size: size.x * size.y },
                { name: "cellNext", size: size.x * size.y }
            ],
            computes: [
                { name: "initCells", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeSeeds", workgroups: [Math.ceil(numSeeds / 64), 1, 1] },
                { name: "jumpFlood", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1], instances: instances },
                ],
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }

    return spec
}