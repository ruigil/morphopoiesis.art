import { PSpec, loadWGSL, loadJSON } from "../../lib/poiesis/index.ts";

export const colorIFS = async (wgsl:string,json:string) => {
 
    const code = await loadWGSL(wgsl);
    const defs = await loadJSON(json);
 
    return (): PSpec => ({ code: code, defs: defs });
}