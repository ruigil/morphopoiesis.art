import { PSpec, Definitions, square, scaleAspect, quad } from "../../lib/poiesis/index.ts";

export const charge = (code: string, defs: Definitions) => {

    const spec = (w: number, h: number): PSpec => {
        // Reduced grid size with aspect ratio corrected for the simulation
        const size = scaleAspect(w, h, 512); 

        // Initialize a cell with default values
        const charge = (charge: number, pos: [number,number], vel: [number,number] ) => (
            { charge: charge, pos: pos, vel: vel }
        );
        
        const numCharges = 100;
        const charges = Array.from({ length: numCharges }, (_,i) => {
            const c = i == 0 ? -20. : i < numCharges / 2 ?  -15. : 15.;
            const x = Math.random() * size.x ;
            const y = Math.random() * size.y ;
            
            return charge(c, [x, y], [0, 0]);    
        });

        // Calculate workgroup sizes
        const wx = Math.ceil(size.x / 16);
        const wy = Math.ceil(size.y / 16);
        // size of the partialReduce array
        const sizePartial = wx * wy;
        // how many workgroup do we need to reduce the partials
        const reduceWGCount = Math.ceil(sizePartial / 256)

        return {
            code: code,
            defs: defs,
            geometry: { ...quad(1.), instances: size.x * size.y },
            uniforms: () => ({
                sim: {
                    size: [size.x, size.y],
                    numCharges: numCharges,
                    damping: .8,
                    dt: .1
                }
            }),
            storages: [
                { name: "charges", size: numCharges, data: charges },
                { name: "cellsA", size: size.x * size.y },
                { name: "cellsB", size: size.x * size.y },
                { name: "potentialRangeValue", size: 1 },
                { name: "potentialRange", size: 1 },
                { name: "partialPotential", size: sizePartial }
            ],
            computes: [
                { name: "initField", workgroups: [wx, wy, 1] },
                { name: "depositCharges", workgroups: [Math.ceil(numCharges / 256), 1, 1 ] },
                { name: "solvePotential", workgroups: [wx, wy, 1], instances: 64 }, // Run some iterations of the Gauss-Seidel solver
                { name: "computeField", workgroups: [wx, wy, 1] },
                { name: "updateCharges", workgroups: [Math.ceil(numCharges / 256), 1, 1 ] },
                { name: "reducePotentialRange", workgroups: [reduceWGCount, 1, 1] },
            ],
            bindings: [ [0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 3, 2, 4, 6, 5, 7] ] // Swap buffers between iterations
        };
    };

    return spec;
};
