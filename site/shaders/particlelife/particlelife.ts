import { PSpec, Definitions, square, scaleAspect } from "../../lib/poiesis/index.ts";

export const particlelife = (code:string, defs:Definitions) => {

    const spec = (w:number,h:number):PSpec => {
        const numAgents = 1;
        const size = scaleAspect(w,h,64); 

        const aspect = { x: size.x / Math.min(size.x, size.y), y: size.y / Math.min(size.x, size.y) }

        const agents = Array.from({ length: numAgents }, () => {
            const angle = Math.random() * Math.PI * 2;
            const radius = { x: Math.random() * (.5/aspect.x) , y: Math.random() * (.5/aspect.y) };
            const type = [0,0,0,0];
            type[Math.floor(Math.random() * 3)] = 1;
            console.log(type);
            return {
                pos: [Math.cos(angle) * radius.x, Math.sin(angle) * radius.y],
                vel: [Math.random() - .5, Math.random() - .5],
                t: type
            }
        });

        const seedMap = Array.from({ length: size.x * size.y }, () => ({ seed: [0, 0], distance: 0., dirty: 0. }));
        
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
            uniforms: (f:number) => ({
                params: {
                    size: [size.x, size.y],
                    agents: numAgents,
                    sa: 22.5 * (Math.PI / 180),
                    sd: 40.,
                    evaporation: .95,
                    step: f % 4
                }
            }),
            storages: [
                { name: "agents", size: numAgents , data: agents} ,
                { name: "debug", size: 1, read: true },
                { name: "seedMapA", size: size.x * size.y, data: seedMap},
                { name: "seedMapB", size: size.x * size.y } 
            ],
            computes: [
                { name: "computeKernel", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeAgents", workgroups: [Math.ceil(numAgents / 64), 1, 1] }
            ],
            bindings: [ [0,1,2,3,4,5], [0,1,3,2,4,5] ]
        }
    }

    return spec
}