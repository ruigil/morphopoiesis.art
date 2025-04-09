// This work is licensed under CC BY 4.0 
// https://creativecommons.org/licenses/by/4.0/

const TAU = 2. * acos(-1.);

struct Sys {
    time: f32,
    frame: u32,
    mouse: vec4<f32>,
    aspect: vec2<f32>,
    resolution: vec2<f32>
}

struct IFS {
    count: u32, // Number of the IFS
    color: vec3<f32>, // Color for rendering the points       
    transforms: array<Transform, 7>, // Array of IFS transformations
    domain: vec4<f32>, // Domain of the IFS
}

struct Transform {
    color: vec3<f32>, // Color for rendering the points       
    scale: vec2<f32>, // scale factor
    translation: vec2<f32>, // translation vector
    rotation: f32, // rotation angle in radians
    probability: f32// Probability of selecting this transformation
}

struct Debug {
    color: vec3<f32>,
    scale: vec2<f32>,
    translation: vec2<f32>,
    rotation: f32,    
    probability: f32
}

struct Uni {
    size: vec2<f32>,
    ifs: IFS,
    color: vec3<f32>    // Color for rendering the points
}

@group(0) @binding(0) var<uniform> uni: Uni;
@group(0) @binding(4) var<uniform> sys: Sys;
@group(0) @binding(1) var<storage> current: array<u32>; // Accumulator buffer
@group(0) @binding(2) var<storage, read_write> next: array<atomic<u32>>; // Next state of the accumulator buffer
@group(0) @binding(3) var<storage, read_write> debug: Debug; // Debug buffer

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
    let col = pow(uni.ifs.color, vec3(2.2)) * alpha;
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
// 2d rotation matrix, angle in radians
fn rot2(a: f32) -> mat2x2f { return mat2x2(cos(a),-sin(a),sin(a),cos(a)); }
@compute @workgroup_size(64)
fn computeChaos(@builtin(global_invocation_id) id: vec3u) {
    
    // Each workgroup will compute multiple iterations of the chaos game
    let iterations = 32u; // Number of iterations per workgroup
    
    // Initialize random seed based on invocation id and frame
    let rnd = random2(vec2u(id.x, sys.frame));
        
    // the random values have an uniform distribution that generates square artifacts, 
    // so we sample from a gaussian distribution using the initial uniform random numbers 
    // and the Box-Muller transform
    var point = vec2f(0.,0.);//boxMuller(rnd.x,rnd.y);

    // Run the chaos game algorithm
    for (var i = 0u; i < iterations; i++) {
        // Choose a random attractor point based on the iteration        
        let rnd = random2(vec2u(id.x + sys.frame, i)); // random between [0-1]

        var p = 0.;
        for (var j = 0u; j < uni.ifs.count; j++) {
            // Compute the cumulative probability for each IFS
            p += uni.ifs.transforms[j].probability;
            
            if (rnd.y <= p) {
                let scale = uni.ifs.transforms[j].scale;
                let translation = uni.ifs.transforms[j].translation;
                let rotation = radians(uni.ifs.transforms[j].rotation);
                // Apply the IFS transformation
                point = rot2(rotation) * mat2x2(scale.x, 0., 0., scale.y) * point;
                point += translation;
                break;
            }
        }

        
        /*
        if (rnd <= .01) {
            point = rot2(0.) * mat2x2(0.,0.,0.,.16) * point;
        } else
        if (rnd < .08) {
            point =  rot2(radians(-50.)) * point * vec2(.34) + vec2f(0., 1.6);
        } else
        if (rnd < .15) {
            point =  rot2(radians(50.)) * mat2x2(-0.30,0.,0.,0.36)  * point  + vec2f(0., 0.8);
        } else
        {
            point = rot2(radians(1. + 2. * sys.mouse.x)) * point * vec2(.85) + vec2f(0., 1.6) ;
        }
        */
        // we choose the angle based on the random value and the maximum number of points
        //let angle =  (TAU * .5) + TAU * floor(rnd * f32(numPoints)) / f32(numPoints);
        // the attractor is a point on the unit circle
        //let attractor = vec2f(sin(angle), cos(angle)) * .9;

        // Step the point towards the attractor with stepsize
        //point = mix(point, attractor, stepSize);

        // Compute the screen coordinate of the current point

        //let px = map(point.x, -2.182, 2.6558, 0., uni.size.x);

        let dox = vec2f(uni.ifs.domain.x, uni.ifs.domain.y);
        let doy = vec2f(uni.ifs.domain.z, uni.ifs.domain.w);

        let px = mix(0., uni.size.x, (point.x - dox.x) / (dox.y - dox.x));
        let py = mix(0., uni.size.y, (point.y - doy.x) / (doy.y - doy.x));

        
        let screenCoord = vec2u(u32(px),u32(py));
        //let screenCoord = vec2u( min(uni.size.y,uni.size.x) * vec2(px,py) + uni.size ) / 2u;
        
        // if the point is inside the screen add it to the accummulator
        if ( all(screenCoord > vec2u(0)) && all( screenCoord < vec2u(uni.size) ) ) {
            // compute the index into the accumulation buffer
            let idx = screenCoord.x + u32(uni.size.x) * screenCoord.y;
            // Increment the value in the next buffer
            atomicAdd(&next[idx], 1);
        }

    }
}

fn map(value: f32, start1: f32, stop1: f32, start2: f32, stop2: f32) -> f32 {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}
