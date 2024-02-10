import { PSpec, loadWGSL, loadJSON, triangle } from "../../lib/poiesis/index.ts";

export const boids = async (wgsl:string, json:string) => {

    const code = await loadWGSL(wgsl);
    const defs = await loadJSON(json);

    const spec = ():PSpec => {
        const numBoids = 2000;
        const boids = Array(numBoids).fill({}).map( (e,i) => ({
            pos: [2 * Math.random() - 1, 2 * Math.random() - 1],
            vel: [2 * Math.random() - 1, 2 * Math.random() - 1],
            pha: 2 * Math.PI * Math.random() 
        }));

        return {
            code: code,
            defs: defs,
            geometry: {
                vertex: {
                    data: triangle(1.),
                    attributes: ["apos"]    
                },
                instance: {
                    attributes: ["partPos","partVel","partPha"],
                    instances: numBoids
                }
            },
            uniforms: {
                params: {
                    boids: numBoids,
                    deltaT: .01,
                    scale: .015,
                    forces: [.04, .025, .025, .02], // last one is mouse force
                    // separation, cohesion, alignment
                    distances: [2., 4., 6., 1.] // boid size is 1.
                }
            },
            storages: [
                { name: "particlesA", size: numBoids , data: boids, vertex: true} ,
                { name: "particlesB", size: numBoids , vertex: true} 
            ],
            computes: [
                { name: "computeMain", workgroups:  [Math.ceil(numBoids / 64), 1, 1] },
            ],
            bindings: [ [0,4,1,2,3], [0,4,2,1,3] ]
        }
    }

    return spec;
}