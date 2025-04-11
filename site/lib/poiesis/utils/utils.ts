import { BufferListener, FPSListener, PoiesisInstance, PSpec, SpecListener } from "../poiesis.types.ts";
import { Poiesis } from "../poiesis.ts";
import { ErrorManager } from "../error/index.ts";
import { PoiesisError } from "../error/error.types.ts";

export * from "./geometry.ts";
export * from "./loaders.ts";

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the function
 */
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void => {
    let timeout: number | undefined;

    // we need 'this' because the function is called in the execution context, not the lexical one one.
    return function (this: T, ...args: Parameters<T>): void {
        const later = () => {
            timeout = undefined;
            func.apply(this, args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait) as unknown as number;
    };
}

const gaussian = (x: number, y: number, sigma: number): number => {
    const pi = Math.PI;
    return Math.exp(-(x * x + y * y) / (2.0 * sigma * sigma)) / (2.0 * pi * sigma * sigma);
}

export const createGaussianKernel = (sigma: number): number[] => {
    const kernel: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
        const x = i % 3;
        const y = Math.floor(i / 3);
        kernel[y * 3 + x] = gaussian(x - 1, y - 1, sigma);
        sum += kernel[y * 3 + x];
    }

    // Normalize the kernel
    for (let i = 0; i < 9; i++) {
        let x = i % 3;
        let y = Math.floor(i / 3);
        kernel[y * 3 + x] /= sum;
    }

    return kernel;
}


export const scaleAspect = (w: number, h: number, scale: number) => {
    const cellSize = Math.min(w, h) / scale;
    return { x: Math.floor(w / cellSize + .5), y: Math.floor(h / cellSize + .5) };
}

const displayError = (error: PoiesisError) => {

    const errorElement = document.getElementById('poiesis-error')!
    errorElement.className = `poiesis-error ${error.type}${error.fatal ? ' fatal' : ''}`;
    errorElement.style.display = 'block';
    errorElement.innerHTML = `
      <h3 class="poiesis-error-title">${error.type} Error</h3>
      <p class="poiesis-error-message">${error.message}</p>
      ${error.suggestion ? `<p class="poiesis-error-suggestion">Suggestion: ${error.suggestion}</p>` : ''}
      ${error.details ? `<pre class="poiesis-error-details">${error.details}</pre>` : ''}`
}

export const animate = (spec: (w: number, h: number) => PSpec, canvas: HTMLCanvasElement, unis = {}, fpsListener?: FPSListener, bufferListeners?: BufferListener[], specListener?: SpecListener) => {

    const mouse: Array<number> = [0, 0, 0, 0];
    const mButtons: Array<number> = [0, 0, 0];
    const resolution: Array<number> = [0, 0];
    const aspectRatio: Array<number> = [1, 1];

    let shaderSpec: PSpec | null = null;
    let frame: number = 0;

    ErrorManager.addErrorCallback( (error) => displayError(error) );

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
            fpsListener && fpsListener.onFPS({ fps: (frame / elapsed).toFixed(2), time: elapsed.toFixed(1), frame: frame });
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

                await poiesis.run({
                    // the variable in the shader MUST be 'sys'
                    sys: {
                        frame: frame,
                        time: elapsed,
                        mouse: mouse,
                        buttons: mButtons,
                        resolution: resolution,
                        aspect: aspectRatio
                    }, ...(shaderSpec?.uniforms ? shaderSpec.uniforms(frame) : {}), ...unis
                },
                    frame);

                frame++;

            } else {
                idle = ((performance.now() - startTime) / 1000) - elapsed;
            }

            if (delta != 0) delayTimeout = setTimeout(() => animationFrameId = requestAnimationFrame(() => run()), delta);
            else animationFrameId = requestAnimationFrame(run);
        }

        const reset = async () => {
            stop();

            // Clear previous errors when resetting
            //errorDisplay.clear();

            const context = await Poiesis(canvas);
            shaderSpec = spec(canvas.width, canvas.height);

            if (specListener) {
                specListener.onSpec(shaderSpec);
            }

            poiesis = context.build(shaderSpec);

            if (bufferListeners) {
                poiesis.addBufferListeners(bufferListeners);
            }

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

    const updateMouse = (x: number, y: number) => {
        mouse[2] = mouse[0]; // last position x
        mouse[3] = mouse[1]; // last position y
        const rect = canvas.getBoundingClientRect();
        mouse[0] = (x - rect.left) / rect.width;
        mouse[1] = (y - rect.top) / rect.height;
        shaderSpec?.mouse && shaderSpec.mouse(mouse[0], mouse[1]);
    }

    canvas.addEventListener('mousemove', (event: MouseEvent) => updateMouse(event.clientX, event.clientY));
    canvas.addEventListener('touchmove', (event: TouchEvent) => updateMouse(event.touches[0].clientX, event.touches[0].clientY), { passive: true });

    canvas.addEventListener('mousedown', (event) => { mButtons[event.button] = 1; });
    canvas.addEventListener('mouseup', (event) => { mButtons[event.button] = 0; });
    canvas.addEventListener('touchstart', () => { mButtons[0] = 1; }, { passive: true });
    canvas.addEventListener('touchend', () => { mButtons[0] = 0; }, { passive: true });

    const control = controller();

    // Debounce the canvas resize function to prevent rapid context creation/destruction
    const canvasResize = async (entries: ResizeObserverEntry[]) => {
        canvas.width = entries[0].target.clientWidth * devicePixelRatio;
        canvas.height = entries[0].target.clientHeight * devicePixelRatio;
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
