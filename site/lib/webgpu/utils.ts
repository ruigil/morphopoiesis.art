import { WGPUContext } from './webgpu.ts';

// controls for the draw loop
export interface Controls {
    play?: boolean;
    reset?: boolean;
}

// listener for the fps
export interface FPSListener {
    onFPS: (fps: { fps: string, time: string}) => void;
}

export const square = (x: number) => {
    return [
        -x, -x, 
        x, -x,
        x,  x,
          
        -x, -x,
        x,  x,
        -x,  x,
    ]
}

export const triangle = (x: number) => {
    return [
        -x, -x, 
        x, -x,
        0,  x,
    ]
}

export const circle = (x: number, n: number) => {
    const vertices = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const a2 = ((i + 1) / n) * Math.PI * 2;
        vertices.push(0, 0, Math.cos(a) * x, Math.sin(a) * x, Math.cos(a2) * x, Math.sin(a2) * x);
    }
    return vertices;
}

export const cube = (x: number) => {
    return [
        -x, -x, -x, x, -x, -x, x,  x, -x, -x,  x, -x, // -z face
        -x, -x,  x, x, -x,  x, x,  x,  x, -x,  x,  x, // z face
        -x, -x, -x, -x,  x, -x, -x,  x,  x, -x, -x,  x, // -x face
        x, -x, -x, x,  x, -x, x,  x,  x, x, -x,  x, // x face
        -x, -x, -x, -x, -x,  x, x, -x,  x, x, -x, -x, // -y face
        -x,  x, -x, -x,  x,  x, x,  x,  x, x,  x, -x, // y face
    ];
}

export const loadWGSL = async (url: string) => {
    return await (await fetch(url)).text()
}

export const loadTexture = async (url: string) => {
    const response = await fetch(new URL(url, import.meta.url).toString());
    return await createImageBitmap(await response.blob());
}

export const loadWebcam = async () => {
    // Request permission to access the user's camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    const videoSettings = stream.getVideoTracks()[0].getSettings();
    const capabilities = stream.getVideoTracks()[0].getCapabilities();
    // Create a video element to capture the video stream
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    const metadataLoaded = new Promise<void>((resolve) => {
        video.addEventListener('loadedmetadata', () => {
            resolve();
        });
    });        
    // Wait for the metadata to be loaded
    await metadataLoaded;
    return { video: video, settings: videoSettings, capabilities: capabilities };
}

export const draw = (gpuContext: WGPUContext, unis?:any, controls?: Controls, fpsListener?: FPSListener, delta?: number) => {
    let frame = 0;
    let intid = 0;
    let elapsed = 0;
    let idle = 0;
    let canvas = gpuContext.getCanvas();
    let context = gpuContext;
    const timeStep = delta || 0;
    const crtl = controls || { play: true, reset: false };
    let start = performance.now();

    const mouse: Array<number> = [0,0];
    const resolution: Array<number> = [0,0];
    const aspectRatio: Array<number> = [1,1];

    const observer = new ResizeObserver((entries) => {
        canvas.width = entries[0].target.clientWidth * devicePixelRatio;
        canvas.height = entries[0].target.clientWidth * devicePixelRatio;
        //this.state.canvas.width = entries[0].devicePixelContentBoxSize[0].inlineSize;
        //this.state.canvas.height = entries[0].devicePixelContentBoxSize[0].blockSize;
        resolution[0] = entries[0].target.clientWidth;
        resolution[1] = entries[0].target.clientHeight;
        const factor = resolution[0] > resolution[1] ? resolution[0] : resolution[1];
        aspectRatio[0] = resolution[0] / factor;
        aspectRatio[1] = resolution[1] / factor;
    });

    observer.observe(canvas)
    canvas.addEventListener('mousemove', event => {
        mouse[0] = event.offsetX/canvas.clientWidth;
        mouse[1] = event.offsetY/canvas.clientHeight;
    });

    const fps = () => {
        fpsListener && fpsListener.onFPS({ fps: (frame / elapsed).toFixed(2), time: elapsed.toFixed(1)} );
    }

    const render = async () => {
        if (crtl.reset) {
            frame = 0;
            elapsed = 0;
            idle = 0;
            context = context.reset();
            start = performance.now();
        }

        if (crtl.play && !intid) {
            intid = setInterval(() => fps(), 1000);
        }

        if (!crtl.play && intid) {
            clearInterval(intid);
            intid = 0;
        }

        if ( crtl.play || crtl.reset ) {
    
            await context.frame(frame, { 
                sys: { 
                    frame: frame, 
                    time: elapsed, 
                    mouse: mouse, 
                    resolution: resolution,
                    aspect: aspectRatio 
                }, ...unis });

            elapsed = ((performance.now() - start) / 1000) - idle;

            if (crtl.reset) crtl.reset = false; 
            frame++;        
        } else {
            idle = ((performance.now()- start)/1000) - elapsed;
        }
        //console.log("timestep",timeStep )
        if (timeStep != 0) setTimeout(()=>requestAnimationFrame(render),timeStep);
        else requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}
