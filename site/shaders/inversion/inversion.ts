import { PSpec, Definitions } from "../../lib/poiesis/index.ts";


export const inversion = (code:string,defs:Definitions, $fx?:any) => {
 
    console.log("fx-hash",$fx.hash)
 
    return (): PSpec => ({ code: code, defs: defs });
}