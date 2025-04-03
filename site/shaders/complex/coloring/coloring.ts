
import { PSpec, Definitions } from "../../../lib/poiesis/index.ts";

export const coloring = async (code: string,defs: Definitions, fx:any ) => {

    return (): PSpec => ({ code: code, defs: defs });
}
    