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

export const cornell = () => {
    const vertices = [
        // floor, ceiling, back wall
        [-0.274799, -0.273000, 0.279600],
        [0.278000, -0.273000, 0.279600],
        [0.278000, -0.273000, -0.279600],
        [-0.271599, -0.273000, -0.279600],
        [-0.277999, 0.275800, 0.279600],
        [-0.277999, 0.275800, -0.279600],
        [0.278000, 0.275800, -0.279600],
        [0.278000, 0.275800, 0.279600],
        // tall block
        [0.013239, -0.272900, -0.017047],
        [0.013239, 0.057100, -0.017047],
        [-0.144353, -0.272900, 0.031839],
        [-0.144353, 0.057100, 0.031839],
        [-0.035647, -0.272900, -0.174639],
        [-0.035647, 0.057100, -0.174639],
        [-0.193239, -0.272900, -0.125753],
        [-0.193239, 0.057100, -0.125753],
        // short block
        [0.195646, -0.272900, 0.055136],
        [0.195646, -0.107900, 0.055136],
        [0.148464, -0.272900, 0.213246],
        [0.148464, -0.107900, 0.213246],
        [0.037536, -0.272900, 0.007954],
        [0.037536, -0.107900, 0.007954],
        [-0.009646, -0.272900, 0.166064],
        [-0.009646, -0.107900, 0.166064],
        // light
        [-0.065000, 0.275700, 0.052600],
        [0.065000, 0.275700, 0.052600],
        [-0.065000, 0.275700, -0.052400],
        [0.065000, 0.275700, -0.052400],
        // left wall
        [-0.274799, -0.273000, 0.279600],
        [-0.271599, -0.273000, -0.279600],
        [-0.277999, 0.275800, 0.279600],
        [-0.277999, 0.275800, -0.279600],
        // right wall
        [0.278000, -0.273000, 0.279600],
        [0.278000, -0.273000, -0.279600],
        [0.278000, 0.275800, -0.279600],
        [0.278000, 0.275800, 0.279600],
    ]



    const indices = [
        // floor, ceiling, back wall
        [0, 1, 2],
        [0, 2, 3],
        [4, 5, 6],
        [4, 6, 7],
        [6, 3, 2],
        [6, 5, 3],
        // tall block
        [9, 10, 8],
        [11, 14, 10],
        [15, 12, 14],
        [13, 8, 12],
        [14, 8, 10],
        [11, 13, 15],
        [9, 11, 10],
        [11, 15, 14],
        [15, 13, 12],
        [13, 9, 8],
        [14, 12, 8],
        [11, 9, 13],
        // short block
        [17, 18, 16],
        [19, 22, 18],
        [23, 20, 22],
        [21, 16, 20],
        [22, 16, 18],
        [19, 21, 23],
        [17, 19, 18],
        [19, 23, 22],
        [23, 21, 20],
        [21, 17, 16],
        [22, 20, 16],
        [19, 17, 21],
        // light
        [26, 25, 24],
        [26, 27, 25],
        // left wall
        [31, 28, 29],
        [31, 30, 28],
        // right wall
        [35, 33, 32],
        [35, 34, 33]
    ]

    const meshes = [
        { vi: 0, fi: 0, nv: 8, nf: 6 }, // floor, ceiling, back wall
        { vi: 8, fi: 6, nv: 8, nf: 12 }, // tall block
        { vi: 16, fi: 18, nv: 8, nf: 12 }, // short block
        { vi: 24, fi: 30, nv: 4, nf: 2 }, // light
        { vi: 28, fi: 32, nv: 4, nf: 2 }, // left wall
        { vi: 32, fi: 34, nv: 4, nf: 2 } // right wall
    ]

    const materials = [
        { color: [0.73, 0.73, 0.73, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 }, // floor, ceiling, back wall
        { color: [0.73, 0.73, 0.73, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 1, roughness: 0 }, // tall block
        { color: [0.73, 0.73, 0.73, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 }, // short block
        { color: [0.73, 0.73, 0.73, 1.0], emission:[15.0, 15.0, 15.0, 1.0], metallic: 0, roughness: 0 }, // light
        { color: [0.65, 0.05, 0.05, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 }, // left wall
        { color: [0.12, 0.45, 0.15, 1.0], emission:[0.0, 0.0, 0.0, 0.0], metallic: 0, roughness: 0 } // right wall
    ]

    return { vertices, indices, meshes, materials }
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
    let elapsed = 0;
    let idle = 0;
    let start = performance.now();
    let context:PContext | null = null;
    let s: PSpec | null = null;
    const rids = { intid: 0, requestId: 0 };
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
        if (s && s.mouse) s.mouse(mouse[0], mouse[1], frame); 
    }
    
    canvas.addEventListener('mousemove', (event:MouseEvent) => updateMouse(event.clientX, event.clientY));
    canvas.addEventListener('touchmove', (event:TouchEvent) => updateMouse(event.touches[0].clientX, event.touches[0].clientY));

    const fps = () => {
        fpsListener && fpsListener.onFPS({ fps: (frame / elapsed).toFixed(2), time: elapsed.toFixed(1), frame: frame } );
    }

    const reset = async () => {
        if (context == null) context = await PContext.init(canvas);
        frame = 0;
        elapsed = 0;
        idle = 0;
        cancelAnimationFrame(rids.requestId);
        s = spec(canvas.width, canvas.height);
        context = context.build( s )
        if (bufferListener) {
            context = context.addBufferListener(bufferListener);
        }
        // we should only request another render, when the last one is finished, how ?
        rids.requestId = requestAnimationFrame(render)
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

        if (crtl.play && !rids.intid) {
            rids.intid = setInterval(() => fps(), 200);
        }

        if (!crtl.play && rids.intid) {
            clearInterval(rids.intid);
            rids.intid = 0;
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

        } else 
            idle = ((performance.now()- start)/1000) - elapsed;
        

        if (crtl.delta != 0) 
            setTimeout( ()=> rids.requestId = requestAnimationFrame(render), crtl.delta);
        else 
            rids.requestId = requestAnimationFrame(render);
    }

    return {
        start: () => { crtl.play = true; },
        togglePlayPause: () => { crtl.play = !crtl.play; },
        stop: () => { cancelAnimationFrame(rids.requestId);  },
        reset: () => { reset() },
        delay: (delta: number) => { crtl.delta = delta; },
    }
}
