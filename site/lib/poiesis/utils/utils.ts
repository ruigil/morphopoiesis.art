import { BufferListener, FPSListener, PoiesisInstance, PSpec } from "../poiesis.interfaces.ts";
import { Poiesis } from "../poiesis.ts";

export * from "./geometry.ts";
export * from "./loaders.ts";

const gaussian = (x: number, y: number, sigma: number): number => {
    const pi = Math.PI;
    return Math.exp(-(x*x + y*y) / (2.0 * sigma * sigma)) / (2.0 * pi * sigma * sigma);
}

export const createGaussianKernel = (sigma: number): number[] => {
    const kernel: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let sum = 0;

    for(let i = 0; i < 9; i++) {
        const x = i % 3;
        const y = Math.floor(i / 3);
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

    const mouse: Array<number> = [0,0,0,0];
    const mButtons: Array<number> = [0,0,0];
    const resolution: Array<number> = [0,0];
    const aspectRatio: Array<number> = [1,1];

    let shaderSpec:PSpec | null = null;
    let frame:number = 0;

    const controller = () => {
        let isRunning = false;
        let animationFrameId: number | null = null;
        let elapsed:number = 0;
        let idle:number = 0;
        let startTime:number = 0;
        let delta:number = 0;
        let intervalId:number | null = null;
        let poiesis: PoiesisInstance;

        const fps = () => {
            fpsListener && fpsListener.onFPS({ fps: (frame / elapsed).toFixed(2), time: elapsed.toFixed(1), frame: frame } );
        }
    
        const start = () => {
            if (!isRunning && poiesis) {
                isRunning = true;
                frame = 0;
                elapsed = 0;
                idle = 0;
                startTime = performance.now();
                intervalId = setInterval(() => fps(),200);
                run();
            }        
        }

        const togglePlayPause = () => {
            isRunning = !isRunning;

            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            } else {
                intervalId = setInterval(() => fps(),200);
            }
        }

        const stop = () => {
            isRunning = false;
            if (intervalId != null) {
                clearInterval(intervalId);
                intervalId = null;
            }
            if (animationFrameId !== null) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
            }      
        }

        const run = async (): Promise<void> => {
            if (isRunning) {
                elapsed = ((performance.now() - startTime) / 1000) - idle;

                try {
                    await poiesis.frame(frame, { 
                      sys: { 
                          frame: frame, 
                          time: elapsed, 
                          mouse: mouse,
                          buttons: mButtons,
                          resolution: resolution,
                          aspect: aspectRatio 
                      }, ...(shaderSpec?.uniforms ? shaderSpec.uniforms(frame) : {}), ...unis });
                } catch (error) {
                    console.error('Error in animation frame:', error);
                }
                frame++;            
      
            } else {
                idle = ((performance.now()- startTime)/1000) - elapsed;
            }

            if (delta != 0) setTimeout( () => animationFrameId = requestAnimationFrame(() => run()), delta);
            else animationFrameId = requestAnimationFrame(() => run());    
    
        }
        
        const reset = async () => {
            stop();
            const context = await Poiesis(canvas)
            shaderSpec = spec(canvas.width, canvas.height)
            poiesis = context.build( shaderSpec )
            if (bufferListener) {
                poiesis.addBufferListener(bufferListener);
            }
            start();
        }
    
        return {
            start,
            stop,
            reset,
            togglePlayPause,
            delay: (d:number) => delta = d
        }
    }

    const updateMouse = (x:number,y:number) => {
        mouse[2] = mouse[0]; // last position x
        mouse[3] = mouse[1]; // last position y
        const rect = canvas.getBoundingClientRect();
        mouse[0] = (x - rect.left) / rect.width;
        mouse[1] = (y - rect.top) / rect.height;
        shaderSpec?.mouse && shaderSpec.mouse(mouse[0], mouse[1], frame); 
    }
    
    canvas.addEventListener('mousemove', (event:MouseEvent) => updateMouse(event.clientX, event.clientY));
    canvas.addEventListener('touchmove', (event:TouchEvent) => updateMouse(event.touches[0].clientX, event.touches[0].clientY));

    canvas.addEventListener('mousedown', (event) => { mButtons[event.button] = 1; });
    canvas.addEventListener('mouseup', (event) => { mButtons[event.button] = 0; });

    const control = controller();

    const canvasResize = async (entries: ResizeObserverEntry[]) => {
        canvas.width = entries[0].target.clientWidth * devicePixelRatio;
        canvas.height = entries[0].target.clientHeight * devicePixelRatio;
        resolution[0] = canvas.width;
        resolution[1] = canvas.height; 
        const factor = resolution[0] < resolution[1] ? resolution[0] : resolution[1];
        aspectRatio[0] = resolution[0] / factor;
        aspectRatio[1] = resolution[1] / factor;

        try {
            await control.reset();
        } catch (err) {
            console.log(err);
            const error = document.querySelector("#error") as HTMLDivElement;
            error.innerHTML = `<span>Sorry, but there was an error. <br/> <span style='color:red;'>${err}</span><span/>`;
        }
    }

    const observer = new ResizeObserver( canvasResize );
    observer.observe(canvas);

    return control

}
