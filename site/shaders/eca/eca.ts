import { PSpec, Definitions, square, scaleAspect } from "../../lib/poiesis/index.ts";

export const eca = async (code: string, defs: Definitions) => {
    // Default rule is Rule 30, which produces complex patterns
    let currentRule = 30;

    const spec = (w: number, h: number): PSpec => {
        const size = scaleAspect(w, h, 256);
        // Initialize the first row with a single cell in the middle
        const current = new Array(size.x * size.y).fill(0);
        current[Math.floor(size.x / 2)] = 1;

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
            uniforms: () => ({
                uni: {
                    size: [size.x, size.y],
                    fcolor: [1., .75, .25],
                    bcolor: [.125, .125, .25],
                    rule: currentRule
                }
            }),
            // Update rule based on mouse X position
            mouse: (x, y) => {
                currentRule = Math.floor(x  * 256);
            },
            storages: [
                { name: "current", size: current.length, data: current },
                { name: "next", size: current.length },
            ],
            computes: [
                { name: "computeMain", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
            ],
    
            bindings: [ [0, 4, 1, 2], [0, 4, 2, 1] ]
        }
    }

    return spec;
}
