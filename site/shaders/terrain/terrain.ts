import { PSpec, Definitions } from "../../lib/poiesis/index.ts";

export const terrain = async (code: string, defs: Definitions, fx: any) => {
    return (): PSpec => ({ 
        code: code, 
        defs: defs,
        clearColor: { r: 0.6, g: 0.8, b: 1.0, a: 1.0 } // Sky blue background
    });
}
