import { BufferListener, FPSListener, PoiesisGPU, PoiesisInstance, PSpec, BuildListener } from "../poiesis.types.ts";
import { PoiesisError } from "../error/error.types.ts";
import { ErrorManager } from "../index.ts";


const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void => {
    let timeout: number | undefined;

    // we need 'this' because the function is called in the execution context, not the lexical one.
    return function (this: T, ...args: Parameters<T>): void {
        const later = () => {
            timeout = undefined;
            func.apply(this, args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait) as unknown as number;
    };
}



export const drawLoop = (gpu: PoiesisGPU, spec: (w: number, h: number) => PSpec, canvas: HTMLCanvasElement, unis = {}, fpsListener?: FPSListener, buildListener?: BuildListener) => {

    const mouse: Array<number> = [0, 0, 0, 0];
    const mButtons: Array<number> = [0, 0, 0];
    const resolution: Array<number> = [0, 0];
    const aspectRatio: Array<number> = [1, 1];

    let shaderSpec: PSpec | null = null;
    let frame: number = 0;

    const controller = () => {
        let isRunning = false;
        let animationFrameId: number = 0;
        let elapsed: number = 0;
        let idle: number = 0;
        let startTime: number = 0;
        let delta: number = 0;
        let intervalId: number = 0;
        let poiesis: PoiesisInstance;
        let delayTimeout: number = 0;

        const fps = () => {
            fpsListener && fpsListener.onFPS({ fps: (frame / elapsed), time: elapsed, frame: frame });
        }

        const start = () => {
            if (!isRunning && poiesis) {
                isRunning = true;
                frame = 0;
                elapsed = 0;
                idle = 0;
                startTime = performance.now();
                intervalId = setInterval(() => fps(), 200);
            }
        }

        const togglePlayPause = () => {
            isRunning = !isRunning;

            if (intervalId != 0) {
                clearInterval(intervalId);
                intervalId = 0;
            } else {
                intervalId = setInterval(() => fps(), 200);
            }
        }

        const stop = () => {
            isRunning = false;
            if (intervalId != 0) {
                clearInterval(intervalId);
                intervalId = 0;
            }
            if (animationFrameId !== 0) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = 0;
            }
            clearTimeout(delayTimeout);
        }

        const run = async (): Promise<void> => {
            if (isRunning) {
                elapsed = ((performance.now() - startTime) / 1000) - idle;

                const uniforms = {... (shaderSpec?.uniforms ? shaderSpec.uniforms(frame) : {}), ...unis } 

                await poiesis.run({
                    // the variable in the shader MUST be 'sys' for the system uniforms...
                    sys: {
                        frame: frame,
                        time: elapsed,
                        mouse: mouse,
                        buttons: mButtons,
                        resolution: resolution,
                        aspect: aspectRatio
                    }, ...uniforms
                }, frame++ );

            } else {
                idle = ((performance.now() - startTime) / 1000) - elapsed;
            }

            if (delta != 0) delayTimeout = setTimeout(() => animationFrameId = requestAnimationFrame(run), delta);
            else animationFrameId = requestAnimationFrame(run);
        }

        const reset = async () => {
            stop();
            if (poiesis) await poiesis.destroy();

            shaderSpec = spec(canvas.width, canvas.height);            
            poiesis = gpu.build(shaderSpec, canvas);

            buildListener && buildListener.onBuild(shaderSpec,poiesis);

            start();
            if (animationFrameId == 0) run();
        }

        return {
            start,
            stop,
            reset,
            togglePlayPause,
            delay: (d: number) => delta = d
        }
    }

    const updateMouse = (e:Event, x: number, y: number) => {
        e.preventDefault();
        mouse[2] = mouse[0]; // last position x
        mouse[3] = mouse[1]; // last position y
        const rect = canvas.getBoundingClientRect();
        mouse[0] = (x - rect.left) / rect.width;
        mouse[1] = (y - rect.top) / rect.height;
        shaderSpec?.mouse && shaderSpec.mouse(mouse[0], mouse[1]);
    }

    canvas.addEventListener('mousemove', (event: MouseEvent) => updateMouse(event,event.clientX, event.clientY));
    canvas.addEventListener('touchmove', (event: TouchEvent) => updateMouse(event,event.touches[0].clientX, event.touches[0].clientY));

    canvas.addEventListener('mousedown', (event) => { mButtons[event.button] = 1; });
    canvas.addEventListener('mouseup', (event) => { mButtons[event.button] = 0; });
    canvas.addEventListener('touchstart', () => { mButtons[0] = 1; });
    canvas.addEventListener('touchend', () => { mButtons[0] = 0; });

    const control = controller();

    const canvasResize = async (entries: ResizeObserverEntry[]) => {
        //canvas.width = entries[0].contentBoxSize[0].inlineSize;
        //canvas.height = entries[0].contentBoxSize[0].blockSize;
        canvas.width = entries[0].devicePixelContentBoxSize[0].inlineSize;
        canvas.height = entries[0].devicePixelContentBoxSize[0].blockSize;
        resolution[0] = canvas.width;
        resolution[1] = canvas.height;
        const factor = Math.min(resolution[0], resolution[1]);
        aspectRatio[0] = resolution[0] / factor;
        aspectRatio[1] = resolution[1] / factor;

        await control.reset();
    };

    // Apply debouncing to the resize handler to prevent multiple rapid context creations
    const debouncedCanvasResize = debounce(canvasResize, 250); // 250ms debounce time
    const observer = new ResizeObserver(debouncedCanvasResize);
    observer.observe(canvas);

    return control
}
