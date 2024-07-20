import { PSpec, Definitions } from "../../lib/poiesis/index.ts";

export const video360 = async (code:string, defs:Definitions) => {

    // Create a video element to capture the video stream
    const video = document.createElement('video');
    video.src = "/assets/video/redsea.mp4";
    video.loop = true;
    video.muted = true;

    await video.play();

    video.pause();

    document.addEventListener('click', () => {
        video.muted = false;
        video.paused ? video.play() : video.pause();
    });
        
    const spec =  (w:number, h: number):PSpec => {
        return {
            code: code,
            defs: defs,
            uniforms: () => ({ params: { fov: 90 } }),
            textures: [
                { name: "video360", data: video }
            ]
        }
    }

    return spec;

}