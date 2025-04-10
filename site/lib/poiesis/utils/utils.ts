import { BufferListener, FPSListener, PoiesisInstance, PSpec, SpecListener } from "../poiesis.interfaces.ts";
import { Poiesis } from "../poiesis.ts";
import { getErrorManager } from "../error/index.ts";

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
    
    return function(this: any, ...args: Parameters<T>): void {
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

/**
 * Creates a custom error display for shaders that is less intrusive
 * @param canvas The canvas element
 * @returns Functions to update the error display
 */
export const createShaderErrorDisplay = (canvas: HTMLCanvasElement) => {
    // Make sure the canvas container has position relative
    if (canvas.parentElement) {
        canvas.parentElement.style.position = 'relative';
    }
    
    // Create a small indicator in the corner of the canvas
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: none;
        background-color: green;
        opacity: 0.7;
        transition: background-color 0.3s, opacity 0.3s;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    `;
    
    // Add it to the canvas container
    canvas.parentElement?.appendChild(indicator);
    
    // Create a hidden error panel
    const errorPanel = document.createElement('div');
    errorPanel.style.cssText = `
        position: absolute;
        top: 40px;
        right: 10px;
        width: 300px;
        max-width: 80%;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        display: none;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
    `;
    canvas.parentElement?.appendChild(errorPanel);
    
    // Toggle error panel when indicator is clicked
    indicator.addEventListener('click', () => {
        if (errorCount != 0) errorPanel.style.display = errorPanel.style.display === 'none' ? 'block' : 'none';
    });
    
    // Keep track of errors
    let errorCount = 0;
    let warningCount = 0;
    
    // Return functions to update the display
    return {
        setStatus: (hasErrors: boolean, errorCount: number, warningCount: number) => {
            if (hasErrors) {
                indicator.style.backgroundColor = errorCount > 0 ? '#ff5555' : '#ffaa55';
                indicator.style.opacity = '0.9';
                indicator.title = `${errorCount} errors, ${warningCount} warnings`;
            } else {
                indicator.style.backgroundColor = 'green';
                indicator.style.opacity = '0.7';
                indicator.title = 'No errors';
            }
        },
        addError: (error: { type: string; message: string; fatal: boolean; suggestion?: string; details?: string }) => {
            // Create error element
            indicator.style.display = 'block';
            const errorElement = document.createElement('div');
            errorElement.style.cssText = `
                margin-bottom: 10px;
                padding: 8px;
                border-left: 4px solid ${error.fatal ? '#ff5555' : '#ffaa55'};
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            `;
            
            // Create error header
            const errorHeader = document.createElement('div');
            errorHeader.style.cssText = `
                font-weight: bold;
                color: ${error.fatal ? '#ff5555' : '#ffaa55'};
                margin-bottom: 5px;
            `;
            errorHeader.textContent = `[${error.type.toUpperCase()}] ${error.fatal ? 'ERROR' : 'WARNING'}`;
            
            // Create error message
            const errorMessage = document.createElement('div');
            errorMessage.textContent = error.message;
            
            // Add to error element
            errorElement.appendChild(errorHeader);
            errorElement.appendChild(errorMessage);
            
            // Add suggestion if available
            if (error.suggestion) {
                const suggestionElement = document.createElement('div');
                suggestionElement.style.cssText = `
                    margin-top: 5px;
                    font-style: italic;
                    color: #aaaaaa;
                    font-size: 11px;
                `;
                suggestionElement.textContent = `Suggestion: ${error.suggestion}`;
                errorElement.appendChild(suggestionElement);
            }
            
            // Add details if available
            if (error.details) {
                const toggleButton = document.createElement('button');
                toggleButton.style.cssText = `
                    background: none;
                    border: none;
                    color: #3498db;
                    cursor: pointer;
                    padding: 0;
                    font-size: 11px;
                    text-decoration: underline;
                    margin-top: 5px;
                    font-family: monospace;
                `;
                toggleButton.textContent = 'Show details';
                
                const detailsElement = document.createElement('pre');
                detailsElement.style.cssText = `
                    background-color: rgba(0, 0, 0, 0.3);
                    padding: 5px;
                    margin-top: 5px;
                    border-radius: 3px;
                    font-size: 11px;
                    white-space: pre-wrap;
                    display: none;
                    max-height: 150px;
                    overflow-y: auto;
                `;
                detailsElement.textContent = error.details;
                
                toggleButton.addEventListener('click', () => {
                    const isVisible = detailsElement.style.display === 'block';
                    detailsElement.style.display = isVisible ? 'none' : 'block';
                    toggleButton.textContent = isVisible ? 'Show details' : 'Hide details';
                });
                
                errorElement.appendChild(toggleButton);
                errorElement.appendChild(detailsElement);
            }
            
            // Add timestamp
            const timestamp = document.createElement('div');
            timestamp.style.cssText = `
                font-size: 10px;
                color: #999;
                margin-top: 5px;
                text-align: right;
            `;
            const now = new Date();
            timestamp.textContent = `${now.toLocaleTimeString()}`;
            errorElement.appendChild(timestamp);
            
            // Add to panel
            errorPanel.appendChild(errorElement);
            
            // Update counts
            if (error.fatal) {
                errorCount++;
            } else {
                warningCount++;
            }
            
            // Update indicator
            indicator.style.backgroundColor = errorCount > 0 ? '#ff5555' : (warningCount > 0 ? '#ffaa55' : 'green');
            indicator.style.opacity = (errorCount > 0 || warningCount > 0) ? '0.9' : '0.7';
            indicator.title = `${errorCount} errors, ${warningCount} warnings`;
            
            // Show the indicator
            indicator.style.display = 'block';
        },
        clear: () => {
            errorPanel.innerHTML = '';
            errorCount = 0;
            warningCount = 0;
            indicator.style.backgroundColor = 'green';
            indicator.style.opacity = '0.7';
            indicator.title = 'No errors';
        }
    };
};

export const animate = (spec: (w:number,h:number) => PSpec, canvas: HTMLCanvasElement, fpsListener?: FPSListener, bufferListeners?: BufferListener[], specListener?: SpecListener ) => {

    const mouse: Array<number> = [0,0,0,0];
    const mButtons: Array<number> = [0,0,0];
    const resolution: Array<number> = [0,0];
    const aspectRatio: Array<number> = [1,1];

    let shaderSpec:PSpec | null = null;
    let frame:number = 0;
    
    // Create custom error display
    const errorDisplay = createShaderErrorDisplay(canvas);

    // Get the error manager and configure it to use our custom display
    const errorManager = getErrorManager();
    errorManager.addErrorCallback((error) => {
        errorDisplay.addError({
            type: error.type,
            message: error.message,
            fatal: error.fatal,
            suggestion: error.suggestion,
            details: error.details
        });
    });
    
    const controller = () => {
        let isRunning = false;
        let animationFrameId: number = 0;
        let elapsed:number = 0;
        let idle:number = 0;
        let startTime:number = 0;
        let delta:number = 0;
        let intervalId:number = 0;
        let poiesis: PoiesisInstance;
        let delayTimeout: number = 0;

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
            }        
        }

        const togglePlayPause = () => {
            isRunning = !isRunning;

            if (intervalId != 0) {
                clearInterval(intervalId);
                intervalId = 0;
            } else {
                intervalId = setInterval(() => fps(),200);
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
                    }, ...(shaderSpec?.uniforms ? shaderSpec.uniforms(frame) : {}) },
                    frame);

                frame++;            
      
            } else {
                idle = ((performance.now()- startTime)/1000) - elapsed;
            }

            if (delta != 0) delayTimeout = setTimeout( () => animationFrameId = requestAnimationFrame(() => run()), delta);
            else animationFrameId = requestAnimationFrame(run);    
        }
        
        const reset = async () => {
            stop();
            
            // Clear previous errors when resetting
            errorDisplay.clear();

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
    canvas.addEventListener('touchmove', (event:TouchEvent) => updateMouse(event.touches[0].clientX, event.touches[0].clientY),{ passive: true });

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
        const factor = resolution[0] < resolution[1] ? resolution[0] : resolution[1];
        aspectRatio[0] = resolution[0] / factor;
        aspectRatio[1] = resolution[1] / factor;

        try {
            await control.reset();
        } catch (err) {
            // Use the error manager instead of directly manipulating DOM
            const errorManager = getErrorManager();
            errorManager.error(
                'initialization',
                'Failed to initialize shader after resize',
                {
                    fatal: false,
                    suggestion: 'Try refreshing the page if the shader doesn\'t appear',
                    details: err instanceof Error ? err.message : String(err),
                    originalError: err instanceof Error ? err : undefined
                }
            );
            
            // Fallback to the old error display if error manager is not configured
            const errorElement = document.querySelector("#error") as HTMLDivElement;
            if (errorElement) {
                errorElement.innerHTML = `<span>Sorry, but there was an error. <br/> <span style='color:red;'>${err}</span><span/>`;
            }
        }
    };

    // Apply debouncing to the resize handler to prevent multiple rapid context creations
    const debouncedCanvasResize = debounce(canvasResize, 250); // 250ms debounce time
    const observer = new ResizeObserver(debouncedCanvasResize);
    observer.observe(canvas);

    return control

}
