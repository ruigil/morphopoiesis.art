import { PSpec, Definitions, triangle } from "../../lib/poiesis/index.ts";

export const boids = (code:string, defs:Definitions) => {

    const spec = ():PSpec => {
        const numBoids = 2000;
        const boids = Array.from({ length: numBoids }, () => ({
            pos: [2 * Math.random() - 1, 2 * Math.random() - 1],
            vel: [2 * Math.random() - 1, 2 * Math.random() - 1],
            pha: 2 * Math.PI * Math.random()
        }));

        return {
            code: code,
            defs: defs,
            geometry: { ...triangle(1.), instances: numBoids },
            uniforms: () => ({
                params: {
                    boids: numBoids,
                    deltaT: .01,
                    scale: .015,
                    forces: [.04, .025, .025, .02], // last one is mouse force
                    // separation, cohesion, alignment
                    distances: [2., 4., 6., 1.] // boid size is 1.
                }
            }),
            storages: [
                { name: "particlesA", size: numBoids , data: boids} ,
                { name: "particlesB", size: numBoids } 
            ],
            computes: [
                { name: "computeMain", workgroups:  [Math.ceil(numBoids / 64), 1, 1] },
            ],
            bindings: [ [0,4,1,2], [0,4,2,1] ],
            clearColor: { r: 0, g: 0, b: 0, a: 0 },
        }
    }

    return spec;
}