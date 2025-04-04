import { PSpec, Definitions } from "../../lib/poiesis/index.ts";

export const mandelbrot = async (code: string, defs: Definitions, fx: any) => {
    return (): PSpec => ({ 
        code: code, 
        defs: defs,
        clearColor: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 } // Black background
    });
}
