// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

// The Chaos Game is a method of creating fractals using a polygon and an initial point.
// The algorithm works by randomly selecting a vertex of the polygon and moving the current point
// some fraction of the distance towards that vertex. Repeating this process many times
// creates a fractal pattern. For example, with 3 points (a triangle) and a distance of 0.5,
// the Sierpinski triangle emerges. https://www.youtube.com/watch?v=kbKtFN71Lfs&ab_channel=Numberphile

const TAU = 2. * acos(-1.);

struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    aspect: vec2<f32>,
    resolution: vec2<f32>
}

struct Uni {
    size: vec2<f32>,
    color: vec3<f32>    // Color for rendering the points
}

@group(0) @binding(0) var<uniform> uni: Uni;
@group(0) @binding(4) var<uniform> sys: Sys;
@group(0) @binding(1) var<storage> current: array<u32>; // Accumulator buffer
@group(0) @binding(2) var<storage, read_write> next: array<atomic<u32>>; // Next state of the accumulator buffer

struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32
}

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) value: f32  // Pass the accumulated value to the fragment shader
}

fn getIndex(cell: vec2<f32>) -> u32 { 
    let c = (cell + uni.size) % uni.size;
    return u32(c.y * uni.size.x + c.x);
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    let i = f32(input.instance); 
    let cell = vec2f(i % uni.size.x, floor(i / uni.size.x));
    
    // Get the accumulated value for this pixel
    let value = f32(current[input.instance]);
    // Calculate cell position on screen
    let cellSize = 2.0 / uni.size.xy;
    // The cell(0,0) is at the top left corner of the screen.
    // The cell(uni.size.x,uni.size.y) is at the bottom right corner of the screen.
    let cellOffset = vec2(cell.x, uni.size.y - 1.0 - cell.y) * cellSize + (cellSize * 0.5);
    // input.pos is in the range [-1,1]...[1,1] and it's the same coord system as the uv of the screen
    let cellPos = (input.pos / uni.size.xy) + cellOffset - 1.0;
    
    var output: VertexOutput;
    output.pos = vec4f(cellPos, 0.0, 1.0);
    output.value = value;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    // we dispatch 4096 workgroups with 64 threads each and 32 iterations per thread
    // so we divide that amount for the number of pixels to get a scaled propability of a pixel.
    let alpha = input.value / (f32(4096 * 64 * 32) / (uni.size.x * uni.size.y));
    // Apply color with gamma 
    let col = pow(uni.color, vec3(2.2)) * alpha;
    return vec4f(col, 1.0);
}

// Random number generation based on PCG
fn pcg2d(pv: vec2u) -> vec2u {
    var v = pv * 1664525u + 1013904223u;
    let s = vec2u(16u);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>s);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>s);

    return v;
}

fn random2( seed: vec2u) -> vec2f {
    return vec2f(pcg2d(seed)) / f32(0xffffffffu); // normalize to [0, 1]
}

// boxmuller transform https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
fn boxMuller(u1: f32, u2: f32) -> vec2f {
    let r = sqrt(-2.0 * log(u1));
    let theta = TAU * u2;
    return r * vec2f(cos(theta),sin(theta));
}

@compute @workgroup_size(8, 8)
fn computeClear(@builtin(global_invocation_id) cell: vec3u) {
    let idx = cell.y * u32(uni.size.x) + cell.x;
    atomicStore(&next[idx], 0u); // Reset the next buffer for this pixel
}

@compute @workgroup_size(64)
fn computeChaos(@builtin(global_invocation_id) id: vec3u) {
    
    // Each workgroup will compute multiple iterations of the chaos game
    let iterations = 32u; // Number of iterations per workgroup
    
    // Initialize random seed based on invocation id and frame
    let rnd = random2(vec2u(id.x, sys.frame));
        
    // the random values have an uniform distribution that generates square artifacts, 
    // so we sample from a gaussian distribution using the initial uniform random numbers 
    // and the Box-Muller transform
    var point = boxMuller(rnd.x,rnd.y);

    // The number of points is based on the mouse position
    let numPoints = 3. + floor(sys.mouse.x * 4.);
    // The step size is based on the mouse position
    let stepSize = .3 + sys.mouse.y * .5;

    // Run the chaos game algorithm
    for (var i = 0u; i < iterations; i++) {
        // Choose a random attractor point based on the iteration        
        let rnd = random2(vec2u(id.x, i)).x; // random between [0-1]
        // we choose the angle based on the random value and the maximum number of points
        let angle =  (TAU * .5) + TAU * floor(rnd * f32(numPoints)) / f32(numPoints);
        // the attractor is a point on the unit circle
        let attractor = vec2f(sin(angle), cos(angle)) * .9;

        // Step the point towards the attractor with stepsize
        point = mix(point, attractor, stepSize);

        // Compute the screen coordinate of the current point
        let screenCoord = vec2u( min(uni.size.y,uni.size.x) * point.xy + uni.size ) / 2u;
        
        // if the point is inside the screen add it to the accummulator
        if ( all(screenCoord > vec2u(0)) && all( screenCoord < vec2u(uni.size) ) ) {
            // compute the index into the accumulation buffer
            let idx = screenCoord.x + u32(uni.size.x) * screenCoord.y;
            // Increment the value in the next buffer
            atomicAdd(&next[idx], 1);
        }

    }
}
