import { PSpec, Definitions, square, scaleAspect } from "../../lib/poiesis/index.ts";

export const chaosgame = async (code: string, defs: Definitions) => {

    const spec = (w: number, h: number): PSpec => {
        const size = scaleAspect(w, h, 1024);
        
        // Initialize with zeros
        const current = Array.from({ length: size.x * size.y }, () => 0);

        // Default color for the Sierpinski triangle (bright green-blue)
        const defaultColor = [0.1, 0.4, 0.7];

        return {
            code: code,
            defs: defs,
            geometry: {
                vertex: {
                    data: square(1.),
                    attributes: ["pos"],
                    instances: size.x * size.y  // One instance per pixel
                }
            },
            uniforms: () => ({
                uni: {
                    size: [size.x, size.y],
                    color: defaultColor // Default color
                }
            }),
            storages: [
                { name: "current", size: current.length, data: current },
                { name: "next", size: current.length }
            ],
            computes: [
                { name: "computeClear", workgroups: [Math.ceil(size.x / 8), Math.ceil(size.y / 8), 1] },
                { name: "computeChaos", workgroups: [4096, 1, 1] } // each workgroup has 64 threads so this gives 4096 * 64 = 262144 calls
            ],
            bindings: [ [0, 4, 1, 2], [0, 4, 2, 1] ] // Ping-pong between buffers
        }
    }

    return spec;
}
