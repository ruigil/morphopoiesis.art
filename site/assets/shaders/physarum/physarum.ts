import { PSpec } from "../../../lib/poiesis/poiesis.interfaces.ts";
import { loadWGSL, square } from "../../../lib/poiesis/utils.ts";

export const physarum = async () => {

    const code = await loadWGSL(`/assets/shaders/physarum/physarum.wgsl`);

    const spec = ():PSpec => {
        const numAgents = 20000;
        const size = 1024;

        const agents = Array(numAgents).fill({}).map(() => {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * .7;
            return {
                pos: [Math.cos(angle) * radius, Math.sin(angle) * radius],
                vel: [Math.random() - .5, Math.random() - .5]
            }
        });
        
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
                params: {
                    size: [size, size],
                    agents: numAgents,
                    sa: 22.5 * (Math.PI / 180),
                    sd: 20.,
                    evaporation: .995,
                }
            },
            storages: [
                { name: "agents", size: numAgents , data: agents} ,
                { name: "trailMapA", size: size * size } ,
                { name: "trailMapB", size: size * size } ,
            ],
            computes: [
                { name: "computeTrailmap", workgroups: [size / 8, size / 8, 1] },
                { name: "computeAgents", workgroups: [Math.ceil(numAgents / 64), 1, 1] }
            ],
            computeGroupCount: 3,
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }

    return spec
}