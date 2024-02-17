import { PSpec, Definitions } from "../libs/poiesis/index.ts";


export const colorIFS = async (code: string,defs: Definitions, fx:any ) => {
 
    console.log("fx",fx)
 
    return (): PSpec => ({ code: code, defs: defs });
}