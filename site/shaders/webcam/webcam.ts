
import { PSpec, Definitions, loadWebcam } from "../../lib/poiesis/index.ts";

export const webcam = async (code: string,defs: Definitions, fx:any ) => {


    const webcam = await loadWebcam();

    return (): PSpec => ({ 
        code: code, 
        defs: defs,
        textures: [
            { name: "webcam", data: webcam.video }
        ] 
    });
}