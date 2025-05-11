import { PSpec, Definitions, square, scaleAspect, quad } from "../../../lib/poiesis/index.ts";

export const slime = (code:string, defs:Definitions) => {

    const spec = (w:number,h:number):PSpec => {
        const numAgents = 20000;
        const size = scaleAspect(w,h,1024);

        const aspect = { x: size.x / Math.min(size.x, size.y), y: size.y / Math.min(size.x, size.y) }

        const agents = Array.from({ length: numAgents }, () => {
            const angle = Math.random() * Math.PI * 2;
            const radius = { x: .5 + Math.random() * (.3/aspect.x) , y: .5 + Math.random() * (.5/aspect.y) };
            return {
                pos: [Math.cos(angle) * radius.x, Math.sin(angle) * radius.y],
                vel: [Math.random() - .5, Math.random() - .5]
            }
        });
        
        return {
            code: code,
            defs: defs,
            geometry: { ...quad(1.), instances: size.x * size.y },
            uniforms: () => ({
                params: {
                    size: [size.x, size.y],
                    agents: numAgents,
                    sa: 22.5 * (Math.PI / 180),
                    sd: 70.,
                    evaporation: .995,
                    inverse: 1
                }
            }),
            storages: [
                { name: "agents", size: numAgents , data: agents} ,
                { name: "trailMapA", size: size.x * size.y } ,
                { name: "trailMapB", size: size.x * size.y } 
            ],
            computes: [
                { name: "computeTrailmap", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeAgents", workgroups: [Math.ceil(numAgents / 64), 1, 1] }
            ],
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }

    return spec
}