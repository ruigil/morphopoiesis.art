import { BufferListener, Controls, FPSListener, PSpec } from "./poiesis.interfaces.ts";
import { PContext } from "./poiesis.ts";

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
export const loadJSON = async (url: string) => {
    return await (await fetch(url)).json();
}

export const scaleAspect = (w:number,h:number,scale:number) => {
    const cellSize = Math.min(w,h) / scale;
    return { x: Math.floor(w / cellSize + .5) , y: Math.floor(h / cellSize + .5) };
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

export const animate = (spec: (w:number,h:number) => PSpec, canvas: HTMLCanvasElement, unis?: Record<string,any>, fpsListener?: FPSListener, bufferListener?: BufferListener ) => {
    let frame = 0;
    let intid = 0;
    let elapsed = 0;
    let idle = 0;
    let start = performance.now();
    let context:PContext | null = null;
    let s: PSpec | null = null;
    let requestId = 0;

    const crtl = { play: false, delta: 0 };

    const mouse: Array<number> = [0,0,0,0];
    const resolution: Array<number> = [0,0];
    const aspectRatio: Array<number> = [1,1];

    const updateMouse = (x:number,y:number) => {
        mouse[2] = mouse[0]; // last position x
        mouse[3] = mouse[1]; // last position y
        let rect = canvas.getBoundingClientRect();
        mouse[0] = (x - rect.left) / rect.width;
        mouse[1] = (y - rect.top) / rect.height;
    }
    
    canvas.addEventListener('mousemove', (event:MouseEvent) => updateMouse(event.clientX, event.clientY));
    canvas.addEventListener('touchmove', (event:TouchEvent) => updateMouse(event.touches[0].clientX, event.touches[0].clientY));

    const fps = () => {
        fpsListener && fpsListener.onFPS({ fps: (frame / elapsed).toFixed(2), time: elapsed.toFixed(1), frame: frame } );
    }

    const reset = async () => {
        frame = 0;
        elapsed = 0;
        idle = 0;
        if (context == null) context = await PContext.init(canvas);
        cancelAnimationFrame(requestId);
        s = spec(canvas.width, canvas.height);
        context = context.build( s )
        if (bufferListener) {
            context = context.addBufferListener(bufferListener);
        }
        requestId = requestAnimationFrame(render)
        start = performance.now();
    }

    const canvasResize = async (entries: ResizeObserverEntry[]) => {
        canvas.width = entries[0].target.clientWidth * devicePixelRatio;
        canvas.height = entries[0].target.clientHeight * devicePixelRatio;
        resolution[0] = canvas.width;
        resolution[1] = canvas.height; 
        const factor = resolution[0] < resolution[1] ? resolution[0] : resolution[1];
        aspectRatio[0] = resolution[0] / factor;
        aspectRatio[1] = resolution[1] / factor;

        try {
            await reset();
        } catch (err) {
            console.log(err);
            const error = document.querySelector("#error") as HTMLDivElement;
            error.innerHTML = `<span>Sorry, but there was an error with your WebGPU context. <br/> WebGPU is a new standard for graphics on the web.<br/>The standard is currently implemented only <a href='https://caniuse.com/webgpu'>on certain browsers</a>.<br/> For the full experience please use a supported browser. <br/><span style='color:red;'>${err}</span><span/>`;
        }
    }

    const observer = new ResizeObserver( canvasResize );
    observer.observe(canvas);


    const render = async () => {

        if (crtl.play && !intid) {
            intid = setInterval(() => fps(), 200);
        }

        if (!crtl.play && intid) {
            clearInterval(intid);
            intid = 0;
        }

        if ( crtl.play  ) {
            elapsed = ((performance.now() - start) / 1000) - idle;
    
            await context!.frame(frame, { 
                sys: { 
                    frame: frame, 
                    time: elapsed, 
                    mouse: mouse, 
                    resolution: resolution,
                    aspect: aspectRatio 
                }, ...(s!.uniforms ? s!.uniforms(frame) : {}), ...unis });

            // frame starts at 0, because binding groups start at 0
            frame++;

        } else {
            idle = ((performance.now()- start)/1000) - elapsed;
        }

        if (crtl.delta != 0) setTimeout(()=> requestId = requestAnimationFrame(render), crtl.delta);
        else requestId = requestAnimationFrame(render);
    }

    return {
        start: () => { crtl.play = true; },
        togglePlayPause: () => { crtl.play = !crtl.play; },
        stop: () => { cancelAnimationFrame(requestId);  },
        reset: () => { reset() },
        delay: (delta: number) => { crtl.delta = delta; },
    }
}
