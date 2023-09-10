import { PoiesisSpec } from "../../../lib/poiesis/poiesis.interfaces.ts";
import { loadWGSL, triangle } from "../../../lib/poiesis/utils.ts";

export const boids = async () => {

    const code = await loadWGSL(`/assets/shaders/boids/boids.wgsl`);

    const spec = ():PoiesisSpec => {
        const size = 2000;
        const boids = Array(size).fill({}).map( (e,i) => ({
            pos: [2 * Math.random() - 1, 2 * Math.random() - 1],
            vel: [2 * Math.random() - 1, 2 * Math.random() - 1],
            pha: 2 * Math.PI * Math.random() 
        }));

        return {
            code: code,
            geometry: {
                vertex: {
                    data: triangle(1.),
                    attributes: ["apos"]    
                },
                instance: {
                    attributes: ["partPos","partVel","partPha"],
                    instances: size
                }
            },
            uniforms: {
                params: {
                    deltaT: .01,
                    scale: .015,
                    forces: [.04, .025, .025, .02], // last one is mouse force
                    // separation, cohesion, alignment
                    distances: [2., 4., 6., 1.] // boid size is 1.
                }
            },
            storages: [
                { name: "particlesA", size: size , data: boids, vertex: true} ,
                { name: "particlesB", size: size , vertex: true} 
            ],
            computes: [
                { name: "computeMain", workgroups:  [Math.ceil(size / 64), 1, 1] },
            ],
            bindings: [ [0,4,1,2,3], [0,4,2,1,3] ]
        }
    }

    return spec;
}