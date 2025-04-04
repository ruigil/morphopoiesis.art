import { PSpec, Definitions, square, scaleAspect } from "../../lib/poiesis/index.ts";

export const cyclic = async (code: string, defs: Definitions) => {

    const spec = (w: number, h: number): PSpec => {
        const size = scaleAspect(w, h, 512);
        
        // Initialize with random states (0-6)
        const current = Array.from({ length: size.x * size.y }, () => Math.floor(Math.random() * 4));

        // Define colors for each state (RGB values)
        const colors = [
            [50, 50, 200],    // State 0: Blue
            [200, 50, 50],    // State 1: Red
            [50, 200, 50],    // State 2: Green
            [200, 200, 50],   // State 3: Yellow
        ];

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
                    colors: colors,
                    threshold: 3  // Threshold for state transition (can be adjusted)
                }
            }),
            storages: [
                { name: "current", size: current.length, data: current },
                { name: "next", size: current.length },
            ],
            computes: [
                { name: "computeMain", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
            ],
    
            bindings: [ [0, 4, 1, 2, 3], [0, 4, 2, 1, 3] ]
        }
    }

    return spec;
}
