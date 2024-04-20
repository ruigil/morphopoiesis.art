import { BufferListener, FPSListener, PSpec } from "../poiesis.interfaces.ts";
import { PContext } from "../poiesis.ts";

export * from "./geometry.ts";
export * from "./loaders.ts";

const gaussian = (x: number, y: number, sigma: number): number => {
    const pi = Math.PI;
    return Math.exp(-(x*x + y*y) / (2.0 * sigma * sigma)) / (2.0 * pi * sigma * sigma);
}

export const createGaussianKernel = (sigma: number): number[] => {
    let kernel: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let sum = 0;

    for(let i = 0; i < 9; i++) {
        let x = i % 3;
        let y = Math.floor(i / 3);
        kernel[y * 3 + x] = gaussian(x - 1, y - 1, sigma);
        sum += kernel[y * 3 + x];
    }

    // Normalize the kernel
    for(let i = 0; i < 9; i++) {
        let x = i % 3;
        let y = Math.floor(i / 3);
        kernel[ y * 3 + x ] /= sum;
    }

    return kernel;
}


export const scaleAspect = (w:number,h:number,scale:number) => {
    const cellSize = Math.min(w,h) / scale;
    return { x: Math.floor(w / cellSize + .5) , y: Math.floor(h / cellSize + .5) };
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
