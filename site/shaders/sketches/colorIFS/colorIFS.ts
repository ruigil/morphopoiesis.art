import { PSpec, Definitions } from "../../../lib/poiesis/index.ts";

export const colorIFS = (code: string,defs: Definitions) => {
 
    return (): PSpec => ({ code: code, defs: defs });
}