
import { PSpec, Definitions } from "../../lib/poiesis/index.ts";

export const mobius = async (code: string,defs: Definitions, fx:any ) => {

    return (): PSpec => (
        { 
            code: code, 
            defs: defs,
            uniforms: () => ({ params: { a: [1,0], b: [-1,0], c: [1,0], d: [1,0]} }) 
        }
    );
}
    