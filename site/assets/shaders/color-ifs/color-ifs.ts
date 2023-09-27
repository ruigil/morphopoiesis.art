import { PSpec } from "../../../lib/poiesis/poiesis.interfaces.ts";
import { loadWGSL } from "../../../lib/poiesis/utils.ts";

export const colorIFS = async () => {
 
    const code = await loadWGSL(`/assets/shaders/color-ifs/color-ifs.wgsl`);
 
    return (): PSpec => ({ code: code });
}