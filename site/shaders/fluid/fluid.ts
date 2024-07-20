import { PSpec, Definitions, square, scaleAspect } from "../../lib/poiesis/index.ts";

export const fluid = async (code:string, defs:Definitions) => {

    const spec = (w:number,h:number):PSpec => {
        const size = scaleAspect(w,h,512);

        const cell = (vel:[number,number], pressure:number, dye: [number,number,number], solid: number) => (
            { velocity: vel, pressure: pressure, dye: dye, solid: solid }
        )
        const circle = (x:number, y:number, r:number): boolean => Math.hypot(x,y) < r;
        const solid = (x:number, y:number): number =>  ( x == 0 || y == size.y-1 ||  circle(size.x/2-x,(size.y/3)-y,40)) ? 1 : 0;
    
        const fluid =  Array.from( { length: size.x * size.y }, (_,i) => 
            cell( [0,0], 0, [0,0,0], solid(i % size.x, Math.floor(i / size.x) )) );

        const wx = Math.ceil(size.x / 8);
        const wy = Math.ceil(size.y / 8);
            
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
                sim: {
                    size: [size.x, size.y],
                    dt: 1. / 60.
                }
            }),
            storages: [
                { name: "fluidA", size: size.x * size.y, data: fluid },
                { name: "fluidB", size: size.x * size.y, data: fluid },
                { name: "divergence", size: size.x * size.y }
            ],
            computes: [
                { name: "advect", workgroups: [wx, wy, 1] },
                { name: "addForces", workgroups: [wx, wy, 1] },
                { name: "computeDivergence", workgroups: [wx, wy, 1]},
                { name: "pressureSolver", workgroups: [wx, wy, 1], instances: 40},
                { name: "subtractPressureGradient", workgroups: [wx, wy, 1]}
            ],
            computeGroupCount: 1,
            bindings: [ [0,1,2,3,4], [0,1,3,2,4] ]
        }
    }

    return spec;
}