// Mandelbrot Fractal Shader
// A colorful visualization of the Mandelbrot set

// Constants
const MAX_ITERATIONS: i32 = 1000;
const ESCAPE_RADIUS: f32 = 2.0;
const PI: f32 = 3.141592653589793;

// Uniforms
struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    resolution: vec2<f32>
}

@group(0) @binding(0) var<uniform> sys: Sys;

// Vertex shader
@vertex
fn vertexMain(@location(0) pos: vec2<f32>) -> @builtin(position) vec4f {
    return vec4f(pos, 0., 1.);
}

// HSV to RGB conversion
fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
    let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

// Mandelbrot iteration function
fn mandelbrot(c: vec2<f32>) -> vec2<f32> {
    // Returns iterations and smooth coloring value
    var z = vec2<f32>(0.0);
    var iter: f32 = 0.0;
    
    for(var i = 0; i < MAX_ITERATIONS; i++) {
        // z = z^2 + c
        z = vec2<f32>(
            z.x * z.x - z.y * z.y,
            2.0 * z.x * z.y
        ) + c;
        
        if(dot(z, z) > ESCAPE_RADIUS * ESCAPE_RADIUS) {
            // Smooth coloring formula
            let smooth_val = f32(i) - log2(log2(dot(z, z))) + 4.0;
            return vec2<f32>(f32(i), smooth_val);
        }
        
        iter += 1.0;
    }
    
    return vec2<f32>(f32(MAX_ITERATIONS), 0.0);
}

// Fragment shader
@fragment
fn fragmentMain(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    // Normalized pixel coordinates
    let uv = (coord.xy / sys.resolution.xy) * 2.0 - 1.0;
    
    // Adjust aspect ratio
    let aspect = sys.resolution.x / sys.resolution.y;
    let pos = vec2<f32>(uv.x * aspect, uv.y);
    
    // Zoom and pan parameters
    let zoom = 2.5 * (1.0 + 0.5 * sin(sys.time * 0.05));
    let pan = vec2<f32>(-0.5, 0.0);
    
// Mouse interaction for panning
// Calculate mouse delta between current (xy) and previous (zw) positions
let mouse_delta = select(
    vec2<f32>(0.0),
    sys.mouse.xy - sys.mouse.zw,
    sys.mouse.z > 0.0 && sys.mouse.w > 0.0 // Check if both current and previous positions are valid
);

// Apply mouse delta to pan
let mouse_influence = mouse_delta * 2.0; // Adjust sensitivity as needed
    
    // Calculate complex position
    let c = pos / zoom + pan + sys.mouse.xy;;
    
    // Get mandelbrot iteration data
    let data = mandelbrot(c);
    let iter = data.x;
    let smooth_iter = data.y;
    
    // Coloring
    if(iter >= f32(MAX_ITERATIONS)) {
        // Inside the set - black
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    } else {
        // Outside the set - colorful gradient based on iterations
        let t = smooth_iter / 50.0;
        
        // Oscillating color based on time and iterations
        let hue = 0.5 + 0.5 * sin(t * 3.0 + sys.time * 0.3);
        let sat = 0.8;
        let val = 1.0;
        
        let color = hsv2rgb(vec3<f32>(hue, sat, val));
        
        return vec4<f32>(color, 1.0);
    }
}
